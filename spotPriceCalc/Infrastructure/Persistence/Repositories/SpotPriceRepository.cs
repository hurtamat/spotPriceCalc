using Microsoft.EntityFrameworkCore;
using spotPriceCalc.Domain;
using spotPriceCalc.Infrastructure.Persistence.Entities;

namespace spotPriceCalc.Infrastructure.Persistence.Repositories;

public class SpotPriceRepository : ISpotPriceRepository
{
    private readonly AppDbContext _db;

    public SpotPriceRepository(AppDbContext db) => _db = db;

    public async Task<ZoneSpotPrices> GetAsync(int biddingZoneId, DateOnly from, DateOnly to, CancellationToken ct)
    {
        var (fromUtc, toUtcExclusive) = ToUtcWindow(from, to);

        var points = await _db.SpotPrices
            .Where(p => p.BiddingZoneId == biddingZoneId && p.From >= fromUtc && p.From < toUtcExclusive)
            .OrderBy(p => p.From)
            .Select(p => new PricePoint { From = p.From, To = p.To, Price = p.Price })
            .ToListAsync(ct);

        return new ZoneSpotPrices { BiddingZoneId = biddingZoneId, Points = points };
    }

    public Task<bool> HasAnyForDayAsync(int biddingZoneId, DateOnly date, CancellationToken ct)
    {
        var (fromUtc, toUtcExclusive) = ToUtcWindow(date, date);

        return _db.SpotPrices.AnyAsync(
            p => p.BiddingZoneId == biddingZoneId && p.From >= fromUtc && p.From < toUtcExclusive, ct);
    }

    public async Task SaveAsync(ZoneSpotPrices prices, CancellationToken ct)
    {
        if (prices.Points.Count == 0)
            return;

        // Skip slots already stored (unique index is BiddingZoneId + From), so re-saving a day is a no-op
        // rather than a duplicate-key error.
        var incomingStarts = prices.Points.Select(p => p.From).ToList();
        var existingStarts = await _db.SpotPrices
            .Where(p => p.BiddingZoneId == prices.BiddingZoneId && incomingStarts.Contains(p.From))
            .Select(p => p.From)
            .ToListAsync(ct);
        var existing = existingStarts.ToHashSet();

        var toInsert = prices.Points
            .Where(p => !existing.Contains(p.From))
            .Select(p => new SpotPriceEntity
            {
                BiddingZoneId = prices.BiddingZoneId,
                From = p.From,
                To = p.To,
                Price = p.Price,
            });

        _db.SpotPrices.AddRange(toInsert);
        await _db.SaveChangesAsync(ct);
    }

    private static (DateTime fromUtc, DateTime toUtcExclusive) ToUtcWindow(DateOnly from, DateOnly to) =>
        (from.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc),
            to.AddDays(1).ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc));
}
