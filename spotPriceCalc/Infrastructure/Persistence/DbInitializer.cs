using Microsoft.EntityFrameworkCore;
using spotPriceCalc.Domain;

namespace spotPriceCalc.Infrastructure.Persistence;

public static class DbInitializer
{
    /// <summary>
    /// Runs on startup: applies any pending schema migrations, then seeds the reference bidding_zones from
    /// the code source of truth. Migrate() is idempotent (checks __EFMigrationsHistory), and the zone seed
    /// is an idempotent upsert — so restarts are safe no-ops when nothing changed.
    /// </summary>
    public static async Task InitializeAsync(IServiceProvider services, CancellationToken ct = default)
    {
        await using var scope = services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await db.Database.MigrateAsync(ct);
        await SeedBiddingZonesAsync(db, ct);
    }

    /// <summary>
    /// Idempotent runtime seed of bidding_zones from BiddingZoneSeedData. Inserts missing zones and syncs
    /// changed fields on every startup, so editing the hardcoded list is a code change + restart — NOT a
    /// schema migration. Zones present in the DB but absent from the list are left untouched: removing one
    /// is rare/deliberate and could orphan FK references (spot_prices, temperature_readings), so it's not
    /// auto-deleted.
    /// </summary>
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
