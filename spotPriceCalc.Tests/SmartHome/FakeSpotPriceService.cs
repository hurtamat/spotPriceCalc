using spotPriceCalc.Domain;
using spotPriceCalc.Services;

namespace spotPriceCalc.Tests.SmartHome;

// A stored curve, filtered exactly as SpotPriceService + SpotPriceRepository filter it: CET market-day
// bounds, then From in [fromUtc, toUtcExclusive). A fake that ignored the range couldn't catch a window bug.
internal sealed class FakeSpotPriceService : ISpotPriceService
{
    private readonly List<PricePoint> _points;

    public FakeSpotPriceService(IEnumerable<PricePoint> points) =>
        _points = points.OrderBy(p => p.From).ToList();

    // The range the last read asked for, so a test can assert the look-back is covered.
    public (DateOnly From, DateOnly To)? LastRangeRequested { get; private set; }

    public Task<ZoneSpotPrices> GetPricesAsync(
        int biddingZoneId, DateOnly from, DateOnly to, CancellationToken ct)
    {
        LastRangeRequested = (from, to);

        var fromUtc = MarketDay.WindowUtc(from).FromUtc;
        var toUtcExclusive = MarketDay.WindowUtc(to).ToUtcExclusive;

        return Task.FromResult(new ZoneSpotPrices
        {
            BiddingZoneId = biddingZoneId,
            Points = _points.Where(p => p.From >= fromUtc && p.From < toUtcExclusive).ToList(),
        });
    }

    public Task<ZoneSpotPrices> GetPricesAsync(int biddingZoneId, DateTime instant, CancellationToken ct)
    {
        var day = MarketDay.ContainingDay(instant);
        return GetPricesAsync(biddingZoneId, day, day, ct);
    }

    // The scheduler reads, never populates.
    public Task BackfillHistoryAsync(DateOnly from, DateOnly to, CancellationToken ct) =>
        throw new NotSupportedException("ScheduleService must not populate.");

    public Task<PopulateResult> PopulateAsync(DateOnly date, CancellationToken ct) =>
        throw new NotSupportedException("ScheduleService must not populate.");
}
