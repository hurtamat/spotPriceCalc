namespace spotPriceCalc.Infrastructure.Persistence.Entities;

/// <summary>EF storage row: one price slot with its zone id. Denormalized on purpose — reads group these
/// rows back into a <see cref="Domain.ZoneSpotPrices"/> aggregate; writes flatten the aggregate to rows.</summary>
public class SpotPriceEntity
{
    public int Id { get; set; }
    public DateTime From { get; set; }
    public DateTime To { get; set; }
    public decimal Price { get; set; }
    public int BiddingZoneId { get; set; }
}
