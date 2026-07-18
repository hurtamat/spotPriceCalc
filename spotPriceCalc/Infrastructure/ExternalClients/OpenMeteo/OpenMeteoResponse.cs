using System.Text.Json.Serialization;

namespace spotPriceCalc.Infrastructure.ExternalClients.OpenMeteo;

// Mirrors the Open-Meteo forecast JSON 1:1 — parallel arrays under "hourly". No logic.
public class OpenMeteoResponse
{
    [JsonPropertyName("hourly")]
    public OpenMeteoHourly Hourly { get; set; } = new();
}

public class OpenMeteoHourly
{
    [JsonPropertyName("time")]
    public List<string> Time { get; set; } = [];

    [JsonPropertyName("temperature_2m")]
    public List<decimal> Temperature2m { get; set; } = [];
}
