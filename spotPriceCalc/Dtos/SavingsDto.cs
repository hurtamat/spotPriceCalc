namespace spotPriceCalc.Dtos;

// Response of GET /api/savings/appliances. kWh and cents per kWh throughout, never EUR/MWh.
public record ApplianceSavingsDto(
    string ZoneName,
    string TimeZoneId,
    decimal FixedPriceCtPerKwh,
    IReadOnlyList<AppliancePlanDto> Appliances);

// The three nullable fields are null together, when the cycle could not be placed.
public record AppliancePlanDto(
    string Key,
    string Name,
    decimal CycleKwh,
    decimal CycleHours,
    // "HH:mm" in the zone's own clock.
    string? StartLocal,
    decimal? GreenPriceCtPerKwh,
    decimal? SavingEur);
