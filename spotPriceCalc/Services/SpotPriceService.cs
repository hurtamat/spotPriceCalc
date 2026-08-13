using spotPriceCalc.Domain;
using spotPriceCalc.Dtos.PriceZones;
using spotPriceCalc.Infrastructure.ExternalClients;
using spotPriceCalc.Infrastructure.Persistence;
using spotPriceCalc.Infrastructure.Persistence.Repositories;

namespace spotPriceCalc.Services;

public class SpotPriceService : ISpotPriceService
{
    private readonly ISpotPriceProvider _provider;
    private readonly IPriceZoneProvider _priceZoneProvider;
    private readonly ISpotPriceRepository _repository;
    private readonly ILogger<SpotPriceService> _logger;

    // Throttle the sequential ENTSO-E calls so we don't trip their rate limits / gateway timeouts.
    private static readonly TimeSpan RequestDelay = TimeSpan.FromMilliseconds(100);

    private static readonly TimeSpan RetryDelay = TimeSpan.FromSeconds(10);
    private const int MaxAttempts = 5;

    // Below this a quantile is noise, so a too-short range fails here instead of on a round trip.
    private const int MinZoneSamples = 12;

    public SpotPriceService(
        ISpotPriceProvider provider,
        IPriceZoneProvider priceZoneProvider,
        ISpotPriceRepository repository,
        ILogger<SpotPriceService> logger)
    {
        _provider = provider;
        _priceZoneProvider = priceZoneProvider;
        _repository = repository;
        _logger = logger;
    }

    // Day range: translate each DateOnly to its UTC market-day window and query.
    public Task<ZoneSpotPrices> GetPricesAsync(int biddingZoneId, DateOnly from, DateOnly to, CancellationToken ct)
    {
        var fromUtc = MarketDay.WindowUtc(from).FromUtc;
        var toUtc = MarketDay.WindowUtc(to).ToUtcExclusive;
        return _repository.GetAsync(biddingZoneId, fromUtc, toUtc, ct);
    }

    // Query by instant: resolve to the day containing it and reuse the day-range bounds logic above.
    public Task<ZoneSpotPrices> GetPricesAsync(int biddingZoneId, DateTime instant, CancellationToken ct)
    {
        var day = DateOnly.FromDateTime(instant);
        return GetPricesAsync(biddingZoneId, day, day, ct);
    }

    // Per zone: one country's prices form one distribution. Range resolved to CET market days, as elsewhere.
    public async Task<PriceZonesResponse> GetPriceZonesAsync(
        int biddingZoneId, DateOnly from, DateOnly to, CancellationToken ct)
    {
        var zone = BiddingZoneSeedData.ById[biddingZoneId];
        var fromUtc = MarketDay.WindowUtc(from).FromUtc;
        var toUtc = MarketDay.WindowUtc(to).ToUtcExclusive;

        var prices = await _repository.GetPriceValuesAsync(biddingZoneId, fromUtc, toUtc, ct);

        // A range can come back short or empty with no error upstream — populate stores only what arrived.
        if (prices.Count < MinZoneSamples)
            throw new InvalidOperationException(
                $"Only {prices.Count} stored price(s) for zone {biddingZoneId} between {from} and {to} " +
                $"— need at least {MinZoneSamples}. Populate the range first.");

        _logger.LogInformation("Requesting price zones for zone {ZoneId} ({Name}) {From}..{To}: {Count} points",
            biddingZoneId, zone.Name, from, to, prices.Count);

        return await _priceZoneProvider.GetPriceZonesAsync(prices, ct);
    }

    public async Task<PopulateResult> PopulateUntilCompleteAsync(DateOnly date, CancellationToken ct)
    {
        PopulateResult result;
        var attempt = 0;

        while (true)
        {
            attempt++;
            result = await PopulateOnceAsync(date, ct);

            if (result.Failed == 0)
            {
                _logger.LogInformation(
                    "Populate for {Date} complete after {Attempt} attempt(s): all {Total} zones present",
                    date, attempt, result.ZonesTotal);
                return result;
            }

            if (attempt >= MaxAttempts)
            {
                // Give up rather than loop forever — for "tomorrow" before publication some zones may
                // legitimately have no data yet; the next scheduled run will pick them up.
                _logger.LogError(
                    "Populate for {Date} gave up after {Attempt} attempts: {Failed} zone(s) still missing",
                    date, attempt, result.Failed);
                return result;
            }

            _logger.LogWarning(
                "Populate for {Date} attempt {Attempt}/{Max} incomplete: {Failed} zone(s) failed — retrying in {Delay}s",
                date, attempt, MaxAttempts, result.Failed, RetryDelay.TotalSeconds);
            await Task.Delay(RetryDelay, ct);
        }
    }

    // One pass over every zone for the date. The retry orchestrator above calls this repeatedly; it's the
    // only entry point that actually hits ENTSO-E. Private on purpose — callers get the retrying version.
    private async Task<PopulateResult> PopulateOnceAsync(DateOnly date, CancellationToken ct)
    {
        var zones = BiddingZoneSeedData.Zones;

        _logger.LogInformation("Populate started for {Date}: {ZoneCount} zones", date, zones.Count);

        var succeeded = 0;
        var skipped = 0;
        var pointsSaved = 0;
        var failures = new List<string>();

        foreach (var zone in zones)
        {
            try
            {
                // Already have a full day for the zone (>= 12 slots)? Skip the fetch, so re-running populate
                // only fills in the zones that failed/timed out — a partial day (too few slots) is re-fetched.
                // The window is the CET market day, so it can't be fooled by an adjacent day's slots.
                var (fromUtc, toUtc) = MarketDay.WindowUtc(date);
                if (await _repository.HasDayAsync(zone.Id, fromUtc, toUtc, ct))
                {
                    skipped++;
                    _logger.LogInformation("Skipped zone {ZoneId} ({Name}) for {Date}: already populated",
                        zone.Id, zone.Name, date);
                    continue;
                }

                var prices = await _provider.GetSpotPricesAsync(zone, date, ct);
                await _repository.SaveAsync(prices, ct);

                succeeded++;
                pointsSaved += prices.Points.Count;

                _logger.LogInformation("Populated zone {ZoneId} ({Name}) for {Date}: {Points} points",
                    zone.Id, zone.Name, date, prices.Points.Count);
            }
            catch (Exception ex)
            {
                // Keep going — a single zone with no data yet shouldn't sink the whole run.
                _logger.LogWarning(ex, "Populate failed for zone {ZoneId} ({Code}) on {Date}",
                    zone.Id, zone.Code, date);
                failures.Add($"{zone.Name} ({zone.Code}): {ex.Message}");
            }

            await Task.Delay(RequestDelay, ct);
        }

        _logger.LogInformation(
            "Populate finished for {Date}: {Succeeded} fetched, {Skipped} skipped, {Failed} failed, {Points} points",
            date, succeeded, skipped, failures.Count, pointsSaved);

        return new PopulateResult(date, zones.Count, succeeded, skipped, failures.Count, pointsSaved, failures);
    }
}
