using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using spotPriceCalc.Domain;
using spotPriceCalc.Infrastructure.Persistence.Entities;

namespace spotPriceCalc.Infrastructure.Persistence.Configurations;

public class SpotPriceEntityConfiguration : IEntityTypeConfiguration<SpotPriceEntity>
{
    public void Configure(EntityTypeBuilder<SpotPriceEntity> builder)
    {
        builder.ToTable("spot_prices");

        builder.HasKey(p => p.Id);

        builder.Property(p => p.From).IsRequired();
        builder.Property(p => p.To).IsRequired();
        builder.Property(p => p.Price).HasColumnType("numeric(10,4)");
        builder.Property(p => p.BiddingZoneId).IsRequired();

        builder.HasOne<BiddingZone>()
            .WithMany()
            .HasForeignKey(p => p.BiddingZoneId)
            .OnDelete(DeleteBehavior.Cascade);

        // One row per zone + slot start, prevents duplicate imports of the same day.
        builder.HasIndex(p => new { p.BiddingZoneId, p.From }).IsUnique();
    }
}
