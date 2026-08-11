using System.Text.Json.Serialization;

namespace spotPriceCalc.Dtos.PriceZones;

// Response of the calc-service POST /price-zones (request is a bare JSON array of prices).
// Threshold PRICES in EUR/MWh: below Lower = green, above Upper = red, between = yellow.
public record PriceZonesResponse
{
    [JsonPropertyName("lowerQuantile")]
    public decimal LowerQuantile { get; init; }

    [JsonPropertyName("upperQuantile")]
    public decimal UpperQuantile { get; init; }
}
