using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using spotPriceCalc.Domain;

namespace spotPriceCalc.Infrastructure.Persistence.Configurations;

// Maps the BiddingZone domain entity. The rows themselves are seeded at runtime by
// DbInitializer.SeedBiddingZonesAsync from BiddingZoneSeedData (the code source of truth), NOT via
// HasData — so editing the hardcoded zone list is a code change + restart, not a schema migration.
public class BiddingZoneConfiguration : IEntityTypeConfiguration<BiddingZone>
{
    public void Configure(EntityTypeBuilder<BiddingZone> builder)
    {
        builder.ToTable("bidding_zones");

        builder.HasKey(z => z.Id);

        // Ids come from the seed list, not the database.
        builder.Property(z => z.Id).ValueGeneratedNever();

        builder.Property(z => z.Name).HasMaxLength(100).IsRequired();
        builder.Property(z => z.Code).HasMaxLength(16).IsRequired();
        builder.Property(z => z.TimeZoneId).HasMaxLength(64).IsRequired();
        // numeric(9,6): up to ±180.000000, plenty for lat/lng and stored exactly.
        builder.Property(z => z.Latitude).HasColumnType("numeric(9,6)");
        builder.Property(z => z.Longitude).HasColumnType("numeric(9,6)");

        builder.HasIndex(z => z.Code).IsUnique();
    }
}
