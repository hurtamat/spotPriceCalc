using spotPriceCalc.Domain;

namespace spotPriceCalc.Services;

public interface ISpotPriceService
{
    // Day range — resolved to the zone's UTC delivery window internally.
    Task<ZoneSpotPrices> GetPricesAsync(int biddingZoneId, DateOnly from, DateOnly to, CancellationToken ct);

    // Query by instant — resolves to the day containing it and reuses the day-range logic (e.g. a status lookup).
    Task<ZoneSpotPrices> GetPricesAsync(int biddingZoneId, DateTime instant, CancellationToken ct);

    // Retries idempotently until every zone lands. The single populate entry point.
    Task<PopulateResult> PopulateUntilCompleteAsync(DateOnly date, CancellationToken ct);
}
