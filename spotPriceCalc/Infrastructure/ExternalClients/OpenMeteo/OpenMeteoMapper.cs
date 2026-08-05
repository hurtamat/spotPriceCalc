using System.Globalization;
using spotPriceCalc.Domain;

namespace spotPriceCalc.Infrastructure.ExternalClients.OpenMeteo;

// Zips the parallel time/temperature arrays into zone-agnostic TemperaturePoints; zone id stamped later.
public static class OpenMeteoMapper
{
    public static IReadOnlyList<TemperaturePoint> ToTemperaturePoints(this OpenMeteoResponse response)
    {
        var time = response.Hourly.Time;
        var temps = response.Hourly.Temperature2m;
        var count = Math.Min(time.Count, temps.Count);

        var readings = new List<TemperaturePoint>(count);
        for (var i = 0; i < count; i++)
        {
            readings.Add(new TemperaturePoint
            {
                TimeUtc = ParseUtc(time[i]),
                TemperatureC = temps[i],
            });
        }

        return readings;
    }

    // Open-Meteo returns "2026-07-18T00:00" with no offset; with the default timezone=GMT these are UTC.
    private static DateTime ParseUtc(string value) =>
        DateTime.Parse(
            value,
            CultureInfo.InvariantCulture,
            DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal);
}
