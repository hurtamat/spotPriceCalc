using spotPriceCalc.Dtos;
using spotPriceCalc.Dtos.Schedule;

namespace spotPriceCalc.Services.SmartHome;

// Device-agnostic decision engine: resolves the zone, picks each task's hours, reports the relay state.
public interface IScheduleService
{
    Task<ScheduleResponse> BuildAsync(ScheduleRequest request, CancellationToken ct);

    // Null when the slot is missing or unclassified.
    Task<PriceColor?> ResolveStatus(StatusSchedule request,  CancellationToken ct);

    // The stored curve around an instant plus the slot it falls in. Null when the zone has no prices.
    Task<PriceSnapshot?> ResolvePriceSnapshotAsync(StatusSchedule request, CancellationToken ct);
}
