using spotPriceCalc.Dtos.Schedule;

namespace spotPriceCalc.Controllers;

/// <summary>
/// Turns the Shelly's local wall clock into the UTC instants the scheduler works in.
/// </summary>
/// <remarks>
/// Deliberately not in Services/SmartHome: the shared <c>ScheduleService</c> is UTC-in, UTC-out for every
/// integration, and only the Shelly path needs this. Keeping it beside the controller keeps the seam honest.
/// </remarks>
public static class ShellyLocalTime
{
    /// <summary>
    /// The request with <c>ReadyByUtc</c> and <c>Unavailable</c> resolved from local time, or unchanged
    /// when the device sent an instant. <paramref name="ianaTimeZoneId"/> is the bidding zone's own
    /// timezone, from the zone catalog.
    /// </summary>
    public static ScheduleRequest Resolve(
        ShellyScheduleRequest request, string ianaTimeZoneId, DateTime? nowUtc = null)
    {
        if (request.ReadyByUtc is not null && request.Unavailable is null)
            return request;

        var tz = TimeZoneInfo.FindSystemTimeZoneById(ianaTimeZoneId);
        var now = DateTime.SpecifyKind(nowUtc ?? DateTime.UtcNow, DateTimeKind.Utc);

        // An explicit instant always wins; the local clock is the fallback for devices that cannot convert.
        var deadline = request.ReadyByUtc is null && request.ReadyByLocal is { } local
            ? NextLocalTimeUtc(local, tz, now)
            : request.ReadyByUtc;

        return request with
        {
            ReadyByUtc = deadline,
            Unavailable = ToUtcWindow(request.Unavailable, tz, deadline ?? now),
        };
    }

    /// <summary>The next future occurrence of a wall clock in <paramref name="tz"/>, as UTC.</summary>
    private static DateTime NextLocalTimeUtc(TimeOnly local, TimeZoneInfo tz, DateTime nowUtc)
    {
        var nowLocal = TimeZoneInfo.ConvertTimeFromUtc(nowUtc, tz);
        var date = DateOnly.FromDateTime(nowLocal);
        if (local <= TimeOnly.FromDateTime(nowLocal))
            date = date.AddDays(1);

        return ToUtc(date.ToDateTime(local), tz);
    }

    /// <summary>
    /// The do-not-run window shifted from local time-of-day to UTC, so it means the same hours the user
    /// picked. The scheduler matches it against UTC slots, so an unshifted window would be wrong by the
    /// zone's offset.
    /// </summary>
    /// <remarks>
    /// One offset is used for the whole window, taken at the deadline. A window that straddles a DST switch
    /// is therefore an hour out on that one day — the same compromise a wall-clock timer makes.
    /// </remarks>
    private static UnavailableWindow? ToUtcWindow(UnavailableWindow? window, TimeZoneInfo tz, DateTime atUtc)
    {
        if (window is null)
            return null;

        var offset = tz.GetUtcOffset(atUtc);
        return new UnavailableWindow
        {
            From = window.From.Add(-offset),
            To = window.To.Add(-offset),
        };
    }

    /// <summary>
    /// The blocks falling on one local calendar day, as "HH:mm-HH:mm" joined by commas, or "—" when the
    /// day has none. A block is listed on the day it starts.
    /// </summary>
    public static string FormatLocalDay(
        IEnumerable<ScheduledBlock> blocks, string ianaTimeZoneId, int daysFromToday, DateTime? nowUtc = null)
    {
        var tz = TimeZoneInfo.FindSystemTimeZoneById(ianaTimeZoneId);
        var now = DateTime.SpecifyKind(nowUtc ?? DateTime.UtcNow, DateTimeKind.Utc);
        var day = DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(now, tz)).AddDays(daysFromToday);

        var parts = blocks
            .Select(b => (
                Start: TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(b.StartUtc, DateTimeKind.Utc), tz),
                End: TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(b.EndUtc, DateTimeKind.Utc), tz)))
            .Where(b => DateOnly.FromDateTime(b.Start) == day)
            .OrderBy(b => b.Start)
            .Select(b => $"{b.Start:HH:mm}-{b.End:HH:mm}")
            .ToList();

        return parts.Count > 0 ? string.Join(", ", parts) : "—";
    }

    /// <summary>
    /// Local to UTC, tolerating the two hours a year that a wall clock is not a single instant: the spring
    /// gap has no such local time (jump forward past it) and the autumn overlap has two (take the first).
    /// </summary>
    private static DateTime ToUtc(DateTime localTime, TimeZoneInfo tz)
    {
        var unspecified = DateTime.SpecifyKind(localTime, DateTimeKind.Unspecified);

        if (tz.IsInvalidTime(unspecified))
            unspecified = unspecified.AddHours(1);

        return tz.IsAmbiguousTime(unspecified)
            ? unspecified - tz.GetAmbiguousTimeOffsets(unspecified).Max()
            : TimeZoneInfo.ConvertTimeToUtc(unspecified, tz);
    }
}
