using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using spotPriceCalc.Domain;
using spotPriceCalc.Infrastructure.Persistence.Entities;

namespace spotPriceCalc.Infrastructure.Persistence.Configurations;

public class TemperatureReadingEntityConfiguration : IEntityTypeConfiguration<TemperatureReadingEntity>
{
    public void Configure(EntityTypeBuilder<TemperatureReadingEntity> builder)
    {
        builder.ToTable("temperature_readings");

        builder.HasKey(t => t.Id);

        builder.Property(t => t.TimeUtc).IsRequired();
        builder.Property(t => t.TemperatureC).HasColumnType("numeric(6,2)");
        builder.Property(t => t.BiddingZoneId).IsRequired();

        builder.HasOne<BiddingZone>()
            .WithMany()
            .HasForeignKey(t => t.BiddingZoneId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(t => new { t.BiddingZoneId, t.TimeUtc }).IsUnique();
    }
}
