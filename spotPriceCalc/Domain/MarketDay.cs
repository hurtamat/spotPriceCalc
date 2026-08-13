namespace spotPriceCalc.Domain;

// The day-ahead *market* day. ENTSO-E publishes A44 prices per CET/CEST calendar day for EVERY bidding
// zone — verified live: every Period comes back bounded at 22:00Z (summer) / 23:00Z (winter), for Greece
// and Finland (UTC+3 local) and Ireland (UTC+1 local) exactly as for Germany. Market time in SDAC is CET,
// never the zone's own local time.
//
// This is deliberately NOT per zone. Using a zone's local day made the requested window straddle two CET
// publication days for the 9 non-CET zones (GR/BG/RO/FI/EE/LV/LT one hour ahead, PT/IE one hour behind),
// which made ENTSO-E return two days as two separate TimeSeries and the wrong one get stored.
public static class MarketDay
{
    // Any CET/CEST zone works; Berlin is the canonical one. TimeZoneInfo handles the DST switch, so the
    // window is 22:00Z in summer and 23:00Z in winter automatically, and the transition days are 23h/25h
    // long — matching what ENTSO-E actually publishes.
    private static readonly TimeZoneInfo Cet = TimeZoneInfo.FindSystemTimeZoneById("Europe/Berlin");

    // Half-open UTC window [FromUtc, ToUtcExclusive) for the CET delivery day. The single source the
    // ENTSO-E query, the read path, and the already-populated check all share.
    public static (DateTime FromUtc, DateTime ToUtcExclusive) WindowUtc(DateOnly date)
    {
        // Midnight is never inside a DST transition (they happen at 02:00/03:00 local), so the local
        // start/end are always unambiguous and ConvertTimeToUtc can't throw here.
        var localStart = DateTime.SpecifyKind(date.ToDateTime(TimeOnly.MinValue), DateTimeKind.Unspecified);
        var localEnd = localStart.AddDays(1);
        return (TimeZoneInfo.ConvertTimeToUtc(localStart, Cet), TimeZoneInfo.ConvertTimeToUtc(localEnd, Cet));
    }
}
