using spotPriceCalc.Domain;

namespace spotPriceCalc.Infrastructure.Persistence.Repositories;

/// <summary>Persistence for spot prices. Pure storage — no HTTP, no fetch-if-missing logic (that lives
/// in the service). Range is inclusive by UTC date: [from 00:00, to+1 00:00).</summary>
public interface ISpotPriceRepository
{
    Task<ZoneSpotPrices> GetAsync(int biddingZoneId, DateOnly from, DateOnly to, CancellationToken ct);

    Task SaveAsync(ZoneSpotPrices prices, CancellationToken ct);
}
