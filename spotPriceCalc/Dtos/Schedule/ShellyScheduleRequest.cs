using System.Text.Json.Serialization;

namespace spotPriceCalc.Dtos.Schedule;

/// <summary>
/// The Shelly flavour of <see cref="ScheduleRequest"/>: the same job, but the deadline may arrive as a
/// local wall clock instead of an instant.
/// </summary>
/// <remarks>
/// A Shelly runs mJS with no timezone database and a few KB of heap, so it cannot turn "06:00 local" into
/// an instant — and a UTC hour baked in by the setup wizard would silently drift an hour at every DST
/// switch. So the device sends the wall clock it was configured with, and the controller resolves it per
/// request against the bidding zone's own IANA timezone — which the zone catalog already carries, so no
/// timezone travels on the wire. The device re-fetches daily, so the answer is always current.
///
/// This lives on the Shelly request, not on <see cref="ScheduleRequest"/>: Home Assistant converts
/// properly at its own edge and keeps sending <c>ready_by_utc</c>. The shared scheduler still only ever
/// sees an instant.
/// </remarks>
public record ShellyScheduleRequest : ScheduleRequest
{
    // Wall clock in the bidding zone's local time, e.g. "06:00:00". Ignored when ready_by_utc is given.
    [JsonPropertyName("ready_by_local")]
    public TimeOnly? ReadyByLocal { get; init; }
}
