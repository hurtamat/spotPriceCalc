using spotPriceCalc.Domain;
using spotPriceCalc.Dtos.PriceZones;
using spotPriceCalc.Infrastructure.ExternalClients;
using spotPriceCalc.Infrastructure.ExternalClients.Entsoe;
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
    private const int QuantileWindowDays = 7;
    private const int MinQuantileSamples = 12;

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

    #region Reads

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

    #endregion

    #region Populate — fetch, store, classify

    // Re-runs the pass until every zone lands, then stops. Bounded because "tomorrow" before the auction
    // clears legitimately has no data — the next scheduled run picks it up.
    public async Task<PopulateResult> PopulateUntilCompleteAsync(DateOnly date, CancellationToken ct)
    {
        for (var attempt = 1; ; attempt++)
        {
            var result = await PopulateOnceAsync(date, ct);

            if (result.Failed == 0 || attempt == MaxAttempts)
            {
                _logger.Log(result.Failed == 0 ? LogLevel.Information : LogLevel.Error,
                    "Populate {Date} done after {Attempt} attempt(s): {Failed} of {Total} zone(s) missing",
                    date, attempt, result.Failed, result.ZonesTotal);
                return result;
            }

            _logger.LogWarning("Populate {Date} attempt {Attempt}/{Max}: {Failed} failed — retry in {Delay}s",
                date, attempt, MaxAttempts, result.Failed, RetryDelay.TotalSeconds);
            await Task.Delay(RetryDelay, ct);
        }
    }

    // One pass over every zone. The only place that hits ENTSO-E; the retry wrapper above calls it repeatedly.
    private async Task<PopulateResult> PopulateOnceAsync(DateOnly date, CancellationToken ct)
    {
        var zones = BiddingZoneSeedData.Zones;
        int succeeded = 0, skipped = 0, declined = 0, pointsSaved = 0;
        var failures = new List<string>();

        foreach (var zone in zones)
        {
            try
            {
                var saved = await PopulateZoneAsync(zone, date, ct);
                if (saved is null) skipped++;
                else (succeeded, pointsSaved) = (succeeded + 1, pointsSaved + saved.Value);
            }
            catch (EntsoeAcknowledgementException ex)
            {
                // ENTSO-E has nothing for this zone/day. Not a failure to retry — asking again won't help.
                declined++;
                _logger.LogInformation("No data at ENTSO-E for {Zone} on {Date}: {Reason}",
                    zone.Name, date, ex.Message);
            }
            catch (Exception ex)
            {
                // One zone timing out shouldn't sink the run; this one IS worth another attempt.
                _logger.LogWarning(ex, "Populate failed for {Zone} ({Code}) on {Date}", zone.Name, zone.Code, date);
                failures.Add($"{zone.Name} ({zone.Code}): {ex.Message}");
            }

            await Task.Delay(RequestDelay, ct);
        }

        _logger.LogInformation(
            "Populate {Date}: {Succeeded} fetched, {Skipped} skipped, {Declined} no-data, {Failed} failed, {Points} points",
            date, succeeded, skipped, declined, failures.Count, pointsSaved);

        return new PopulateResult(date, zones.Count, succeeded, skipped, failures.Count, declined, pointsSaved, failures);
    }

    // Fetches, stores and classifies one zone's market day. Returns points saved, or null if already present.
    private async Task<int?> PopulateZoneAsync(BiddingZone zone, DateOnly date, CancellationToken ct)
    {
        // A partial day (< MinSlotsForDay) is re-fetched, so a half-finished run self-heals.
        var (fromUtc, toUtc) = MarketDay.WindowUtc(date);
        if (await _repository.HasDayAsync(zone.Id, fromUtc, toUtc, ct))
        {
            _logger.LogInformation("Skipped {Zone} for {Date}: already populated", zone.Name, date);
            return null;
        }

        var prices = await _provider.GetSpotPricesAsync(zone, date, date, ct);
        await _repository.SaveAsync(prices, ct);
        await ClassifyDayAsync(zone, date, ct);

        _logger.LogInformation("Populated {Zone} for {Date}: {Points} points", zone.Name, date, prices.Points.Count);
        return prices.Points.Count;
    }

    // Stamps Green/Yellow/Red on the day's slots, using cut-offs the calc-service derives from the trailing
    // QuantileWindowDays (this day included) — one country's prices form one distribution.
    private async Task ClassifyDayAsync(BiddingZone zone, DateOnly date, CancellationToken ct)
    {
        var (dayFromUtc, dayToUtc) = MarketDay.WindowUtc(date);
        var windowFromUtc = MarketDay.WindowUtc(date.AddDays(-(QuantileWindowDays - 1))).FromUtc;

        var prices = await _repository.GetPriceValuesAsync(zone.Id, windowFromUtc, dayToUtc, ct);
        if (prices.Count < MinQuantileSamples)
        {
            _logger.LogInformation("Skipped quantiles for {Zone} on {Date}: only {Count} sample(s)",
                zone.Name, date, prices.Count);
            return;
        }

        var zones = await _priceZoneProvider.GetPriceZonesAsync(prices, ct);
        await _repository.SetQuantilesAsync(
            zone.Id, dayFromUtc, dayToUtc, zones.LowerQuantile, zones.UpperQuantile, ct);
    }

    #endregion

    #region History backfill

    // Backfills a date range in ONE ENTSO-E call per zone. No quantiles — this is only the trailing history
    // that ClassifyDayAsync needs a full window of. Not retried: it's best-effort context.
    public async Task BackfillHistoryAsync(DateOnly from, DateOnly to, CancellationToken ct)
    {
        var zones = BiddingZoneSeedData.Zones;
        int succeeded = 0, skipped = 0, pointsSaved = 0, failed = 0;

        foreach (var zone in zones)
        {
            try
            {
                if (await HasEveryDayAsync(zone.Id, from, to, ct))
                {
                    skipped++;
                    continue;
                }

                var prices = await _provider.GetSpotPricesAsync(zone, from, to, ct);
                await _repository.SaveAsync(prices, ct);
                succeeded++;
                pointsSaved += prices.Points.Count;
            }
            catch (EntsoeAcknowledgementException ex)
            {
                failed++;
                _logger.LogInformation("No history at ENTSO-E for {Zone} {From}..{To}: {Reason}",
                    zone.Name, from, to, ex.Message);
            }
            catch (Exception ex)
            {
                failed++;
                _logger.LogWarning(ex, "History backfill failed for {Zone} ({Code}) {From}..{To}",
                    zone.Name, zone.Code, from, to);
            }

            await Task.Delay(RequestDelay, ct);
        }

        _logger.LogInformation(
            "History backfill {From}..{To}: {Succeeded} fetched, {Skipped} already stored, {Failed} failed, {Points} points",
            from, to, succeeded, skipped, failed, pointsSaved);
    }

    private async Task<bool> HasEveryDayAsync(int zoneId, DateOnly from, DateOnly to, CancellationToken ct)
    {
        for (var day = from; day <= to; day = day.AddDays(1))
        {
            var (fromUtc, toUtc) = MarketDay.WindowUtc(day);
            if (!await _repository.HasDayAsync(zoneId, fromUtc, toUtc, ct))
                return false;
        }

        return true;
    }

    #endregion
}
