using spotPriceCalc.Domain;
using spotPriceCalc.Dtos;

namespace spotPriceCalc.Services.Savings;

// What each flexible appliance saves by running in today's cheapest window instead of a fixed tariff.
public interface ISavingsService
{
    // Takes a resolved zone, not a code, so an unknown zone is rejected once at the edge.
    Task<ApplianceSavingsDto> GetApplianceSavingsAsync(BiddingZone zone, CancellationToken ct);
}
