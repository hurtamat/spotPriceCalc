using spotPriceCalc.Domain;

namespace spotPriceCalc.Infrastructure.ExternalClients;

public interface ISpotPriceProvider
{
    Task<ZoneSpotPrices> GetSpotPricesAsync(BiddingZone zone, DateOnly date, CancellationToken ct);
}