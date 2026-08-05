namespace spotPriceCalc.Domain;

public class BiddingZone
{
    public int Id { get; set; }
    public required string Name { get; set; }

    // ENTSO-E EIC domain code. Sent as in_Domain/out_Domain.
    public required string Code { get; set; }

    public required string TimeZoneId { get; set; }

    // Approximate zone centre, for the weather query.
    public decimal Latitude { get; set; }
    public decimal Longitude { get; set; }

    // Half-open UTC window [FromUtc, ToUtcExclusive) for the zone-local delivery day (DST-aware). This is
    // the market's day, not the UTC day, and the single source ENTSO-E query / read / skip-check all share.
    public (DateTime FromUtc, DateTime ToUtcExclusive) DeliveryDayWindowUtc(DateOnly date)
    {
        var tz = TimeZoneInfo.FindSystemTimeZoneById(TimeZoneId);
        var localStart = DateTime.SpecifyKind(date.ToDateTime(TimeOnly.MinValue), DateTimeKind.Unspecified);
        var localEnd = localStart.AddDays(1);
        return (TimeZoneInfo.ConvertTimeToUtc(localStart, tz), TimeZoneInfo.ConvertTimeToUtc(localEnd, tz));
    }
}