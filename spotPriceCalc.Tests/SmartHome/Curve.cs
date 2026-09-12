using spotPriceCalc.Domain;

namespace spotPriceCalc.Tests.SmartHome;

// Builds a contiguous run of price slots. Width is explicit: PT15M for most zones, PT60M for IE-SEM.
internal static class Curve
{
    public static List<PricePoint> Hourly(DateTime startUtc, params decimal[] prices) =>
        Build(startUtc, TimeSpan.FromHours(1), prices);

    public static List<PricePoint> QuarterHourly(DateTime startUtc, params decimal[] prices) =>
        Build(startUtc, TimeSpan.FromMinutes(15), prices);

    public static List<PricePoint> Build(DateTime startUtc, TimeSpan slotWidth, params decimal[] prices)
    {
        var points = new List<PricePoint>();
        var cursor = DateTime.SpecifyKind(startUtc, DateTimeKind.Utc);

        foreach (var price in prices)
        {
            points.Add(new PricePoint { From = cursor, To = cursor + slotWidth, Price = price });
            cursor += slotWidth;
        }

        return points;
    }
}
