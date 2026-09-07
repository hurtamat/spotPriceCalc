using System.Text.Json.Serialization;

namespace spotPriceCalc.Dtos.Schedule;

/// <summary>
/// The Shelly flavour of <see cref="ScheduleResponse"/>: the same blocks, plus the two ready-made display
/// strings the device shows on its "Charging today / tomorrow" labels.
/// </summary>
/// <remarks>
/// The blocks themselves stay UTC, because that is what the relay compares against. But the labels are read
/// by a person, and mJS has no timezone database, so the device cannot render them in local time — the same
/// reason the deadline arrives as a wall clock. Formatting them here costs one string each and saves the
/// device both the conversion it cannot do and the formatting code it has no room for.
/// </remarks>
public record ShellyScheduleResponse : ScheduleResponse
{
    // e.g. "01:00-04:00, 22:00-23:00", or "—" when nothing runs that day. Zone-local.
    [JsonPropertyName("today_local")]
    public required string TodayLocal { get; init; }

    [JsonPropertyName("tomorrow_local")]
    public required string TomorrowLocal { get; init; }
}
