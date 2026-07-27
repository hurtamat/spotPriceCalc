using spotPriceCalc.Domain;

namespace spotPriceCalc.Services;

public interface ISpotPriceService
{
    /// <summary>Reads stored prices for one zone over an inclusive date range.</summary>
    Task<ZoneSpotPrices> GetPricesAsync(int biddingZoneId, DateOnly from, DateOnly to, CancellationToken ct);

    /// <summary>Fetches day-ahead prices for every seeded zone for the given date and stores them, retrying
    /// (every 10s, capped) until every zone is in. Populate is idempotent, so each retry only re-fetches the
    /// zones that failed/timed out last pass. The single populate entry point — triggers and the manual
    /// endpoint all use this.</summary>
    Task<PopulateResult> PopulateUntilCompleteAsync(DateOnly date, CancellationToken ct);
}
