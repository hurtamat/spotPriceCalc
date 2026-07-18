using spotPriceCalc.Domain;

namespace spotPriceCalc.Dtos;

/// <summary>What we send over the wire: raw EUR/MWh plus the consumer-facing ct/kWh (÷10).</summary>
public record SpotPriceDto(DateTime FromUtc, DateTime ToUtc, decimal EurPerMwh, decimal CtPerKwh)
{
    public static SpotPriceDto From(SpotPrice p) =>
        new(p.From, p.To, p.Price, p.Price / 10m);
}
