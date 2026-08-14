namespace spotPriceCalc.Services;

// Failed counts only retryable problems (timeouts, gateway errors) — it's what drives the retry loop.
// Declined counts zones ENTSO-E explicitly has no data for; retrying those changes nothing.
public record PopulateResult(
    DateOnly Date,
    int ZonesTotal,
    int Succeeded,
    int Skipped,
    int Failed,
    int Declined,
    int PointsSaved,
    IReadOnlyList<string> Failures);
