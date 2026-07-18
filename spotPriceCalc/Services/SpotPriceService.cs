using spotPriceCalc.Domain;
using spotPriceCalc.Infrastructure.ExternalClients;

namespace spotPriceCalc.Services;

public interface ISpotPriceService
{
    Task<IReadOnlyList<SpotPrice>> GetPricesAsync(DateOnly date, CancellationToken ct);
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
    };

    public SpotPriceService(ISpotPriceProvider provider)
    {
        _provider = provider;
    }

    public Task<IReadOnlyList<SpotPrice>> GetPricesAsync(DateOnly date, CancellationToken ct) =>
        _provider.GetSpotPricesAsync(Zone, date, ct);
}
