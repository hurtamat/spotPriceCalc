using Microsoft.AspNetCore.Mvc;
using spotPriceCalc.Domain;
using spotPriceCalc.Dtos.Schedule;
using spotPriceCalc.Services.SmartHome;

namespace spotPriceCalc.Controllers;

/// <summary>Shared base for every smart-home integration (Shelly, Home Assistant, …).</summary>
public abstract class SmartHomeIntegrationController : ControllerBase
{
    protected readonly IScheduleService _schedule;
    private readonly TimeProvider _clock;

    protected SmartHomeIntegrationController(IScheduleService schedule, TimeProvider clock)
    {
        _schedule = schedule;
        _clock = clock;
    }

    protected DateTime UtcNow => _clock.GetUtcNow().UtcDateTime;

    /// <summary>Run the device-agnostic scheduler for this request. Override to customise the mapping.</summary>
    protected virtual Task<ScheduleResponse> BuildScheduleAsync(
        BiddingZone zone, ScheduleRequest request, CancellationToken ct) =>
        _schedule.BuildAsync(zone, request, ct);
}
