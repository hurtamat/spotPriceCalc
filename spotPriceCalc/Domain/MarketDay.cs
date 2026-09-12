namespace spotPriceCalc.Domain;

// The day-ahead market day. ENTSO-E publishes A44 prices per CET/CEST calendar day for every bidding zone,
// never the zone's own local time. Deliberately not per zone: a zone's local day made the requested window
// straddle two CET publication days for the 9 non-CET zones, and the wrong one got stored.
public static class MarketDay
{
    // Any CET/CEST zone works; Berlin is the canonical one.
    private static readonly TimeZoneInfo Cet = TimeZoneInfo.FindSystemTimeZoneById("Europe/Berlin");

    // Half-open UTC window [FromUtc, ToUtcExclusive) for the CET delivery day.
    public static (DateTime FromUtc, DateTime ToUtcExclusive) WindowUtc(DateOnly date)
    {
        // Midnight is never inside a DST transition, so ConvertTimeToUtc can't throw here.
        var localStart = DateTime.SpecifyKind(date.ToDateTime(TimeOnly.MinValue), DateTimeKind.Unspecified);
        var localEnd = localStart.AddDays(1);
        return (TimeZoneInfo.ConvertTimeToUtc(localStart, Cet), TimeZoneInfo.ConvertTimeToUtc(localEnd, Cet));
    }

    // 23:00Z the UTC date is still today yet CET the actual date is already tomorrow
    public static DateOnly ContainingDay(DateTime utcInstant)
    {
        var utc = DateTime.SpecifyKind(utcInstant, DateTimeKind.Utc);
        return DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(utc, Cet));
    }
}
