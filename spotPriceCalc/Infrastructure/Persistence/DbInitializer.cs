using Microsoft.EntityFrameworkCore;

namespace spotPriceCalc.Infrastructure.Persistence;

public static class DbInitializer
{
    /// <summary>
    /// Runs on startup: applies any pending migrations. The initial migration creates the schema and
    /// seeds bidding_zones from BiddingZoneSeedData (via HasData), so this is the "if not seeded, seed it"
    /// step. Migrate() is idempotent — it checks the __EFMigrationsHistory table and only applies what's
    /// missing, so restarts are no-ops.
    /// </summary>
    public static async Task InitializeAsync(IServiceProvider services, CancellationToken ct = default)
    {
        await using var scope = services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await db.Database.MigrateAsync(ct);
    }
}
