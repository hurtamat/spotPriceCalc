using System.Text.Json.Serialization;

namespace spotPriceCalc.Dtos.Schedule;

/// <summary>What a Shelly gets back: run windows as bare pairs, plus the text for its two labels.</summary>
// Not a ScheduleResponse: that carries per-block objects with a price the device reads and discards, and
// an ~8 KB script heap pays for every byte twice — response buffer, then parsed graph.
public record ShellyScheduleResponse
{
    [JsonPropertyName("device_id")]
    public required string DeviceId { get; init; }

    // False ⇒ the job could not be placed; slots is then empty.
    [JsonPropertyName("scheduled")]
    public required bool Scheduled { get; init; }

    // Run windows as [start, end] pairs, UTC, sorted.
    [JsonPropertyName("slots")]
    public required IReadOnlyList<string[]> Slots { get; init; }

    // e.g. "01:00-04:00, 22:00-23:00", or "—" when nothing runs that day. Zone-local, for the labels.
    [JsonPropertyName("today_local")]
    public required string TodayLocal { get; init; }

    [JsonPropertyName("tomorrow_local")]
    public required string TomorrowLocal { get; init; }

    // Always yyyy-MM-ddTHH:mm:ssZ. The device compares these as plain strings, which only works while the
    // form is fixed-width — so the format is a contract, not a serialisation detail.
    public static string[] ToPair(ScheduledBlock block) =>
    [
        block.StartUtc.ToString("yyyy-MM-ddTHH:mm:ss'Z'"),
        block.EndUtc.ToString("yyyy-MM-ddTHH:mm:ss'Z'"),
    ];
}
