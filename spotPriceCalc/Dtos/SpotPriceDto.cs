using System.Text.Json.Serialization;
using spotPriceCalc.Domain;

namespace spotPriceCalc.Dtos;

// Wire aggregate: zone id + IANA timezone once, then the UTC price curve.
public record ZoneSpotPricesDto(int BiddingZoneId, string TimeZoneId, IReadOnlyList<ClassifiedPricePointDto> Points)
{
    public static ZoneSpotPricesDto From(ZoneSpotPrices z, string timeZoneId) =>
        new(z.BiddingZoneId, timeZoneId, z.Points.Select(ClassifiedPricePointDto.From).ToList());
}

public record ClassifiedPricePointDto(
    DateTime FromUtc,
    DateTime ToUtc,
    decimal EurPerMwh,
    decimal CtPerKwh,
    [property: JsonConverter(typeof(JsonStringEnumConverter))] PriceQuantile? Quantile)
    : PricePointDto(FromUtc, ToUtc, EurPerMwh)
{
    public static new ClassifiedPricePointDto From(PricePoint p) =>
        new(p.From, p.To, p.Price, p.Price / 10m, p.Quantile);
}
