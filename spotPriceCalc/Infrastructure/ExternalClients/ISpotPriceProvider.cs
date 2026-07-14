using spotPriceCalc.Domain;

namespace spotPriceCalc.Infrastructure.ExternalClients;

public interface ISpotPriceProvider
{
    Task<IReadOnlyList<SpotPrice>> GetSpotPricesAsync(BiddingZone zone, DateOnly date, CancellationToken ct);
}