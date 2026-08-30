namespace spotPriceCalc.Domain;

// Where a slot's price sits in its zone's recent distribution — stamped at populate time from the
// calc-service cut-offs. Domain vocabulary, not a storage detail: the smart-home layer schedules on it.
//
// Stored as int, so the values are pinned: reordering or inserting a member must never reinterpret rows
// already in spot_prices. Append with the next number, don't renumber.
public enum PriceQuantile
{
    Green = 0,
    Yellow = 1,
    Red = 2
}
