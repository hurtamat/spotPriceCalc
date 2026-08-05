namespace spotPriceCalc.Domain;

public record ZoneSpotPrices
{
    public required int BiddingZoneId { get; set; }
    public required IReadOnlyList<PricePoint> Points { get; set; }
}

// Price is raw EUR/MWh.
public record PricePoint
{
    public required DateTime From { get; set; }
    public required DateTime To { get; set; }
    public decimal Price { get; set; }
}
