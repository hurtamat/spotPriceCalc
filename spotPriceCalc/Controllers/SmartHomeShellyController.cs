using Microsoft.AspNetCore.Mvc;
using spotPriceCalc.Dtos.Schedule;
using spotPriceCalc.Services.SmartHome;

namespace spotPriceCalc.Controllers;

/// <summary>Shelly integration endpoints: POST /api/shelly/schedule and GET /api/shelly/schedule/status.</summary>
[ApiController]
[Route("api/shelly")]
public class SmartHomeShellyController : SmartHomeIntegrationController
{
    public SmartHomeShellyController(IScheduleService schedule) : base(schedule)
    {
    }

    [HttpPost("schedule")]
    public async Task<IActionResult> Post([FromBody] ScheduleRequest request, CancellationToken ct)
    {
        if (request.DurationHours <= 0)
            return BadRequest("duration_hours must be greater than zero.");

        var response = await BuildScheduleAsync(request, ct);
        return Ok(response);
    }

    [HttpGet("schedule/status")]
    public async Task<IActionResult> Status([FromQuery] decimal lat, decimal lon, DateTime time, CancellationToken ct)
    {
        var response = await _schedule.ResolveStatus(
            new StatusSchedule { Lat = lat, Lon = lon, StatusTime = time }, ct);

        // 204 when no colour applies; the device script clears its LEDs on anything that isn't a 200.
        return response is null ? NoContent() : Ok(response);
    }
}
