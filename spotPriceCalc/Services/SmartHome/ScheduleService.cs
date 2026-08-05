using spotPriceCalc.Dtos.Schedule;
using spotPriceCalc.Infrastructure.Persistence;

namespace spotPriceCalc.Services.SmartHome;

// Price-ranking scheduler (v1): cheapest hours under the given constraints. Thermal/comfort optimisation is
// planned for the Python calc-service. TODO(timezone): UTC in / UTC out; convert to device-local at the edge.
public class ScheduleService : IScheduleService
{
    private readonly ISpotPriceService _prices;
    private readonly IZoneLocatorService _zoneLocator;
    private readonly ILogger<ScheduleService> _logger;

    public ScheduleService(ISpotPriceService prices, IZoneLocatorService zoneLocator, ILogger<ScheduleService> logger)
    {
        _prices = prices;
        _zoneLocator = zoneLocator;
        _logger = logger;
    }

    private record Slot(DateTimeOffset Start, DateTimeOffset End, decimal Price)
    {
        public double Hours => (End - Start).TotalHours;
    }

    public async Task<ScheduleResponse> BuildAsync(ScheduleRequest request, CancellationToken ct)
    {
        var biddingZoneId = _zoneLocator.ResolveBiddingZone(request.Lat, request.Lon);
        if (!BiddingZoneSeedData.ById.TryGetValue(biddingZoneId, out var zone))
            throw new ArgumentException($"Unknown bidding zone id {biddingZoneId}.", nameof(request));

        var nowUtc = DateTimeOffset.UtcNow;
        var slots = await LoadSlotsAsync(biddingZoneId, nowUtc, ct);

        // Union of every task's selected slots — drives the overall relay state and the next toggle.
        var selectedAll = new HashSet<DateTimeOffset>();
        var taskResults = new List<TaskResult>();
        var relay = false;

        foreach (var task in request.Tasks)
        {
            var chosen = EvaluateTask(task, slots, request.AvailableFrom, request.Unavailable, nowUtc);

            if (chosen.Any(s => nowUtc >= s.Start && nowUtc < s.End)) relay = true;
            foreach (var s in chosen) selectedAll.Add(s.Start);

            taskResults.Add(new TaskResult
            {
                TaskId = task.TaskId,
                Scheduled = chosen.Count > 0,
                Hours = chosen.Select(ToHourDto).ToList(),
            });
        }

        return new ScheduleResponse
        {
            DeviceId = request.DeviceId,
            BiddingZoneId = biddingZoneId,
            ZoneName = zone.Name,
            RelayState = relay,
            NowUtc = nowUtc,
            NextToggleUtc = NextToggle(slots, selectedAll, nowUtc, relay),
            Tasks = taskResults,
        };
    }

    // Fetch the stored curve as UTC slots over a ±1-day window (a day straddles two UTC dates at the edges).
    private async Task<List<Slot>> LoadSlotsAsync(int zoneId, DateTimeOffset nowUtc, CancellationToken ct)
    {
        var today = DateOnly.FromDateTime(nowUtc.UtcDateTime);
        var priced = await _prices.GetPricesAsync(zoneId, today.AddDays(-1), today.AddDays(1), ct);

        return priced.Points
            .Select(p => new Slot(
                new DateTimeOffset(DateTime.SpecifyKind(p.From, DateTimeKind.Utc)),
                new DateTimeOffset(DateTime.SpecifyKind(p.To, DateTimeKind.Utc)),
                p.Price))
            .OrderBy(s => s.Start)
            .ToList();
    }

    private static List<Slot> EvaluateTask(
        TaskRequest task,
        List<Slot> slots,
        DateTimeOffset? availableFrom,
        UnavailableWindow? unavailable,
        DateTimeOffset nowUtc)
    {
        // Deadline is the anchor; the window is the 24h before it (or from available_from), never the past.
        var anchor = task.ReadyBy ?? nowUtc.AddHours(24);
        var windowStart = availableFrom ?? anchor.AddHours(-24);
        var effectiveStart = windowStart > nowUtc ? windowStart : nowUtc;

        var eligible = slots
            .Where(s => s.Start >= effectiveStart && s.End <= anchor)
            .Where(s => !IsExcluded(s, unavailable))
            .OrderBy(s => s.Start)
            .ToList();

        return task.ContinuousBlock
            ? SelectContiguous(eligible, task)
            : SelectCheapest(eligible, task);
    }

    private static List<Slot> SelectCheapest(List<Slot> eligible, TaskRequest task)
    {
        var chosen = new List<Slot>();
        var covered = 0.0;
        foreach (var s in eligible.OrderBy(s => s.Price).ThenBy(s => s.Start))
        {
            if (covered >= task.DurationHours) break;
            chosen.Add(s);
            covered += s.Hours;
        }
        return chosen.OrderBy(s => s.Start).ToList();
    }

    private static List<Slot> SelectContiguous(List<Slot> eligible, TaskRequest task)
    {
        var byTime = eligible.OrderBy(s => s.Start).ToList();
        if (byTime.Count == 0) return new List<Slot>();

        var slotHours = byTime[0].Hours;
        var needed = Math.Max(1, (int)Math.Ceiling(task.DurationHours / slotHours - 1e-9));

        List<Slot>? best = null;
        decimal bestCost = decimal.MaxValue;

        for (var i = 0; i + needed <= byTime.Count; i++)
        {
            var block = byTime.GetRange(i, needed);
            if (!IsContiguous(block)) continue;

            var cost = block.Sum(s => s.Price);
            if (cost < bestCost)
            {
                bestCost = cost;
                best = block;
            }
        }

        return best ?? new List<Slot>();
    }

    // Is the slot inside the "do not run" window (by UTC time-of-day)? from > to wraps past midnight.
    private static bool IsExcluded(Slot s, UnavailableWindow? window)
    {
        if (window is null) return false;
        var t = TimeOnly.FromDateTime(s.Start.UtcDateTime);
        return window.From <= window.To
            ? t >= window.From && t < window.To          // same-day range
            : t >= window.From || t < window.To;          // wraps past midnight
    }

    private static bool IsContiguous(IReadOnlyList<Slot> block)
    {
        for (var i = 1; i < block.Count; i++)
            if (block[i].Start != block[i - 1].End)
                return false;
        return true;
    }

    private static DateTimeOffset? NextToggle(List<Slot> slots, HashSet<DateTimeOffset> selected, DateTimeOffset now, bool currentState)
    {
        foreach (var s in slots.Where(s => s.End > now).OrderBy(s => s.Start))
        {
            var on = selected.Contains(s.Start);
            var boundary = on ? s.Start : s.End;
            if (boundary <= now) continue;
            if (on != currentState)
                return on ? s.Start : now < s.Start ? s.Start : boundary;
        }
        return null;
    }

    private static ScheduledHour ToHourDto(Slot s) => new()
    {
        StartUtc = s.Start,
        EndUtc = s.End,
        EurPerMwh = s.Price,
    };
}
