using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using spotPriceCalc.Domain;

namespace spotPriceCalc.Infrastructure.Persistence.Configurations;

// Maps the BiddingZone domain entity and seeds the whole table from BiddingZoneSeedData (the code
// source of truth). HasData is baked into the migration, so applying migrations creates + seeds the
// table in one idempotent step.
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
        builder.Property(z => z.Latitude);
        builder.Property(z => z.Longitude);

        builder.HasIndex(z => z.Code).IsUnique();

        builder.HasData(BiddingZoneSeedData.Zones);
    }
}
