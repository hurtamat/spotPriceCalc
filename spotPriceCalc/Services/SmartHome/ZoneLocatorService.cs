using spotPriceCalc.Infrastructure.Persistence;

namespace spotPriceCalc.Services.SmartHome;

/// <summary>Coordinates → bidding zone. TODO: real geometry. We only have zone *centres* in the seed data
/// today (no polygons), so a proper point-in-zone lookup is not possible yet.</summary>
public class ZoneLocatorService : IZoneLocatorService
{
    public int ResolveBiddingZone(decimal latitude, decimal longitude)
    {
        // TODO: implement real coordinate → bidding-zone resolution.
        // Options to evaluate:
        //   - ship bidding-zone polygons (GeoJSON) and do point-in-polygon,
        //   - or nearest-centre over BiddingZoneSeedData as a rough first cut (wrong at borders),
        //   - or an external geocoding/zone API.
        // Until then this throws so callers fail loudly rather than silently pricing the wrong zone.
        _ = BiddingZoneSeedData.Zones;
        throw new NotImplementedException(
            "Coordinate → bidding-zone resolution is not implemented yet (no zone polygons in seed data).");
    }
}
