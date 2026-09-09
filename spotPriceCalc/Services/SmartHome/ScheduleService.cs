using spotPriceCalc.Domain;
using spotPriceCalc.Dtos;
using spotPriceCalc.Dtos.Schedule;
using spotPriceCalc.Infrastructure.Persistence;

namespace spotPriceCalc.Services.SmartHome;

// Price-ranking scheduler, cheapest hours under the given constraints. UTC in, UTC out.
public class ScheduleService : IScheduleService
{
    private readonly ISpotPriceService _prices;
    private readonly TimeProvider _clock;
    private readonly ILogger<ScheduleService> _logger;

    // No IZoneLocatorService: every request names its zone by code. Coordinates are resolved once at
    // setup time via GET /api/zones/resolve, which is where the locator now lives.
    public ScheduleService(ISpotPriceService prices, TimeProvider clock, ILogger<ScheduleService> logger)
    {
        _prices = prices;
        _clock = clock;
        _logger = logger;
    }
    
    private record Slot(DateTime Start, DateTime End, decimal Price)
    {
        public TimeSpan Length => End - Start;
        public decimal Cost => Price * (decimal)Length.TotalHours;
    }

    #region Schedule building

    public async Task<ScheduleResponse> BuildAsync(ScheduleRequest request, CancellationToken ct)
    {
        if (!BiddingZoneSeedData.ByCode.TryGetValue(request.ZoneCode, out var zone))
            throw new ArgumentException($"Unknown bidding zone code {request.ZoneCode}.", nameof(request));

        var deadline = request.ResolveDeadlineUtc(_clock.GetUtcNow().UtcDateTime);
        var slots = await LoadSlotsAsync(zone.Id, deadline, ct);
        var chosen = Evaluate(request, slots, deadline);

        return new ScheduleResponse
        {
            DeviceId = request.DeviceId,
            ZoneName = zone.Name,
            Scheduled = chosen.Count > 0,
            Blocks = MergeIntoBlocks(chosen),
        };
    }

    // The stored curve as UTC slots, padded a day each side so the 24h look-back is covered.
    private async Task<List<Slot>> LoadSlotsAsync(int zoneId, DateTime deadlineUtc, CancellationToken ct)
    {
        var day = MarketDay.ContainingDay(deadlineUtc);
        var priced = await _prices.GetPricesAsync(zoneId, day.AddDays(-1), day.AddDays(1), ct);

        return priced.Points
            .Select(p => new Slot(
                DateTime.SpecifyKind(p.From, DateTimeKind.Utc),
                DateTime.SpecifyKind(p.To, DateTimeKind.Utc),
                p.Price))
            .OrderBy(s => s.Start)
            .ToList();
    }

    private static List<Slot> Evaluate(ScheduleRequest request, List<Slot> slots, DateTime deadlineUtc)
    {
        var windowStart = deadlineUtc.AddHours(-24);

        var eligible = slots
            .Where(s => s.Start >= windowStart && s.End <= deadlineUtc)
            .Where(s => !IsExcluded(s, request.Unavailable))
            .OrderBy(s => s.Start)
            .ToList();

        var needed = TimeSpan.FromHours(request.DurationHours);
        return request.ContinuousBlock
            ? SelectContiguous(eligible, needed)
            : SelectCheapest(eligible, needed);
    }

    #endregion

    #region Slot selection

    private static List<Slot> SelectCheapest(List<Slot> eligible, TimeSpan needed)
    {
        var chosen = new List<Slot>();
        var covered = TimeSpan.Zero;
        foreach (var s in eligible.OrderBy(s => s.Price).ThenBy(s => s.Start))
        {
            if (covered >= needed) break;
            chosen.Add(s);
            covered += s.Length;
        }
        
        if (covered < needed)
            return new List<Slot>();

        return chosen.OrderBy(s => s.Start).ToList();
    }

    // Cheapest back-to-back run covering the job
    private static List<Slot> SelectContiguous(List<Slot> eligible, TimeSpan needed)
    {
        var byTime = eligible.OrderBy(s => s.Start).ToList();

        List<Slot>? best = null;
        decimal bestCost = decimal.MaxValue;

        for (var i = 0; i < byTime.Count; i++)
        {
            var covered = TimeSpan.Zero;
            var cost = 0m;

            for (var j = i; j < byTime.Count; j++)
            {
                if (j > i && byTime[j].Start != byTime[j - 1].End) break; // gap

                covered += byTime[j].Length;
                cost += byTime[j].Cost;
                if (covered < needed) continue;

                if (cost < bestCost)
                {
                    bestCost = cost;
                    best = byTime.GetRange(i, j - i + 1);
                }
                break;
            }
        }

        return best ?? new List<Slot>();
    }

    // Is the slot inside the "do not run" window? from > to wraps past midnight.
    private static bool IsExcluded(Slot s, UnavailableWindow? window)
    {
        if (window is null) return false;
        var t = TimeOnly.FromDateTime(s.Start);
        return window.From <= window.To
            ? t >= window.From && t < window.To
            : t >= window.From || t < window.To;
    }

    // Collapse contiguous chosen slots into single blocks.
    private static List<ScheduledBlock> MergeIntoBlocks(List<Slot> chosen)
    {
        var ordered = chosen.OrderBy(s => s.Start).ToList();
        var blocks = new List<ScheduledBlock>();

        var i = 0;
        while (i < ordered.Count)
        {
            var start = ordered[i].Start;
            var end = ordered[i].End;
            var cost = ordered[i].Cost;
            var length = ordered[i].Length;

            var j = i + 1;
            while (j < ordered.Count && ordered[j].Start == end)
            {
                end = ordered[j].End;
                cost += ordered[j].Cost;
                length += ordered[j].Length;
                j++;
            }

            blocks.Add(new ScheduledBlock
            {
                StartUtc = start,
                EndUtc = end,
                EurPerMwh = length > TimeSpan.Zero
                    ? decimal.Round(cost / (decimal)length.TotalHours, 4)
                    : ordered[i].Price,
            });
            i = j;
        }

        return blocks;
    }

    #endregion

    #region Price colour

    // Null = no colour applies (day missing or not yet classified); the caller turns the indicator off.
    public async Task<PriceColor?> ResolveStatus(StatusSchedule request, CancellationToken ct)
    {
        if (!BiddingZoneSeedData.ByCode.TryGetValue(request.ZoneCode, out var zone))
            throw new ArgumentException($"Unknown bidding zone code {request.ZoneCode}.", nameof(request));

        var biddingZoneId = zone.Id;

        // Client timestamps are UTC by contract (see SmartHomeIntegrationController).
        var at = DateTime.SpecifyKind(request.StatusTime, DateTimeKind.Utc);
        var prices = await _prices.GetPricesAsync(biddingZoneId, at, ct);

        // Quantile is stamped at populate time, so this is a lookup. Half-open [From, To) as everywhere else.
        var slot = prices.Points.FirstOrDefault(p => at >= p.From && at < p.To);

        if (slot?.Quantile is not { } quantile)
        {
            // Better dark than a guessed colour.
            _logger.LogWarning("No classified slot for zone {ZoneId} at {At:o}: no colour", biddingZoneId, at);
            return null;
        }

        return ToColor(quantile);
    }

    // The curve for the instant's day and the next. Null when the zone has nothing stored.
    public async Task<IReadOnlyList<PriceCurvePoint>?> ResolvePriceCurveAsync(
        int biddingZoneId, DateTime atUtc, CancellationToken ct)
    {
        if (!BiddingZoneSeedData.ById.TryGetValue(biddingZoneId, out _))
            throw new ArgumentException($"Unknown bidding zone id {biddingZoneId}.", nameof(biddingZoneId));

        var at = DateTime.SpecifyKind(atUtc, DateTimeKind.Utc);
        var day = MarketDay.ContainingDay(at);

        // Today and tomorrow. Tomorrow is simply absent until the day-ahead prices publish.
        var prices = await _prices.GetPricesAsync(biddingZoneId, day, day.AddDays(1), ct);

        var curve = prices.Points
            .OrderBy(p => p.From)
            .Select(p => new PriceCurvePoint
            {
                StartUtc = DateTime.SpecifyKind(p.From, DateTimeKind.Utc),
                EndUtc = DateTime.SpecifyKind(p.To, DateTimeKind.Utc),
                EurPerMwh = p.Price,
                Level = ToColor(p.Quantile),
            })
            .ToList();

        if (curve.Count == 0)
        {
            _logger.LogWarning("No stored prices for zone {ZoneId} on {Day}: no curve", biddingZoneId, day);
            return null;
        }

        return curve;
    }

    // Null quantile stays null: better no colour than a guessed one.
    private static PriceColor? ToColor(PriceQuantile? quantile) => quantile switch
    {
        PriceQuantile.Green => PriceColor.Green,
        PriceQuantile.Red => PriceColor.Red,
        null => null,
        _ => PriceColor.Yellow,
    };

    #endregion
}
