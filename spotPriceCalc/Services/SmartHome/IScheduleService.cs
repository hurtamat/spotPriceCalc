using spotPriceCalc.Dtos.Schedule;

namespace spotPriceCalc.Services.SmartHome;

/// <summary>The device-agnostic decision engine: from a schedule request it resolves the bidding zone (from
/// the request's coordinates) and works out which hours each task should run and whether the relay should be
/// ON right now. Pure orchestration over the stored price curve — no HTTP, no device specifics — so any
/// integration controller can reuse it.</summary>
public interface IScheduleService
{
    Task<ScheduleResponse> BuildAsync(ScheduleRequest request, CancellationToken ct);
}
