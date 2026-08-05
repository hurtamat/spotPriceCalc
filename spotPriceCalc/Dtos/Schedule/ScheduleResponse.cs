using System.Text.Json.Serialization;

namespace spotPriceCalc.Dtos.Schedule;

// Response of POST /api/schedule. Recomputed fresh on every poll (stateless); the device reads RelayState.
public record ScheduleResponse
{
    [JsonPropertyName("device_id")]
    public required string DeviceId { get; init; }

    [JsonPropertyName("bidding_zone_id")]
    public required int BiddingZoneId { get; init; }

    [JsonPropertyName("zone_name")]
    public required string ZoneName { get; init; }

    // The one actionable field: ON if ANY task is active this instant.
    [JsonPropertyName("relay_state")]
    public required bool RelayState { get; init; }

    [JsonPropertyName("now_utc")]
    public required DateTimeOffset NowUtc { get; init; }

    // Null if the relay stays as-is for the rest of the plan.
    [JsonPropertyName("next_toggle_utc")]
    public DateTimeOffset? NextToggleUtc { get; init; }

    [JsonPropertyName("tasks")]
    public required IReadOnlyList<TaskResult> Tasks { get; init; }
}

public record TaskResult
{
    [JsonPropertyName("task_id")]
    public required int TaskId { get; init; }

    // False ⇒ the task couldn't be placed (e.g. window too short).
    [JsonPropertyName("scheduled")]
    public required bool Scheduled { get; init; }

    [JsonPropertyName("hours")]
    public required IReadOnlyList<ScheduledHour> Hours { get; init; }
}

public record ScheduledHour
{
    [JsonPropertyName("start_utc")]
    public required DateTimeOffset StartUtc { get; init; }

    [JsonPropertyName("end_utc")]
    public required DateTimeOffset EndUtc { get; init; }

    [JsonPropertyName("eur_per_mwh")]
    public required decimal EurPerMwh { get; init; }
}
