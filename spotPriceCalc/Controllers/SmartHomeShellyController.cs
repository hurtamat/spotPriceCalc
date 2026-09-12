using Microsoft.AspNetCore.Mvc;
using spotPriceCalc.Services.Zones;
using spotPriceCalc.Dtos.Schedule;
using spotPriceCalc.Services.SmartHome;

namespace spotPriceCalc.Controllers;

/// <summary>Shelly integration endpoints: POST /api/shelly/schedule and GET /api/shelly/schedule/status.</summary>
[ApiController]
[Route("api/shelly")]
public class SmartHomeShellyController : SmartHomeController
{
    public SmartHomeShellyController(
        IScheduleService schedule, IBiddingZoneCatalog zones, TimeProvider clock)
        : base(schedule, zones, clock)
    {
    }

    [HttpPost("schedule")]
    public async Task<IActionResult> Post([FromBody] ShellyScheduleRequest request, CancellationToken ct)
    {
        if (Validate(request.ZoneCode, request.DurationHours, out var zone) is { } error)
            return error;

        // The device sends a wall clock in its zone's local time; the scheduler only sees instants.
        // Read once, so the deadline and the two labels agree.
        var now = UtcNow;
        var resolved = ShellyLocalTime.Resolve(request, zone.TimeZoneId, now);

        var schedule = await _schedule.BuildAsync(zone, resolved, ct);

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
        if (Validate(zoneCode, durationHours: null, out var zone) is { } error)
            return error;

        var response = await _schedule.ResolveStatus(zone, time, ct);

        // 204 when no colour applies; the device script clears its LEDs on anything that isn't a 200.
        return response is null ? NoContent() : Ok(response);
    }
}
