namespace spotPriceCalc.Domain;

// Where a slot's price sits in its zone's recent distribution, stamped at populate time.
// Stored as int, so the values are pinned: append with the next number, don't renumber.
public enum PriceQuantile
{
    Green = 0,
    Yellow = 1,
    Red = 2
}
