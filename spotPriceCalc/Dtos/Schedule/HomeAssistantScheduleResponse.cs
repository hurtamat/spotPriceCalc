using System.Text.Json.Serialization;
using spotPriceCalc.Dtos;

namespace spotPriceCalc.Dtos.Schedule;

// Response of POST /api/homeassistant/schedule. The Shelly plan plus the price curve, in one payload:
// Home Assistant publishes price sensors too, so this saves it two round trips per refresh.
public record HomeAssistantScheduleResponse
{
    [JsonPropertyName("device_id")]
    public required string DeviceId { get; init; }

    [JsonPropertyName("zone_name")]
    public required string ZoneName { get; init; }

    // When the plan was computed, so the client can show its age.
    [JsonPropertyName("generated_at_utc")]
    public required DateTime GeneratedAtUtc { get; init; }

    [JsonPropertyName("tasks")]
    public required IReadOnlyList<TaskResult> Tasks { get; init; }
    
    // HA displays the whole curve
    [JsonPropertyName("curve")]
    public IReadOnlyList<PriceCurvePoint>? Curve { get; init; }
}

public record PriceCurvePoint
{
    [JsonPropertyName("start_utc")]
    public required DateTime StartUtc { get; init; }

    [JsonPropertyName("end_utc")]
    public required DateTime EndUtc { get; init; }

    [JsonPropertyName("eur_per_mwh")]
    public required decimal EurPerMwh { get; init; }

    // Null until classified during populate.
    [JsonPropertyName("level")]
    public PriceColor? Level { get; init; }
}
