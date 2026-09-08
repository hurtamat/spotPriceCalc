using spotPriceCalc.Dtos.Schedule;

namespace spotPriceCalc.Controllers;

/// <summary>Turns the Shelly's local wall clock into the UTC instants the scheduler works in.</summary>
// Not in Services/SmartHome on purpose: ScheduleService is UTC-in/UTC-out for every integration.
public static class ShellyLocalTime
{
    /// <summary>The request with ReadyByUtc and Unavailable resolved against the zone's timezone.</summary>
    public static ScheduleRequest Resolve(
        ShellyScheduleRequest request, string ianaTimeZoneId, DateTime nowUtc)
    {
        if (request.ReadyByUtc is not null && request.Unavailable is null)
            return request;

        var tz = TimeZoneInfo.FindSystemTimeZoneById(ianaTimeZoneId);
        var now = DateTime.SpecifyKind(nowUtc, DateTimeKind.Utc);

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

    /// <summary>The do-not-run window shifted from local time-of-day to UTC, as the scheduler matches it.</summary>
    // One offset for the whole window, taken at the deadline: a window straddling a DST switch is an hour
    // out that day, the same compromise a wall-clock timer makes.
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

    /// <summary>One local day's blocks as "HH:mm-HH:mm, …", or "—". A block lands on the day it starts.</summary>
    public static string FormatLocalDay(
        IEnumerable<ScheduledBlock> blocks, string ianaTimeZoneId, int daysFromToday, DateTime nowUtc)
    {
        var tz = TimeZoneInfo.FindSystemTimeZoneById(ianaTimeZoneId);
        var now = DateTime.SpecifyKind(nowUtc, DateTimeKind.Utc);
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

    /// <summary>Local to UTC, tolerating the spring gap (jump past it) and the autumn overlap (take the first).</summary>
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
