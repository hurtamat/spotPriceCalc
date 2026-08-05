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
        // ENTSO-E periodStart/End are UTC; the delivery day is the zone's LOCAL day. Query its UTC window so
        // we get exactly that day, not a UTC-midnight day sliced across two.
        var (fromUtc, toUtc) = zone.DeliveryDayWindowUtc(date);

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

        // Day-ahead only, preferring the authoritative SDAC series (no classificationSequence position).
        var chosen = doc.TimeSeries
                         .Where(t => t.IsDayAhead)
                         .OrderBy(t => t.ClassificationSequencePosition.HasValue)
                         .FirstOrDefault()
                     ?? throw new InvalidOperationException(
                         $"No day-ahead (A01) series in ENTSO-E response for zone {zone.Code} on {date:yyyy-MM-dd}.");

        var points = chosen.Periods
            .SelectMany(p => p.ToPricePoints())
            .ToList();

        return new ZoneSpotPrices { BiddingZoneId = zone.Id, Points = points };
    }
}
