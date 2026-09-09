using spotPriceCalc.Domain;
using spotPriceCalc.Dtos;
using spotPriceCalc.Dtos.Schedule;

namespace spotPriceCalc.Services.SmartHome;

// Device-agnostic decision engine: picks the job's hours.
public interface IScheduleService
{
    Task<ScheduleResponse> BuildAsync(BiddingZone zone, ScheduleRequest request, CancellationToken ct);

    // Null when the slot is missing or unclassified.
    Task<PriceColor?> ResolveStatus(BiddingZone zone, DateTime atUtc, CancellationToken ct);

    Task<IReadOnlyList<PriceCurvePoint>?> ResolvePriceCurveAsync(
        BiddingZone zone, DateTime atUtc, CancellationToken ct);
}
