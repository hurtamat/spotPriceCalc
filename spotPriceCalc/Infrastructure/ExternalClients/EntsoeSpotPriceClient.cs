using spotPriceCalc.Domain;

namespace spotPriceCalc.Infrastructure.ExternalClients;

public class EntsoeSpotPriceClient : ISpotPriceProvider {
    
    private readonly HttpClient _httpClient;
    public async Task<IReadOnlyList<SpotPrice>> GetSpotPricesAsync(BiddingZone zone, DateOnly date, CancellationToken ct)
    {
        var response = await _httpClient.GetFromJsonAsync<someResponse>;
        
        
    }
}