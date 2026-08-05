using spotPriceCalc.Domain;

namespace spotPriceCalc.Services;

public interface ISpotPriceService
{
    Task<ZoneSpotPrices> GetPricesAsync(int biddingZoneId, DateOnly from, DateOnly to, CancellationToken ct);

    // Retries idempotently until every zone lands. The single populate entry point.
    Task<PopulateResult> PopulateUntilCompleteAsync(DateOnly date, CancellationToken ct);
}
