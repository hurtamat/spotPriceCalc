namespace spotPriceCalc.Domain;

// Cheapest and dearest slot across every zone for one market day, in raw EUR/MWh.
public record PriceRange(decimal Min, decimal Max);
