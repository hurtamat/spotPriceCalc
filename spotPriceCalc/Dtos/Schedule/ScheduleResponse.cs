using System.Text.Json.Serialization;

namespace spotPriceCalc.Dtos.Schedule;

// Response of POST /api/schedule. The device stores the blocks and runs its relay locally.
public record ScheduleResponse
{
    [JsonPropertyName("device_id")]
    public required string DeviceId { get; init; }

    [JsonPropertyName("zone_name")]
    public required string ZoneName { get; init; }

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

    // Chosen run-time as merged continuous blocks (UTC, sorted).
    [JsonPropertyName("blocks")]
    public required IReadOnlyList<ScheduledBlock> Blocks { get; init; }
}

public record ScheduledBlock
{
    [JsonPropertyName("start_utc")]
    public required DateTimeOffset StartUtc { get; init; }

    [JsonPropertyName("end_utc")]
    public required DateTimeOffset EndUtc { get; init; }

    // Duration-weighted average price across the block.
    [JsonPropertyName("eur_per_mwh")]
    public required decimal EurPerMwh { get; init; }
}
