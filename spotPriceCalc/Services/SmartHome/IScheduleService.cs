using spotPriceCalc.Dtos;
using spotPriceCalc.Dtos.Schedule;

namespace spotPriceCalc.Services.SmartHome;

// Device-agnostic decision engine: resolves the zone, picks each task's hours, and reports the relay state.
// Pure orchestration over the stored price curve — no HTTP — so any integration controller can reuse it.
public interface IScheduleService
{
    Task<ScheduleResponse> BuildAsync(ScheduleRequest request, CancellationToken ct);
    
    Task<PriceColor> ResolveStatus(StatusSchedule request,  CancellationToken ct);
}
