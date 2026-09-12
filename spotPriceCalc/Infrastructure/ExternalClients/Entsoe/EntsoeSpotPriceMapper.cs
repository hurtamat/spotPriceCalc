using System.Globalization;
using System.Xml;
using spotPriceCalc.Domain;

namespace spotPriceCalc.Infrastructure.ExternalClients.Entsoe;

// Turns the raw XML DTOs into zone-agnostic PricePoints. Zone id is stamped later by the client.
public static class EntsoeSpotPriceMapper
{
    // Expands one Period into one PricePoint per slot, carrying the last seen price forward.
    public static IReadOnlyList<PricePoint> ToPricePoints(this PeriodXml period)
    {
        var start = ParseUtc(period.TimeInterval.Start);
        var end = ParseUtc(period.TimeInterval.End);

        // Slot count = window length / resolution.
        var resolution = XmlConvert.ToTimeSpan(period.Resolution);
        var slotCount = (int)((end - start) / resolution);

        var priceByPosition = period.Points.ToDictionary(p => p.Position, p => p.PriceAmount);

        var prices = new List<PricePoint>(slotCount);
        var last = 0m;
        for (var pos = 1; pos <= slotCount; pos++)
        {
            if (priceByPosition.TryGetValue(pos, out var price))
                last = price;

            var from = start + resolution * (pos - 1);
            prices.Add(new PricePoint
            {
                From = from,
                To = from + resolution,
                Price = last, // EUR/MWh, raw
            });
        }

        return prices;
    }

    private static DateTime ParseUtc(string value) =>
        DateTime.Parse(
            value,
            CultureInfo.InvariantCulture,
            DateTimeStyles.AdjustToUniversal | DateTimeStyles.AssumeUniversal);
}
