using Microsoft.AspNetCore.Mvc;
using spotPriceCalc.Dtos.Schedule;
using spotPriceCalc.Services.SmartHome;

namespace spotPriceCalc.Controllers;

/// <summary>Shared base for every smart-home integration (Shelly, Home Assistant, …).</summary>
public abstract class SmartHomeIntegrationController : ControllerBase
{
    protected readonly IScheduleService _schedule;

    protected SmartHomeIntegrationController(IScheduleService schedule)
    {
        _schedule = schedule;
    }

    /// <summary>Run the device-agnostic scheduler for this request. Override to customise the mapping.</summary>
    protected virtual Task<ScheduleResponse> BuildScheduleAsync(ScheduleRequest request, CancellationToken ct) =>
        _schedule.BuildAsync(request, ct);
}
