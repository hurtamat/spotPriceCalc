using spotPriceCalc.Domain;

namespace spotPriceCalc.Infrastructure.Persistence.Repositories;

// Persistence for spot prices. Pure storage; the caller passes explicit UTC bounds.
public interface ISpotPriceRepository
{
    Task<ZoneSpotPrices> GetAsync(int biddingZoneId, DateTime fromUtc, DateTime toUtcExclusive, CancellationToken ct);

    // True if the window holds at least MinSlotsForDay slots.
    Task<bool> HasDayAsync(int biddingZoneId, DateTime fromUtc, DateTime toUtcExclusive, CancellationToken ct);

    Task SaveAsync(ZoneSpotPrices prices, CancellationToken ct);

    // Stamps Green/Yellow/Red on every slot in the window: below lower = Green, above upper = Red, else Yellow.
    Task SetQuantilesAsync(int biddingZoneId, DateTime fromUtc, DateTime toUtcExclusive,
        decimal lower, decimal upper, CancellationToken ct);
}
