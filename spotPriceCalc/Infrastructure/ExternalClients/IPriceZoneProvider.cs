using spotPriceCalc.Dtos.PriceZones;

namespace spotPriceCalc.Infrastructure.ExternalClients;

// Upstream call to the Python calc-service: prices in, the two threshold prices out.
public interface IPriceZoneProvider
{
    Task<PriceZonesResponse> GetPriceZonesAsync(IReadOnlyList<decimal> eurPerMwh, CancellationToken ct);
}
