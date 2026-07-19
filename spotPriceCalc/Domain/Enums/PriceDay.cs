namespace spotPriceCalc.Services;

/// <summary>Which delivery day to populate. Today is the default; Tomorrow is what you'd trigger once the
/// day-ahead auction results are published (~13:00 CET). Bound from the query string, e.g. ?day=tomorrow.</summary>
public enum PriceDay
{
    Today = 0,
    Tomorrow = 1,
}
