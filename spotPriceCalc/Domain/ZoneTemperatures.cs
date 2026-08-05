namespace spotPriceCalc.Domain;

public record ZoneTemperatures
{
    public required int BiddingZoneId { get; set; }
    public required IReadOnlyList<TemperaturePoint> Points { get; set; }
}

public record TemperaturePoint
{
    public required DateTime TimeUtc { get; set; }
    public decimal TemperatureC { get; set; }
}
