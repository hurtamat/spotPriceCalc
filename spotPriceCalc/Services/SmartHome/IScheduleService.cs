using spotPriceCalc.Dtos;
using spotPriceCalc.Dtos.Schedule;

namespace spotPriceCalc.Services.SmartHome;

// Device-agnostic decision engine: resolves the zone, picks the job's hours, reports the relay state.
public interface IScheduleService
{
    Task<ScheduleResponse> BuildAsync(ScheduleRequest request, CancellationToken ct);

    // Null when the slot is missing or unclassified.
    Task<PriceColor?> ResolveStatus(StatusSchedule request,  CancellationToken ct);
    
    Task<IReadOnlyList<PriceCurvePoint>?> ResolvePriceCurveAsync(int biddingZoneId, DateTime atUtc, CancellationToken ct);
}
