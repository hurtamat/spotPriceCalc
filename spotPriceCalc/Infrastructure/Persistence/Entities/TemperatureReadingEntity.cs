namespace spotPriceCalc.Infrastructure.Persistence.Entities;

/// <summary>EF storage row: one hourly temperature with its zone id. Reads group these rows back into a
/// <see cref="Domain.ZoneTemperatures"/> aggregate; writes flatten the aggregate to rows.</summary>
public class TemperatureReadingEntity
{
    public int Id { get; set; }
    public DateTime TimeUtc { get; set; }
    public decimal TemperatureC { get; set; }
    public int BiddingZoneId { get; set; }
}
