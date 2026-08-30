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
        // The delivery day is the CET day for every zone, not just the CET ones.
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
        using var response = await _httpClient.GetAsync(url, ct);
        var xml = await response.Content.ReadAsStringAsync(ct);

        // ENTSO-E returns its Acknowledgement document for "no matching data" with a 200.
        if (EntsoeXml.TryReadAcknowledgement(xml, out var reason))
            throw new EntsoeAcknowledgementException(reason.Code, reason.Text);

        response.EnsureSuccessStatusCode();

        var doc = EntsoeXml.Deserialize(xml);

        // One TimeSeries per publication day; dedupe by slot start, preferring SDAC over EXAA.
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
