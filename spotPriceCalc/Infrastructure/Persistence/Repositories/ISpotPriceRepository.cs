using spotPriceCalc.Domain;

namespace spotPriceCalc.Infrastructure.Persistence.Repositories;

// Persistence for spot prices. Pure storage — the caller resolves the zone-local day to a half-open UTC
// window [fromUtc, toUtcExclusive) and passes explicit bounds.
public interface ISpotPriceRepository
{
    Task<ZoneSpotPrices> GetAsync(int biddingZoneId, DateTime fromUtc, DateTime toUtcExclusive, CancellationToken ct);

    // Prices only, for statistics where the timestamps carry no information. Projected in SQL.
    Task<IReadOnlyList<decimal>> GetPriceValuesAsync(
        int biddingZoneId, DateTime fromUtc, DateTime toUtcExclusive, CancellationToken ct);

    // True if the window holds at least MinSlotsForDay slots — a count threshold so a partial day self-heals.
    Task<bool> HasDayAsync(int biddingZoneId, DateTime fromUtc, DateTime toUtcExclusive, CancellationToken ct);

    Task SaveAsync(ZoneSpotPrices prices, CancellationToken ct);

    // Stamps Green/Yellow/Red on every slot in the window: below lower = Green, above upper = Red, else Yellow.
    Task SetQuantilesAsync(int biddingZoneId, DateTime fromUtc, DateTime toUtcExclusive,
        decimal lower, decimal upper, CancellationToken ct);
}
