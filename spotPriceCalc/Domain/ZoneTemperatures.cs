namespace spotPriceCalc.Domain;

/// <summary>A day's temperature curve for one bidding zone. Zone id held once (parallels <see cref="ZoneSpotPrices"/>).</summary>
public record ZoneTemperatures
{
    public required int BiddingZoneId { get; set; }
    public required IReadOnlyList<TemperaturePoint> Points { get; set; }
}

/// <summary>One hourly temperature reading (zone-agnostic).</summary>
public record TemperaturePoint
{
    public required DateTime TimeUtc { get; set; }
    public decimal TemperatureC { get; set; }
}
