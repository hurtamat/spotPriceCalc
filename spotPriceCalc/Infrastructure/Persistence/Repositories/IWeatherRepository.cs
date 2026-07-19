using spotPriceCalc.Domain;

namespace spotPriceCalc.Infrastructure.Persistence.Repositories;

/// <summary>Persistence for temperatures. Mirrors <see cref="ISpotPriceRepository"/>: pure storage over an
/// inclusive UTC-date range [from 00:00, to+1 00:00).</summary>
public interface IWeatherRepository
{
    Task<ZoneTemperatures> GetAsync(int biddingZoneId, DateOnly from, DateOnly to, CancellationToken ct);

    Task SaveAsync(ZoneTemperatures temperatures, CancellationToken ct);
}
