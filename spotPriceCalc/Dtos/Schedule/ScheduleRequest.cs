using System.Text.Json.Serialization;

namespace spotPriceCalc.Dtos.Schedule;

// Body of POST /api/schedule. Device-agnostic; minimal request is a device id, coordinates, and one task.
public record ScheduleRequest
{
    [JsonPropertyName("device_id")]
    public required string DeviceId { get; init; }

    // Resolved to a bidding zone server-side.
    [JsonPropertyName("lat")]
    public decimal Lat { get; init; }

    [JsonPropertyName("lon")]
    public decimal Lon { get; init; }

    // Lower bound of the window. Null ⇒ deadline minus 24h.
    [JsonPropertyName("available_from")]
    public DateTimeOffset? AvailableFrom { get; init; }

    // Time-of-day only; may wrap past midnight (from > to).
    [JsonPropertyName("unavailable")]
    public UnavailableWindow? Unavailable { get; init; }

    [JsonPropertyName("tasks")]
    public required IReadOnlyList<TaskRequest> Tasks { get; init; }
}

public record UnavailableWindow
{
    [JsonPropertyName("from")]
    public TimeOnly From { get; init; }

    [JsonPropertyName("to")]
    public TimeOnly To { get; init; }
}

// One job. Only DurationHours is required; the rest default so a "just N cheap hours" request stays tiny.
public record TaskRequest
{
    [JsonPropertyName("task_id")]
    public required int TaskId { get; init; }

    [JsonPropertyName("duration_hours")]
    public double DurationHours { get; init; }

    // The anchor: deadline the task must finish by; the window is the 24h before it. Null ⇒ now + 24h.
    [JsonPropertyName("ready_by")]
    public DateTimeOffset? ReadyBy { get; init; }

    // true ⇒ hours run back-to-back (boiler, washer). false ⇒ split for the cheapest hours (EV charging).
    [JsonPropertyName("continuous_block")]
    public bool ContinuousBlock { get; init; }
}
