using Microsoft.EntityFrameworkCore;
using spotPriceCalc.Domain;
using spotPriceCalc.Infrastructure.Persistence.Entities;

namespace spotPriceCalc.Infrastructure.Persistence.Repositories;

public class SpotPriceRepository : ISpotPriceRepository
{
    private readonly AppDbContext _db;

    public SpotPriceRepository(AppDbContext db) => _db = db;

    public async Task<ZoneSpotPrices> GetAsync(int biddingZoneId, DateTime fromUtc, DateTime toUtcExclusive, CancellationToken ct)
    {
        var points = await _db.SpotPrices
            .Where(p => p.BiddingZoneId == biddingZoneId && p.From >= fromUtc && p.From < toUtcExclusive)
            .OrderBy(p => p.From)
            .Select(p => new PricePoint { From = p.From, To = p.To, Price = p.Price, Quantile = p.Quantile })
            .ToListAsync(ct);

        return new ZoneSpotPrices { BiddingZoneId = biddingZoneId, Points = points };
    }

    // Minimum stored slots for a day to count as populated more than where CET is +2 with 15min slots so 8. It's a rough assumption.
    private const int MinSlotsForDay = 12;

    public async Task<bool> HasDayAsync(int biddingZoneId, DateTime fromUtc, DateTime toUtcExclusive, CancellationToken ct)
    {
        var count = await _db.SpotPrices.CountAsync(
            p => p.BiddingZoneId == biddingZoneId && p.From >= fromUtc && p.From < toUtcExclusive, ct);

        return count >= MinSlotsForDay;
    }

    public async Task SaveAsync(ZoneSpotPrices prices, CancellationToken ct)
    {
        if (prices.Points.Count == 0)
            return;

        // Skip slots already stored, so re-saving a day is a no-op rather than a duplicate-key error.
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

    public async Task SetQuantilesAsync(int biddingZoneId, DateTime fromUtc, DateTime toUtcExclusive,
        decimal lower, decimal upper, CancellationToken ct)
    {
        var rows = await _db.SpotPrices
            .Where(p => p.BiddingZoneId == biddingZoneId && p.From >= fromUtc && p.From < toUtcExclusive)
            .ToListAsync(ct);

        foreach (var row in rows)
            row.Quantile = row.Price < lower ? PriceQuantile.Green
                : row.Price > upper ? PriceQuantile.Red
                : PriceQuantile.Yellow;

        await _db.SaveChangesAsync(ct);
    }
}
