using System.Globalization;
using System.Xml;
using spotPriceCalc.Domain;

namespace spotPriceCalc.Infrastructure.ExternalClients.Entsoe;

/// <summary>
/// Turns the raw XML DTOs into domain <see cref="SpotPrice"/>s. This is the ONLY place that does
/// date math and the A03 carry-forward — the DTOs stay a faithful copy of the XML.
/// </summary>
public static class EntsoeSpotPriceMapper
{
    /// <summary>
    /// Expands one Period into one SpotPrice per slot. Positions can be sparse (curveType A03): a
    /// missing position means "same price as the previous slot", so we walk every slot 1..N and
    /// carry the last seen price forward.
    /// </summary>
    public static IReadOnlyList<SpotPrice> ToSpotPrices(this PeriodXml period, int biddingZoneId)
    {
        var start = ParseUtc(period.TimeInterval.Start);
        var end = ParseUtc(period.TimeInterval.End);

        // "PT15M" / "PT60M" -> a TimeSpan. Slot count = window length / resolution.
        var resolution = XmlConvert.ToTimeSpan(period.Resolution);
        var slotCount = (int)((end - start) / resolution);

        var priceByPosition = period.Points.ToDictionary(p => p.Position, p => p.PriceAmount);

        var prices = new List<SpotPrice>(slotCount);
        var last = 0m;
        for (var pos = 1; pos <= slotCount; pos++)
        {
            if (priceByPosition.TryGetValue(pos, out var price))
                last = price;

            var from = start + resolution * (pos - 1);
            prices.Add(new SpotPrice
            {
                From = from,
                To = from + resolution,
                Price = last, // EUR/MWh, raw
                BiddingZoneId = biddingZoneId,
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
