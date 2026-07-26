using System.Text.Json.Serialization;

namespace spotPriceCalc.Dtos.Schedule;

/// <summary>Response of POST /api/schedule. Recomputed fresh on every poll (stateless) — the device polls
/// this and reads <see cref="RelayState"/> for what to do right now.</summary>
public record ScheduleResponse
{
    [JsonPropertyName("device_id")]
    public required string DeviceId { get; init; }

    [JsonPropertyName("bidding_zone_id")]
    public required int BiddingZoneId { get; init; }

    [JsonPropertyName("zone_name")]
    public required string ZoneName { get; init; }

    /// <summary>Should the relay be ON right now? True if ANY task is active this instant.</summary>
    [JsonPropertyName("relay_state")]
    public required bool RelayState { get; init; }

    /// <summary>Evaluation instant (UTC). TODO(timezone): convert to the device's local time at the edge.</summary>
    [JsonPropertyName("now_utc")]
    public required DateTimeOffset NowUtc { get; init; }

    /// <summary>When the relay is next expected to flip (UTC), or null if it stays as-is for the rest of the plan.</summary>
    [JsonPropertyName("next_toggle_utc")]
    public DateTimeOffset? NextToggleUtc { get; init; }

    [JsonPropertyName("tasks")]
    public required IReadOnlyList<TaskResult> Tasks { get; init; }
}

/// <summary>Per-task outcome.</summary>
public record TaskResult
{
    [JsonPropertyName("task_id")]
    public required int TaskId { get; init; }

    /// <summary>False ⇒ the task could not be placed (e.g. the window was too short).</summary>
    [JsonPropertyName("scheduled")]
    public required bool Scheduled { get; init; }

    /// <summary>The chosen hours (UTC, sorted by time).</summary>
    [JsonPropertyName("hours")]
    public required IReadOnlyList<ScheduledHour> Hours { get; init; }
}

/// <summary>One scheduled slot in UTC.</summary>
public record ScheduledHour
{
    [JsonPropertyName("start_utc")]
    public required DateTimeOffset StartUtc { get; init; }

    [JsonPropertyName("end_utc")]
    public required DateTimeOffset EndUtc { get; init; }

    [JsonPropertyName("eur_per_mwh")]
    public required decimal EurPerMwh { get; init; }
}
