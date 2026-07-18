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

    public async Task<ZoneSpotPrices> GetSpotPricesAsync(BiddingZone zone, DateOnly date, CancellationToken ct)
    {
        var start = date.ToDateTime(TimeOnly.MinValue);
        var end = start.AddDays(1);

        var query = new Dictionary<string, string?>
        {
            ["securityToken"] = _securityToken,
            ["documentType"] = "A44",
            ["in_Domain"] = zone.Code,
            ["out_Domain"] = zone.Code,
            ["periodStart"] = start.ToString("yyyyMMddHHmm"),
            ["periodEnd"] = end.ToString("yyyyMMddHHmm"),
        };
        
        var url = QueryHelpers.AddQueryString("", query);
        var xml = await _httpClient.GetStringAsync(url, ct);

        // Deserialize the XML straight into DTOs (no manual navigation).
        var doc = EntsoeXml.Deserialize(xml);

        // Keep day-ahead only (drop A07 intraday), then prefer the series WITHOUT a
        var chosen = doc.TimeSeries
                         .Where(t => t.IsDayAhead)
                         .OrderBy(t => t.ClassificationSequencePosition.HasValue)
                         .FirstOrDefault()
                     ?? throw new InvalidOperationException(
                         $"No day-ahead (A01) series in ENTSO-E response for zone {zone.Code} on {date:yyyy-MM-dd}.");
        
        // Map raw points -> PricePoints (date math + carry-forward live in the mapper),
        // then wrap into the aggregate, stamping the zone id once.
        var points = chosen.Periods
            .SelectMany(p => p.ToPricePoints())
            .ToList();

        return new ZoneSpotPrices { BiddingZoneId = zone.Id, Points = points };
    }
}
















