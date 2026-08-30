using spotPriceCalc.Domain;

namespace spotPriceCalc.Infrastructure.ExternalClients;

public interface IWeatherProvider
{
    Task<ZoneTemperatures> GetTemperaturesAsync(BiddingZone zone, CancellationToken ct);
}
