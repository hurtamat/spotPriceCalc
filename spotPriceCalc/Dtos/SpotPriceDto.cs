using System.Text.Json.Serialization;
using spotPriceCalc.Domain;

namespace spotPriceCalc.Dtos;

// Wire aggregate: zone id + IANA timezone once, then the UTC price curve.
public record ZoneSpotPricesDto(int BiddingZoneId, string TimeZoneId, IReadOnlyList<PricePointDto> Points)
{
    public static ZoneSpotPricesDto From(ZoneSpotPrices z, string timeZoneId) =>
        new(z.BiddingZoneId, timeZoneId, z.Points.Select(PricePointDto.From).ToList());
}

public record PricePointDto(
    DateTime FromUtc,
    DateTime ToUtc,
    decimal EurPerMwh,
    decimal CtPerKwh,
    [property: JsonConverter(typeof(JsonStringEnumConverter))] PriceQuantile? Quantile)
{
    public static PricePointDto From(PricePoint p) =>
        new(p.From, p.To, p.Price, p.Price / 10m, p.Quantile);
}
