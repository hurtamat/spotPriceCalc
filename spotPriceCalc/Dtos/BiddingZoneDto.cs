using System.Text.Json.Serialization;

namespace spotPriceCalc.Dtos;

// One zone as a client needs it: the code to send back, a name to show, and the timezone its hours are in.
public record BiddingZoneDto
{
    [JsonPropertyName("code")]
    public required string Code { get; init; }

    [JsonPropertyName("name")]
    public required string Name { get; init; }

    // IANA id, e.g. "Europe/Prague". Display-only — never build a market window from it, that is CET.
    [JsonPropertyName("time_zone_id")]
    public required string TimeZoneId { get; init; }
}
