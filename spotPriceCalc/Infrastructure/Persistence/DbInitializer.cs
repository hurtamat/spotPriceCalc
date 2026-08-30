using Microsoft.EntityFrameworkCore;
using spotPriceCalc.Domain;

namespace spotPriceCalc.Infrastructure.Persistence;

public static class DbInitializer
{
    // Startup: apply pending migrations, then seed bidding_zones from the code source of truth.
    public static async Task InitializeAsync(IServiceProvider services, CancellationToken ct = default)
    {
        await using var scope = services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await db.Database.MigrateAsync(ct);
        await SeedBiddingZonesAsync(db, ct);
    }

    // Idempotent seed of bidding_zones: inserts missing zones and syncs changed fields.
    private static async Task SeedBiddingZonesAsync(AppDbContext db, CancellationToken ct)
    {
        var existing = await db.BiddingZones.ToDictionaryAsync(z => z.Id, ct);
        var changed = false;

        foreach (var seed in BiddingZoneSeedData.Zones)
        {
            if (!existing.TryGetValue(seed.Id, out var current))
            {
                db.BiddingZones.Add(new BiddingZone
                {
                    Id = seed.Id,
                    Name = seed.Name,
                    Code = seed.Code,
                    TimeZoneId = seed.TimeZoneId,
                    Latitude = seed.Latitude,
                    Longitude = seed.Longitude,
                });
                changed = true;
                continue;
            }

            // Sync mutable fields if the hardcoded list was edited (e.g. corrected lat/lng or timezone).
            if (current.Name == seed.Name && current.Code == seed.Code &&
                current.TimeZoneId == seed.TimeZoneId &&
                current.Latitude == seed.Latitude && current.Longitude == seed.Longitude)
            {
                continue;
            }

            current.Name = seed.Name;
            current.Code = seed.Code;
            current.TimeZoneId = seed.TimeZoneId;
            current.Latitude = seed.Latitude;
            current.Longitude = seed.Longitude;
            changed = true;
        }

        if (changed)
        {
            await db.SaveChangesAsync(ct);
        }
    }
}
