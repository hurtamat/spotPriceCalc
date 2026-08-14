using spotPriceCalc.Domain;

namespace spotPriceCalc.Infrastructure.ExternalClients;

public interface ISpotPriceProvider
{
    Task<ZoneSpotPrices> GetSpotPricesAsync(BiddingZone zone, DateOnly from, DateOnly to, CancellationToken ct);
}