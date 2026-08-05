namespace spotPriceCalc.Services;

public record PopulateResult(
    DateOnly Date,
    int ZonesTotal,
    int Succeeded,
    int Skipped,
    int Failed,
    int PointsSaved,
    IReadOnlyList<string> Failures);
