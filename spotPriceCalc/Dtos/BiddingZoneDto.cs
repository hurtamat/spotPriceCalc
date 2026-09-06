using System.Text.Json.Serialization;

namespace spotPriceCalc.Dtos;

// One zone as a client needs it: the code to send back, and a name to show.
public record BiddingZoneDto
{
    [JsonPropertyName("code")]
    public required string Code { get; init; }

    [JsonPropertyName("name")]
    public required string Name { get; init; }
}
