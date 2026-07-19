using spotPriceCalc.Domain;

namespace spotPriceCalc.Services;

public interface ISpotPriceService
{
    /// <summary>Reads stored prices for one zone over an inclusive date range.</summary>
    Task<ZoneSpotPrices> GetPricesAsync(int biddingZoneId, DateOnly from, DateOnly to, CancellationToken ct);

    /// <summary>Fetches day-ahead prices for every seeded zone for the given day and stores them.
    /// Meant to be triggered once a day (later by an Azure Function; for now a manual endpoint).</summary>
    Task<PopulateResult> PopulateAsync(PriceDay day, CancellationToken ct);
}
