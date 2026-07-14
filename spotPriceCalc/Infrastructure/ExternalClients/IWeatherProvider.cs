namespace spotPriceCalc.Infrastructure.ExternalClients;

public interface IWeatherProvider
{
    Task<IReadOnlyList<Weather>> GetWeatherPerPlace(CancellationToken ct); 
}