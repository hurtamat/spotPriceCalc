namespace spotPriceCalc.Domain;

public class BiddingZone
{
    public int Id { get; set; }
    public required string Name { get; set; }

    /// <summary>ENTSO-E EIC domain code, e.g. "10YAT-APG------L". Sent as in_Domain/out_Domain.</summary>
    public required string Code { get; set; }

    /// <summary>IANA timezone, e.g. "Europe/Vienna". Used to map the delivery day to a UTC query window
    /// and to convert price slots to local time.</summary>
    public required string TimeZoneId { get; set; }

    /// <summary>Approximate centre of the zone — used to fetch weather (Open-Meteo). Stored as decimal
    /// (numeric(9,6)) so values persist exactly, without binary floating-point noise.</summary>
    public decimal Latitude { get; set; }
    public decimal Longitude { get; set; }

    /// <summary>The UTC half-open window <c>[FromUtc, ToUtcExclusive)</c> covering the zone's local
    /// <b>delivery day</b> for <paramref name="date"/> — local 00:00 to next 00:00 in <see cref="TimeZoneId"/>,
    /// converted to UTC (DST-aware). This is the market's day, not the UTC day: e.g. German 2026-07-25 is
    /// <c>2026-07-24T22:00Z … 2026-07-25T22:00Z</c> in summer. The one place delivery-day → UTC lives; the
    /// ENTSO-E query, the read window, and the populate skip-check all use it so they can't disagree.</summary>
    public (DateTime FromUtc, DateTime ToUtcExclusive) DeliveryDayWindowUtc(DateOnly date)
    {
        var tz = TimeZoneInfo.FindSystemTimeZoneById(TimeZoneId);
        var localStart = DateTime.SpecifyKind(date.ToDateTime(TimeOnly.MinValue), DateTimeKind.Unspecified);
        var localEnd = localStart.AddDays(1);
        return (TimeZoneInfo.ConvertTimeToUtc(localStart, tz), TimeZoneInfo.ConvertTimeToUtc(localEnd, tz));
    }
}