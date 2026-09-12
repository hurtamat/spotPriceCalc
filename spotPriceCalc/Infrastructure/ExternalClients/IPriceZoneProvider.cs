using spotPriceCalc.Dtos;
using spotPriceCalc.Dtos.PriceZones;

namespace spotPriceCalc.Infrastructure.ExternalClients;

// Upstream call to the Python calc-service: the price curve in, the two threshold prices out.
public interface IPriceZoneProvider
{
    Task<PriceZonesResponse> GetPriceZonesAsync(IReadOnlyList<PricePointDto> prices, CancellationToken ct);
}
