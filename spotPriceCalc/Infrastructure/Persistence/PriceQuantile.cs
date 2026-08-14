namespace spotPriceCalc.Infrastructure.Persistence;

// Stored as int, so the values are pinned: reordering or inserting a member must never reinterpret
// rows already in spot_prices. Append with the next number, don't renumber.
public enum PriceQuantile
{
    Green = 0,
    Yellow = 1,
    Red = 2
}
