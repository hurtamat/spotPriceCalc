using spotPriceCalc.Domain;
using spotPriceCalc.Infrastructure.ExternalClients;
using spotPriceCalc.Infrastructure.Persistence;
using spotPriceCalc.Infrastructure.Persistence.Repositories;

namespace spotPriceCalc.Services;

public class SpotPriceService : ISpotPriceService
{
    private readonly ISpotPriceProvider _provider;
    private readonly ISpotPriceRepository _repository;
    private readonly ILogger<SpotPriceService> _logger;

    // Throttle the sequential ENTSO-E calls so we don't trip their rate limits / gateway timeouts.
    private static readonly TimeSpan RequestDelay = TimeSpan.FromMilliseconds(100);

    // Retry cadence + cap for PopulateUntilCompleteAsync when some zones are still missing.
    private static readonly TimeSpan RetryDelay = TimeSpan.FromSeconds(10);
    private const int MaxAttempts = 5;

    public SpotPriceService(
        ISpotPriceProvider provider,
        ISpotPriceRepository repository,
        ILogger<SpotPriceService> logger)
    {
        _provider = provider;
        _repository = repository;
        _logger = logger;
    }

    public Task<ZoneSpotPrices> GetPricesAsync(int biddingZoneId, DateOnly from, DateOnly to, CancellationToken ct)
    {
        // Interpret [from, to] as the zone's local delivery days and resolve to one UTC window:
        // from's local 00:00 to (to+1)'s local 00:00. The repo then does a pure range query.
        var zone = BiddingZoneSeedData.ById[biddingZoneId];
        var fromUtc = zone.DeliveryDayWindowUtc(from).FromUtc;
        var toUtc = zone.DeliveryDayWindowUtc(to).ToUtcExclusive;
        return _repository.GetAsync(biddingZoneId, fromUtc, toUtc, ct);
    }

    public async Task<PopulateResult> PopulateUntilCompleteAsync(DateOnly date, CancellationToken ct)
    {
        PopulateResult result;
        var attempt = 0;

        while (true)
        {
            attempt++;
            result = await PopulateOnceAsync(date, ct);

            // Every zone ended up stored (fetched or already present) — nothing failed/timed out.
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
                // The window is the zone's local delivery day, so it can't be fooled by an adjacent day's slots.
                var (fromUtc, toUtc) = zone.DeliveryDayWindowUtc(date);
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

            // Throttle between actual ENTSO-E calls (skipped zones use `continue` and never reach here).
            await Task.Delay(RequestDelay, ct);
        }

        _logger.LogInformation(
            "Populate finished for {Date}: {Succeeded} fetched, {Skipped} skipped, {Failed} failed, {Points} points",
            date, succeeded, skipped, failures.Count, pointsSaved);

        return new PopulateResult(date, zones.Count, succeeded, skipped, failures.Count, pointsSaved, failures);
    }
}
