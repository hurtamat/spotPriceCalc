using Microsoft.AspNetCore.Mvc;
using spotPriceCalc.Dtos.Schedule;
using spotPriceCalc.Infrastructure.Persistence;
using spotPriceCalc.Services.SmartHome;

namespace spotPriceCalc.Controllers;

/// <summary>Shelly integration endpoints: POST /api/shelly/schedule and GET /api/shelly/schedule/status.</summary>
[ApiController]
[Route("api/shelly")]
public class SmartHomeShellyController : SmartHomeIntegrationController
{
    public SmartHomeShellyController(IScheduleService schedule, TimeProvider clock) : base(schedule, clock)
    {
    }

    [HttpPost("schedule")]
    public async Task<IActionResult> Post([FromBody] ShellyScheduleRequest request, CancellationToken ct)
    {
        if (request.DurationHours <= 0)
            return BadRequest("duration_hours must be greater than zero.");
        if (!BiddingZoneSeedData.ByCode.TryGetValue(request.ZoneCode, out var zone))
            return BadRequest($"Unknown bidding zone code {request.ZoneCode}.");

        // The device sends a wall clock in its zone's local time; the scheduler only sees instants.
        // Read once, so the deadline and the two labels agree.
        var now = UtcNow;
        var resolved = ShellyLocalTime.Resolve(request, zone.TimeZoneId, now);

        var schedule = await BuildScheduleAsync(zone, resolved, ct);

        return Ok(new ShellyScheduleResponse
        {
            DeviceId = schedule.DeviceId,
            Scheduled = schedule.Scheduled,
            Slots = schedule.Blocks.Select(ShellyScheduleResponse.ToPair).ToList(),
            // The device shows these verbatim; it cannot convert UTC to local itself.
            TodayLocal = ShellyLocalTime.FormatLocalDay(schedule.Blocks, zone.TimeZoneId, 0, now),
            TomorrowLocal = ShellyLocalTime.FormatLocalDay(schedule.Blocks, zone.TimeZoneId, 1, now),
        });
    }

    [HttpGet("schedule/status")]
    public async Task<IActionResult> Status([FromQuery] string zoneCode, DateTime time, CancellationToken ct)
    {
        if (!BiddingZoneSeedData.ByCode.TryGetValue(zoneCode, out var zone))
            return BadRequest($"Unknown bidding zone code {zoneCode}.");

        var response = await _schedule.ResolveStatus(zone, time, ct);

        // 204 when no colour applies; the device script clears its LEDs on anything that isn't a 200.
        return response is null ? NoContent() : Ok(response);
    }
}
