using Microsoft.EntityFrameworkCore;
using spotPriceCalc.Domain;
using spotPriceCalc.Infrastructure.Persistence.Entities;

namespace spotPriceCalc.Infrastructure.Persistence.Repositories;

public class WeatherRepository : IWeatherRepository
{
    private readonly AppDbContext _db;

    public WeatherRepository(AppDbContext db) => _db = db;

    public async Task<ZoneTemperatures> GetAsync(int biddingZoneId, DateOnly from, DateOnly to, CancellationToken ct)
    {
        var (fromUtc, toUtcExclusive) = ToUtcWindow(from, to);

        var points = await _db.TemperatureReadings
            .Where(t => t.BiddingZoneId == biddingZoneId && t.TimeUtc >= fromUtc && t.TimeUtc < toUtcExclusive)
            .OrderBy(t => t.TimeUtc)
            .Select(t => new TemperaturePoint { TimeUtc = t.TimeUtc, TemperatureC = t.TemperatureC })
            .ToListAsync(ct);

        return new ZoneTemperatures { BiddingZoneId = biddingZoneId, Points = points };
    }

    public async Task SaveAsync(ZoneTemperatures temperatures, CancellationToken ct)
    {
        if (temperatures.Points.Count == 0)
            return;

        // Skip readings already stored (unique index is BiddingZoneId + TimeUtc) so re-saving is a no-op.
        var incomingTimes = temperatures.Points.Select(p => p.TimeUtc).ToList();
        var existingTimes = await _db.TemperatureReadings
            .Where(t => t.BiddingZoneId == temperatures.BiddingZoneId && incomingTimes.Contains(t.TimeUtc))
            .Select(t => t.TimeUtc)
            .ToListAsync(ct);
        var existing = existingTimes.ToHashSet();

        var toInsert = temperatures.Points
            .Where(p => !existing.Contains(p.TimeUtc))
            .Select(p => new TemperatureReadingEntity
            {
                BiddingZoneId = temperatures.BiddingZoneId,
                TimeUtc = p.TimeUtc,
                TemperatureC = p.TemperatureC,
            });

        _db.TemperatureReadings.AddRange(toInsert);
        await _db.SaveChangesAsync(ct);
    }

    private static (DateTime fromUtc, DateTime toUtcExclusive) ToUtcWindow(DateOnly from, DateOnly to) =>
        (from.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc),
            to.AddDays(1).ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc));
}
