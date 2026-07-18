namespace spotPriceCalc.Domain;

public class BiddingZone
{
    public int Id { get; set; }
    public required string Name { get; set; }

    /// <summary>ENTSO-E EIC domain code, e.g. "10YAT-APG------L". Sent as in_Domain/out_Domain.</summary>
    public required string Code { get; set; }

    /// <summary>IANA timezone, e.g. "Europe/Vienna". Used to map the delivery day to a UTC query window
    /// and to convert price slots to local time.</summary>
    public required string TimeZoneId { get; set; }
}