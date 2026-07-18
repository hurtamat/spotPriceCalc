using spotPriceCalc.Domain;
using spotPriceCalc.Infrastructure.ExternalClients;

namespace spotPriceCalc.Services;

public interface ISpotPriceService
{
    Task<ZoneSpotPrices> GetPricesAsync(DateOnly date, CancellationToken ct);
}

public class SpotPriceService : ISpotPriceService
{
    private readonly ISpotPriceProvider _provider;

    // Hardcoded for now — no persistence yet. Just enough to test the flow end to end.
    private static readonly BiddingZone Zone = new()
    {
        Id = 1,
        Name = "Slovakia",
        Code = "10YSK-SEPS-----K",
        TimeZoneId = "Europe/Bratislava",
        Latitude = 48.15,   // ~Bratislava
        Longitude = 17.11,
    };

    public SpotPriceService(ISpotPriceProvider provider)
    {
        _provider = provider;
    }

    public Task<ZoneSpotPrices> GetPricesAsync(DateOnly date, CancellationToken ct) =>
        _provider.GetSpotPricesAsync(Zone, date, ct);
}
