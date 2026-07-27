using spotPriceCalc.Domain;

namespace spotPriceCalc.Infrastructure.Persistence.Repositories;

/// <summary>Persistence for spot prices. Pure storage — no HTTP, no timezone/delivery-day logic (the caller
/// resolves the zone-local day to a UTC window and passes explicit bounds). Windows are half-open
/// <c>[fromUtc, toUtcExclusive)</c>.</summary>
public interface ISpotPriceRepository
{
    Task<ZoneSpotPrices> GetAsync(int biddingZoneId, DateTime fromUtc, DateTime toUtcExclusive, CancellationToken ct);

    /// <summary>True if the zone's day (the given UTC window) looks fully populated — at least
    /// <c>MinSlotsForDay</c> price slots are stored in it. A count threshold (not "any slot") so a partial
    /// day can still self-heal; 12 sits between the fewest a real day has (22 hourly slots) and the most a
    /// wrong window could contain, so it works for both hourly and 15-minute zones.</summary>
    Task<bool> HasDayAsync(int biddingZoneId, DateTime fromUtc, DateTime toUtcExclusive, CancellationToken ct);

    Task SaveAsync(ZoneSpotPrices prices, CancellationToken ct);
}
