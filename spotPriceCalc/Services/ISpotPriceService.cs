using spotPriceCalc.Domain;

namespace spotPriceCalc.Services;

public interface ISpotPriceService
{
    // Day range, resolved to the zone's UTC delivery window internally.
    Task<ZoneSpotPrices> GetPricesAsync(int biddingZoneId, DateOnly from, DateOnly to, CancellationToken ct);

    // Query by instant, resolves to the day containing it.
    Task<ZoneSpotPrices> GetPricesAsync(int biddingZoneId, DateTime instant, CancellationToken ct);

    // Stores a date range, one request per zone, without classifying it. Best-effort: never throws.
    Task BackfillHistoryAsync(DateOnly from, DateOnly to, CancellationToken ct);

    // Retries idempotently until every zone lands, stamping each slot's quantile as it goes.
    Task<PopulateResult> PopulateUntilCompleteAsync(DateOnly date, CancellationToken ct);
}
