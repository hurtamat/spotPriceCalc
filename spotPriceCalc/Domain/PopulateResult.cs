namespace spotPriceCalc.Services;

// Failed counts only retryable problems and drives the retry loop; Declined never retries.
public record PopulateResult(
    DateOnly Date,
    int ZonesTotal,
    int Succeeded,
    int Skipped,
    int Failed,
    int Declined,
    int PointsSaved,
    IReadOnlyList<string> Failures);
