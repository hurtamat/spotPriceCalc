using spotPriceCalc.Domain;

namespace spotPriceCalc.Infrastructure.Persistence.Repositories;

/// <summary>Persistence for spot prices. Pure storage — no HTTP, no fetch-if-missing logic (that lives
/// in the service). Range is inclusive by UTC date: [from 00:00, to+1 00:00).</summary>
public interface ISpotPriceRepository
{
    Task<ZoneSpotPrices> GetAsync(int biddingZoneId, DateOnly from, DateOnly to, CancellationToken ct);

    /// <summary>True if at least one price slot is stored for the zone on that day. Used to skip a zone
    /// that's already populated — we assume one slot means the whole day is present.</summary>
    Task<bool> HasAnyForDayAsync(int biddingZoneId, DateOnly date, CancellationToken ct);

    Task SaveAsync(ZoneSpotPrices prices, CancellationToken ct);
}
