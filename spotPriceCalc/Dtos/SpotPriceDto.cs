using System.Text.Json.Serialization;
using spotPriceCalc.Domain;

namespace spotPriceCalc.Dtos;

// Wire aggregate: zone id + IANA timezone once, then the UTC price curve. TimeZoneId lets the client
// label points in the zone's local time.
public record ZoneSpotPricesDto(int BiddingZoneId, string TimeZoneId, IReadOnlyList<PricePointDto> Points)
{
    public static ZoneSpotPricesDto From(ZoneSpotPrices z, string timeZoneId) =>
        new(z.BiddingZoneId, timeZoneId, z.Points.Select(PricePointDto.From).ToList());
}

// One slot: raw EUR/MWh plus consumer-facing ct/kWh (÷10), and where the slot sits in its zone's
// recent distribution.
//
// Quantile goes out as the NAME ("Green"/"Yellow"/"Red"), not the stored int. The int values are a
// storage contract (see PriceQuantile) that clients have no reason to depend on; null = the slot was
// never classified (not enough trailing history, or the calc-service was down when the day landed),
// which the client must render as "unknown" rather than guessing a colour.
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
