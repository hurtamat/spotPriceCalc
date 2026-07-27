using spotPriceCalc.Domain;

namespace spotPriceCalc.Dtos;

/// <summary>The aggregate over the wire: zone id + its IANA timezone once, then the price curve. Points
/// stay UTC; <see cref="TimeZoneId"/> lets the client label them in the zone's local time (German prices
/// read in German hours regardless of where the viewer sits).</summary>
public record ZoneSpotPricesDto(int BiddingZoneId, string TimeZoneId, IReadOnlyList<PricePointDto> Points)
{
    public static ZoneSpotPricesDto From(ZoneSpotPrices z, string timeZoneId) =>
        new(z.BiddingZoneId, timeZoneId, z.Points.Select(PricePointDto.From).ToList());
}

/// <summary>One slot: raw EUR/MWh plus the consumer-facing ct/kWh (÷10).</summary>
public record PricePointDto(DateTime FromUtc, DateTime ToUtc, decimal EurPerMwh, decimal CtPerKwh)
{
    public static PricePointDto From(PricePoint p) =>
        new(p.From, p.To, p.Price, p.Price / 10m);
}
