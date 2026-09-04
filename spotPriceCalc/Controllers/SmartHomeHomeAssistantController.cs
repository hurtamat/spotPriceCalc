using Microsoft.AspNetCore.Mvc;
using spotPriceCalc.Dtos.Schedule;
using spotPriceCalc.Services.SmartHome;

namespace spotPriceCalc.Controllers;

/// <summary>Home Assistant integration endpoint: POST /api/homeassistant/schedule.</summary>
/// <remarks>Same request and scheduler as Shelly; returns the plan and the price curve together.</remarks>
[ApiController]
[Route("api/homeassistant")]
public class SmartHomeHomeAssistantController : SmartHomeIntegrationController
{
    public SmartHomeHomeAssistantController(IScheduleService schedule) : base(schedule)
    {
    }

    [HttpPost("schedule")]
    [ProducesResponseType(typeof(HomeAssistantScheduleResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Post([FromBody] ScheduleRequest request, CancellationToken ct)
    {
        if (request.Tasks is null || request.Tasks.Count == 0)
            return BadRequest("At least one task is required.");

        var schedule = await BuildScheduleAsync(request, ct);

        // Anchored on now, not request.Date: the curve is for display, and the plan is asked for early.
        var now = DateTime.UtcNow;
        var curve = await _schedule.ResolvePriceCurveAsync(
            new StatusSchedule { Lat = request.Lat, Lon = request.Lon, StatusTime = now }, ct);

        return Ok(new HomeAssistantScheduleResponse
        {
            DeviceId = schedule.DeviceId,
            ZoneName = schedule.ZoneName,
            GeneratedAtUtc = now,
            Tasks = schedule.Tasks,
            Curve = curve,
        });
    }
}
