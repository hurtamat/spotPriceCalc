using Microsoft.AspNetCore.WebUtilities;
using spotPriceCalc.Domain;
using spotPriceCalc.Infrastructure.ExternalClients.Entsoe;

namespace spotPriceCalc.Infrastructure.ExternalClients;

public class EntsoeSpotPriceClient : ISpotPriceProvider {

    private readonly HttpClient _httpClient;
    private readonly string _securityToken;

    public EntsoeSpotPriceClient(HttpClient httpClient, IConfiguration configuration)
    {
        _httpClient = httpClient;
        _securityToken = configuration["Entsoe:SecurityToken"]
                         ?? throw new InvalidOperationException("Entsoe:SecurityToken is not configured.");
    }

    public async Task<ZoneSpotPrices> GetSpotPricesAsync(BiddingZone zone, DateOnly from, DateOnly to, CancellationToken ct)
    {
        // ENTSO-E periodStart/End are UTC; the delivery day is the CET day (for every zone, not just the
        // CET ones). Asking for exactly that window keeps the response to a single publication day — the
        // API rounds a straddling window outward and returns each extra day as its own TimeSeries.
        var (fromUtc, _) = MarketDay.WindowUtc(from);
        var (_, toUtc) = MarketDay.WindowUtc(to);

        var query = new Dictionary<string, string?>
        {
            ["securityToken"] = _securityToken,
            ["documentType"] = "A44",
            ["in_Domain"] = zone.Code,
            ["out_Domain"] = zone.Code,
            ["periodStart"] = fromUtc.ToString("yyyyMMddHHmm"),
            ["periodEnd"] = toUtc.ToString("yyyyMMddHHmm"),
        };
        
        var url = QueryHelpers.AddQueryString("", query);
        var xml = await _httpClient.GetStringAsync(url, ct);

        var doc = EntsoeXml.Deserialize(xml);

        // One TimeSeries per publication day, so a multi-day range returns several — take them all.
        // Zones with more than one NEMO repeat a day with identical prices, so dedupe by slot start;
        // ordering SDAC first (no classificationSequence position) means it wins over EXAA.
        var points = doc.TimeSeries
            .Where(t => t.IsDayAhead)
            .OrderBy(t => t.ClassificationSequencePosition.HasValue)
            .SelectMany(t => t.Periods)
            .SelectMany(p => p.ToPricePoints())
            .GroupBy(p => p.From)
            .Select(g => g.First())
            .OrderBy(p => p.From)
            .ToList();

        if (points.Count == 0)
            throw new InvalidOperationException(
                $"No day-ahead (A01) prices for zone {zone.Code} on {from:yyyy-MM-dd}..{to:yyyy-MM-dd}.");

        return new ZoneSpotPrices { BiddingZoneId = zone.Id, Points = points };
    }
}
