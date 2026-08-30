using Microsoft.EntityFrameworkCore;
using spotPriceCalc.Domain;
using spotPriceCalc.Infrastructure.Persistence.Entities;

namespace spotPriceCalc.Infrastructure.Persistence;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<BiddingZone> BiddingZones => Set<BiddingZone>();
    public DbSet<SpotPriceEntity> SpotPrices => Set<SpotPriceEntity>();
    public DbSet<TemperatureReadingEntity> TemperatureReadings => Set<TemperatureReadingEntity>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Picks up every IEntityTypeConfiguration in this assembly (BiddingZone, SpotPrice, Temperature).
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
    }
}
