using spotPriceCalc.Domain;

namespace spotPriceCalc.Dtos;

/// <summary>The aggregate over the wire: zone id once, then the price curve.</summary>
public record ZoneSpotPricesDto(int BiddingZoneId, IReadOnlyList<PricePointDto> Points)
{
    public static ZoneSpotPricesDto From(ZoneSpotPrices z) =>
        new(z.BiddingZoneId, z.Points.Select(PricePointDto.From).ToList());
}

/// <summary>One slot: raw EUR/MWh plus the consumer-facing ct/kWh (÷10).</summary>
public record PricePointDto(DateTime FromUtc, DateTime ToUtc, decimal EurPerMwh, decimal CtPerKwh)
{
    public static PricePointDto From(PricePoint p) =>
        new(p.From, p.To, p.Price, p.Price / 10m);
}
