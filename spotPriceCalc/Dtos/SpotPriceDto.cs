using System.Text.Json.Serialization;
using spotPriceCalc.Domain;

namespace spotPriceCalc.Dtos;

// Wire aggregate: zone id + IANA timezone once, then the UTC price curve.
// DayRange spans every zone that day, so the chart axis holds still when the user switches zones.
public record ZoneSpotPricesDto(
    int BiddingZoneId,
    string TimeZoneId,
    IReadOnlyList<PricePointDto> Points,
    PriceRangeDto? DayRange)
{
    public static ZoneSpotPricesDto From(ZoneSpotPrices z, string timeZoneId, PriceRange? dayRange) =>
        new(z.BiddingZoneId, timeZoneId, z.Points.Select(PricePointDto.From).ToList(),
            dayRange is null ? null : PriceRangeDto.From(dayRange));
}

public record PriceRangeDto(decimal MinCtPerKwh, decimal MaxCtPerKwh)
{
    public static PriceRangeDto From(PriceRange r) => new(r.Min / 10m, r.Max / 10m);
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
