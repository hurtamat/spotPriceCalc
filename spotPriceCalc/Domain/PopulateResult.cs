namespace spotPriceCalc.Services;

/// <summary>Summary of a populate run across all bidding zones. One zone failing (e.g. no data yet) does
/// not abort the rest — failures are collected here so the caller sees what went wrong.</summary>
public record PopulateResult(
    DateOnly Date,
    int ZonesTotal,
    int Succeeded,
    int Skipped,
    int Failed,
    int PointsSaved,
    IReadOnlyList<string> Failures);
