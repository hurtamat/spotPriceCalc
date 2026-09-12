using System.Net.Http.Json;
using spotPriceCalc.Dtos;
using spotPriceCalc.Dtos.PriceZones;

namespace spotPriceCalc.Infrastructure.ExternalClients;

// POST /price-zones on the Python calc-service. Base address is set by AddHttpClient in Program.cs.
public class CalcServicePriceZoneClient : IPriceZoneProvider
{
    private readonly HttpClient _httpClient;

    public CalcServicePriceZoneClient(HttpClient httpClient) => _httpClient = httpClient;

    public async Task<PriceZonesResponse> GetPriceZonesAsync(IReadOnlyList<PricePointDto> prices, CancellationToken ct)
    {
        var response = await _httpClient.PostAsJsonAsync("price-zones", prices, ct);

        // FastAPI answers a bad payload with 422 + a detail body; surface it instead of a bare status code.
        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync(ct);
            throw new HttpRequestException(
                $"calc-service /price-zones returned {(int)response.StatusCode}: {body}");
        }

        return await response.Content.ReadFromJsonAsync<PriceZonesResponse>(ct)
               ?? throw new InvalidOperationException("calc-service /price-zones returned an empty body.");
    }
}
