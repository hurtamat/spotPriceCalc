using spotPriceCalc.Domain;

namespace spotPriceCalc.Dtos;

// Wire aggregate: zone id + IANA timezone once, then the UTC price curve. TimeZoneId lets the client
// label points in the zone's local time.
public record ZoneSpotPricesDto(int BiddingZoneId, string TimeZoneId, IReadOnlyList<PricePointDto> Points)
{
    public static ZoneSpotPricesDto From(ZoneSpotPrices z, string timeZoneId) =>
        new(z.BiddingZoneId, timeZoneId, z.Points.Select(PricePointDto.From).ToList());
}

// One slot: raw EUR/MWh plus consumer-facing ct/kWh (÷10).
public record PricePointDto(DateTime FromUtc, DateTime ToUtc, decimal EurPerMwh, decimal CtPerKwh)
{
    public static PricePointDto From(PricePoint p) =>
        new(p.From, p.To, p.Price, p.Price / 10m);
}
