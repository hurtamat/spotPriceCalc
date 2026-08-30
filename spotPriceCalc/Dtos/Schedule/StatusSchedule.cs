using System.Text.Json.Serialization;

namespace spotPriceCalc.Dtos.Schedule;

public class StatusSchedule
{
    [JsonPropertyName("lat")]
    public decimal Lat { get; init; }

    [JsonPropertyName("lon")]
    public decimal Lon { get; init; }
    
    [JsonPropertyName("dateTime")]
    public DateTime StatusTime  { get; init; }
}