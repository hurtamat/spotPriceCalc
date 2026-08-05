using spotPriceCalc.Domain;

namespace spotPriceCalc.Infrastructure.Persistence.Repositories;

// Persistence for temperatures (mirrors ISpotPriceRepository): pure storage over [from 00:00, to+1 00:00) UTC.
public interface IWeatherRepository
{
    Task<ZoneTemperatures> GetAsync(int biddingZoneId, DateOnly from, DateOnly to, CancellationToken ct);

    Task SaveAsync(ZoneTemperatures temperatures, CancellationToken ct);
}
