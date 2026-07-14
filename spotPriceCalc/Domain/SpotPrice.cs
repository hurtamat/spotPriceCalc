namespace spotPriceCalc.Domain;

public record SpotPrice
{
    public required DateTime From { get; set; }
    public required DateTime To { get; set; }
    public decimal Price  { get; set; }
    public int BiddingZoneId { get; set; }
}