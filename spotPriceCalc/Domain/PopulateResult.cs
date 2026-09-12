namespace spotPriceCalc.Services;


public record PopulateResult(
    DateOnly Date,
    int ZonesTotal,
    int Succeeded,
    int Skipped,
    int Failed,
    int Declined,
    int PointsSaved,
    IReadOnlyList<string> Failures);
