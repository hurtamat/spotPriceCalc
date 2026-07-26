using System.Text.Json.Serialization;

namespace spotPriceCalc.Dtos.Schedule;

/// <summary>Body of POST /api/schedule. Device-agnostic: any thin client (Shelly, Home Assistant, …) sends
/// this same shape. The minimal valid request is a device id, coordinates, and one task with a duration.</summary>
public record ScheduleRequest
{
    [JsonPropertyName("device_id")]
    public required string DeviceId { get; init; }

    /// <summary>GPS — resolved to a bidding zone server-side (see IZoneLocatorService). Decimal to match the
    /// exact-value lat/lng convention used everywhere else (seed data, DB numeric columns).</summary>
    [JsonPropertyName("lat")]
    public decimal Lat { get; init; }

    [JsonPropertyName("lon")]
    public decimal Lon { get; init; }

    /// <summary>Earliest the appliance may draw power (e.g. when it was plugged in) — the lower bound of the
    /// eligible window. Null ⇒ default to the task's deadline minus 24h (see TaskRequest.ReadyBy).</summary>
    [JsonPropertyName("available_from")]
    public DateTimeOffset? AvailableFrom { get; init; }

    /// <summary>Optional single "do not run" window, time-of-day only (no date — it applies to whatever day
    /// falls before the anchor). E.g. 07:00:00–09:00:00 to keep the boiler quiet in the morning. May wrap
    /// past midnight (from &gt; to). TODO(timezone): times are UTC for now.</summary>
    [JsonPropertyName("unavailable")]
    public UnavailableWindow? Unavailable { get; init; }

    /// <summary>The jobs to schedule. Most requests carry exactly one.</summary>
    [JsonPropertyName("tasks")]
    public required IReadOnlyList<TaskRequest> Tasks { get; init; }
}

/// <summary>A time-of-day range to exclude from scheduling. Times are "HH:mm:ss" (e.g. "07:00:00").</summary>
public record UnavailableWindow
{
    [JsonPropertyName("from")]
    public TimeOnly From { get; init; }

    [JsonPropertyName("to")]
    public TimeOnly To { get; init; }
}

/// <summary>One job. Only <see cref="DurationHours"/> is really required — the rest sensibly default so a
/// "I just need N cheap hours" request stays tiny.</summary>
public record TaskRequest
{
    /// <summary>Caller's id for the job. The device script always supplies this.</summary>
    [JsonPropertyName("task_id")]
    public required int TaskId { get; init; }

    /// <summary>Total hours of power the task needs.</summary>
    [JsonPropertyName("duration_hours")]
    public double DurationHours { get; init; }

    /// <summary>The anchor: strict deadline by which this task must finish. The eligible window is the 24h
    /// before it (or from available_from, if given). Null ⇒ default to now + 24h.</summary>
    [JsonPropertyName("ready_by")]
    public DateTimeOffset? ReadyBy { get; init; }

    /// <summary>true ⇒ the hours must run back-to-back (boiler, washer). false (default) ⇒ split for the
    /// absolute cheapest hours (EV charging, the "don't care" case).</summary>
    [JsonPropertyName("continuous_block")]
    public bool ContinuousBlock { get; init; }
}
