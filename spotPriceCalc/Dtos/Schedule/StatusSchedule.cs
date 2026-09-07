using System.Text.Json.Serialization;

namespace spotPriceCalc.Dtos.Schedule;

// Query of GET /api/shelly/schedule/status. Keyed by zone code like ScheduleRequest, so a device
// never sends coordinates: the wizard resolves them once, at generation time, and bakes the code in.
public class StatusSchedule
{
    // ENTSO-E area code, e.g. "10YCZ-CEPS-----N".
    [JsonPropertyName("zone_code")]
    public required string ZoneCode { get; init; }

    [JsonPropertyName("dateTime")]
    public DateTime StatusTime { get; init; }
}
