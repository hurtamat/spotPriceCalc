namespace spotPriceCalc.Domain;

/// <summary>A day's price curve for one bidding zone. The zone id is held once here, not per point.</summary>
public record ZoneSpotPrices
{
    public required int BiddingZoneId { get; set; }
    public required IReadOnlyList<PricePoint> Points { get; set; }
}

/// <summary>One price slot (zone-agnostic). EUR/MWh, raw.</summary>
public record PricePoint
{
    public required DateTime From { get; set; }
    public required DateTime To { get; set; }
    public decimal Price { get; set; }
}
