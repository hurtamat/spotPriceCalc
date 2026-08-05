namespace spotPriceCalc.Infrastructure.Persistence.Entities;

public class TemperatureReadingEntity
{
    public int Id { get; set; }
    public DateTime TimeUtc { get; set; }
    public decimal TemperatureC { get; set; }
    public int BiddingZoneId { get; set; }
}
