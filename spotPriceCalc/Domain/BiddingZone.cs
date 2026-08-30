namespace spotPriceCalc.Domain;

public class BiddingZone
{
    public int Id { get; set; }
    public required string Name { get; set; }

    // ENTSO-E EIC domain code. Sent as in_Domain/out_Domain.
    public required string Code { get; set; }
    
    public required string TimeZoneId { get; set; }

    // Approximate zone centre, for the weather query.
    public decimal Latitude { get; set; }
    public decimal Longitude { get; set; }
}