using System.Text.Json.Serialization;

namespace spotPriceCalc.Dtos.Schedule;

// Body of POST /api/schedule. Device-agnostic; minimal request is a device id, coordinates, and one task.
public record ScheduleRequest
{
    [JsonPropertyName("device_id")]
    public required string DeviceId { get; init; }
    
    [JsonPropertyName("lat")]
    public decimal Lat { get; init; }

    [JsonPropertyName("lon")]
    public decimal Lon { get; init; }

    // The day to schedule for. The window is this whole day, or the 24h before a task's ready_by.
    [JsonPropertyName("date")]
    public required DateOnly Date { get; init; }

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

    // Deadline time-of-day (UTC) the task must finish by; the window is the 24h before it on `date`.
    // Null ⇒ the whole of `date`.
    [JsonPropertyName("ready_by")]
    public TimeOnly? ReadyBy { get; init; }

    // true ⇒ hours run back-to-back (boiler, washer). false ⇒ split for the cheapest hours (EV charging).
    [JsonPropertyName("continuous_block")]
    public bool ContinuousBlock { get; init; }
}
