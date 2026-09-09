using Microsoft.AspNetCore.Mvc;
using spotPriceCalc.Services.Zones;
using spotPriceCalc.Dtos.Schedule;
using spotPriceCalc.Services.SmartHome;

namespace spotPriceCalc.Controllers;

/// <summary>Home Assistant integration endpoint: POST /api/homeassistant/schedule.</summary>
/// <remarks>Same request and scheduler as Shelly; returns the plan and the price curve together.</remarks>
[ApiController]
[Route("api/homeassistant")]
public class SmartHomeHomeAssistantController : SmartHomeIntegrationController
{
    public SmartHomeHomeAssistantController(
        IScheduleService schedule, IBiddingZoneCatalog zones, TimeProvider clock)
        : base(schedule, zones, clock)
    {
    }

    [HttpPost("schedule")]
    [ProducesResponseType(typeof(HomeAssistantScheduleResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Post([FromBody] ScheduleRequest request, CancellationToken ct)
    {
        if (request.DurationHours <= 0)
            return BadRequest("duration_hours must be greater than zero.");
        if (!_zones.TryByCode(request.ZoneCode, out var zone))
            return BadRequest($"Unknown bidding zone code {request.ZoneCode}.");

        var schedule = await BuildScheduleAsync(zone, request, ct);

        // Anchored on now, not the deadline: the curve is for display, and the plan is asked for early.
        var now = UtcNow;
        var curve = await _schedule.ResolvePriceCurveAsync(zone, now, ct);

        return Ok(new HomeAssistantScheduleResponse
        {
            DeviceId = schedule.DeviceId,
            ZoneName = schedule.ZoneName,
            GeneratedAtUtc = now,
            Scheduled = schedule.Scheduled,
            Blocks = schedule.Blocks,
            Curve = curve,
        });
    }
}
