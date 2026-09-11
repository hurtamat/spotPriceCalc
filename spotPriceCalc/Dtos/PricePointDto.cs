using spotPriceCalc.Domain;

namespace spotPriceCalc.Dtos;

public record PricePointDto(DateTime FromUtc, DateTime ToUtc, decimal EurPerMwh)
{
    public static PricePointDto From(PricePoint p) => new(p.From, p.To, p.Price);
}
