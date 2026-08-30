using spotPriceCalc.Infrastructure.Persistence;

namespace spotPriceCalc.Services.SmartHome;

// Coordinates → bidding zone by nearest zone centre. TODO(geojson): point-in-polygon.
public class ZoneLocatorService : IZoneLocatorService
{
    public int ResolveBiddingZone(decimal latitude, decimal longitude)
    {
        var lat = (double)latitude;
        var lon = (double)longitude;

        int nearestId = 0;
        double nearestKm = double.MaxValue;
        foreach (var zone in BiddingZoneSeedData.Zones)
        {
            var km = HaversineKm(lat, lon, (double)zone.Latitude, (double)zone.Longitude);
            if (km < nearestKm)
            {
                nearestKm = km;
                nearestId = zone.Id;
            }
        }

        return nearestId;
    }

    // Great-circle km. Haversine, not raw degrees, so it stays correct at high (Nordic) latitudes.
    private static double HaversineKm(double lat1, double lon1, double lat2, double lon2)
    {
        const double earthRadiusKm = 6371.0;
        var dLat = ToRadians(lat2 - lat1);
        var dLon = ToRadians(lon2 - lon1);
        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2)
                + Math.Cos(ToRadians(lat1)) * Math.Cos(ToRadians(lat2))
                  * Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
        return earthRadiusKm * 2 * Math.Asin(Math.Min(1.0, Math.Sqrt(a)));
    }

    private static double ToRadians(double degrees) => degrees * Math.PI / 180.0;
}
