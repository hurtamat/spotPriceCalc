using Microsoft.EntityFrameworkCore;
using spotPriceCalc.Domain;

namespace spotPriceCalc.Infrastructure.Persistence;

public static class DbInitializer
{
    // A database that is merely slow to accept connections shouldn't crash-loop the container; one that is
    // genuinely down still fails the boot, because serving traffic on an unmigrated schema is worse.
    private const int MigrateAttempts = 5;
    private static readonly TimeSpan MigrateRetryDelay = TimeSpan.FromSeconds(3);

    // Startup: apply pending migrations, then seed bidding_zones from the code source of truth.
    public static async Task InitializeAsync(IServiceProvider services, CancellationToken ct = default)
    {
        await using var scope = services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger(typeof(DbInitializer));

        for (var attempt = 1; ; attempt++)
        {
            try
            {
                await db.Database.MigrateAsync(ct);
                break;
            }
            catch (Exception ex) when (attempt < MigrateAttempts && !ct.IsCancellationRequested)
            {
                logger.LogWarning(ex, "Migrate attempt {Attempt}/{Max} failed — retry in {Delay}s",
                    attempt, MigrateAttempts, MigrateRetryDelay.TotalSeconds);
                await Task.Delay(MigrateRetryDelay, ct);
            }
        }

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
