using spotPriceCalc.Domain;

namespace spotPriceCalc.Services;

public interface ISpotPriceService
{
    /// <summary>Reads stored prices for one zone over an inclusive date range.</summary>
    Task<ZoneSpotPrices> GetPricesAsync(int biddingZoneId, DateOnly from, DateOnly to, CancellationToken ct);

    /// <summary>Fetches day-ahead prices for every seeded zone for the given day and stores them.
    /// The manual API entry point (?day=today|tomorrow). One pass, no retry.</summary>
    Task<PopulateResult> PopulateAsync(PriceDay day, CancellationToken ct);

    /// <summary>Fetches day-ahead prices for every seeded zone for an explicit date and stores them.
    /// One pass, no retry — the date-based core the <see cref="PriceDay"/> overload and the retry
    /// orchestrator both build on.</summary>
    Task<PopulateResult> PopulateAsync(DateOnly date, CancellationToken ct);

    /// <summary>Populates the given date and keeps retrying (every 10s, capped) until every zone is in.
    /// Populate is idempotent, so each retry only re-fetches the zones that failed/timed out last pass.
    /// This is what the scheduled + startup triggers call — "always confirm all zones landed."</summary>
    Task<PopulateResult> PopulateUntilCompleteAsync(DateOnly date, CancellationToken ct);
}
