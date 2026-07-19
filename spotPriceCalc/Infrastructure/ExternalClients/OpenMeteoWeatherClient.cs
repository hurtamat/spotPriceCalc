using System.Globalization;
using System.Net.Http.Json;
using Microsoft.AspNetCore.WebUtilities;
using spotPriceCalc.Domain;

namespace spotPriceCalc.Infrastructure.ExternalClients.OpenMeteo;

public class OpenMeteoWeatherClient : IWeatherProvider
{
    private readonly HttpClient _httpClient;

    public OpenMeteoWeatherClient(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public async Task<ZoneTemperatures> GetTemperaturesAsync(BiddingZone zone, CancellationToken ct)
    {
        var query = new Dictionary<string, string?>
        {
            ["latitude"] = zone.Latitude.ToString(CultureInfo.InvariantCulture),
            ["longitude"] = zone.Longitude.ToString(CultureInfo.InvariantCulture),
            ["hourly"] = "temperature_2m",
            ["forecast_days"] = "1",
        };

        var url = QueryHelpers.AddQueryString("", query);

        // Open-Meteo replies with JSON (unlike ENTSO-E's XML), so we can deserialize directly.
        var response = await _httpClient.GetFromJsonAsync<OpenMeteoResponse>(url, ct)
                       ?? throw new InvalidOperationException("Open-Meteo returned no data.");

        return new ZoneTemperatures
        {
            BiddingZoneId = zone.Id,
            Points = response.ToTemperaturePoints(),
        };
    }
}
