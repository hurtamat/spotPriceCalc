using System.Text.Json.Serialization;

namespace spotPriceCalc.Dtos.Schedule;

/// <summary>A Shelly's job: like ScheduleRequest, but the deadline may be a local wall clock.</summary>
// mJS has no timezone database, so the device cannot resolve one itself, and a UTC hour baked in by the
// wizard would drift at every DST switch. Home Assistant converts at its own edge and still sends
// ready_by_utc, so this stays off the shared request.
public record ShellyScheduleRequest : ScheduleRequest
{
    // Wall clock in the bidding zone's local time, e.g. "06:00:00". Ignored when ready_by_utc is given.
    [JsonPropertyName("ready_by_local")]
    public TimeOnly? ReadyByLocal { get; init; }
}
