using System.Text.Json.Serialization;

namespace spotPriceCalc.Dtos.Schedule;

// Response of POST /api/shelly/schedule. The device stores the blocks and runs its relay locally.
public record ScheduleResponse
{
    [JsonPropertyName("device_id")]
    public required string DeviceId { get; init; }

    [JsonPropertyName("zone_name")]
    public required string ZoneName { get; init; }

    // False ⇒ the job could not be placed.
    [JsonPropertyName("scheduled")]
    public required bool Scheduled { get; init; }

    // Chosen run-time as merged continuous blocks (UTC, sorted).
    [JsonPropertyName("blocks")]
    public required IReadOnlyList<ScheduledBlock> Blocks { get; init; }
}

public record ScheduledBlock
{
    // UTC DateTime (Kind=Utc) so it serialises as "...Z" with no offset.
    [JsonPropertyName("start_utc")]
    public required DateTime StartUtc { get; init; }

    [JsonPropertyName("end_utc")]
    public required DateTime EndUtc { get; init; }

    // Duration-weighted average price across the block.
    [JsonPropertyName("eur_per_mwh")]
    public required decimal EurPerMwh { get; init; }
}
