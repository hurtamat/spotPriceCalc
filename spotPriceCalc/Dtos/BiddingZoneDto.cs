using System.Text.Json.Serialization;

namespace spotPriceCalc.Dtos;

// One zone as a client needs it: the code to send back, a name to show, and the timezone its hours are in.
public record BiddingZoneDto
{
    [JsonPropertyName("code")]
    public required string Code { get; init; }

    [JsonPropertyName("name")]
    public required string Name { get; init; }

    // IANA id, e.g. "Europe/Prague". Display-only, like BiddingZone.TimeZoneId itself: the setup wizard
    // tells the user which clock the hours they pick belong to. Never use it to build a market window —
    // that is always CET (see MarketDay).
    [JsonPropertyName("time_zone_id")]
    public required string TimeZoneId { get; init; }
}
