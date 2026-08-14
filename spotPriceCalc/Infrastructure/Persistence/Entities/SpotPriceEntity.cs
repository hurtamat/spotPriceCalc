using spotPriceCalc.Domain;

namespace spotPriceCalc.Infrastructure.Persistence.Entities;

public class SpotPriceEntity
{
    public int Id { get; set; }
    public DateTime From { get; set; }
    public DateTime To { get; set; }
    public decimal Price { get; set; }
    public int BiddingZoneId { get; set; }
    public PriceQuantile? Quantile { get; set; }
}
