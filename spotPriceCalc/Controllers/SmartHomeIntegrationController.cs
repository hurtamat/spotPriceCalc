using Microsoft.AspNetCore.Mvc;
using spotPriceCalc.Dtos.Schedule;
using spotPriceCalc.Services.SmartHome;

namespace spotPriceCalc.Controllers;

/// <summary>Shared base for every smart-home integration (Shelly, Home Assistant, …). It owns the reusable
/// HTTP-facing step — hand a request to the scheduler — as a <c>virtual</c> method a concrete integration can
/// override if it ever needs different behaviour. A concrete controller just declares its route/action and
/// maps its own request/response.
///
/// Note: the scheduling *logic* (and zone resolution) lives in <see cref="IScheduleService"/>, not here —
/// controllers stay thin. This class is only the adapter shared across integrations.</summary>
public abstract class SmartHomeIntegrationController : ControllerBase
{
    protected readonly IScheduleService _schedule;

    protected SmartHomeIntegrationController(IScheduleService schedule)
    {
        _schedule = schedule;
    }

    /// <summary>Run the device-agnostic scheduler for this request. Override to customise the mapping.
    /// TODO(timezone): request/response timestamps are UTC for now (we assume the client sends UTC). When we
    /// add real timezone handling, this edge is where UTC results should be converted to the device's local
    /// time for display.</summary>
    protected virtual Task<ScheduleResponse> BuildScheduleAsync(ScheduleRequest request, CancellationToken ct) =>
        _schedule.BuildAsync(request, ct);
}
