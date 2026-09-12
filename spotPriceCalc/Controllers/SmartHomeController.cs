using Microsoft.AspNetCore.Mvc;
using spotPriceCalc.Services.Zones;
using spotPriceCalc.Domain;
using spotPriceCalc.Services.SmartHome;

namespace spotPriceCalc.Controllers;

/// <summary>Shared base for every smart-home integration (Shelly, Home Assistant, …).</summary>
public abstract class SmartHomeController : ControllerBase
{
    protected readonly IScheduleService _schedule;
    protected readonly IBiddingZoneCatalog _zones;
    private readonly TimeProvider _clock;

    protected SmartHomeController(
        IScheduleService schedule, IBiddingZoneCatalog zones, TimeProvider clock)
    {
        _schedule = schedule;
        _zones = zones;
        _clock = clock;
    }

    protected DateTime UtcNow => _clock.GetUtcNow().UtcDateTime;
    
    protected IActionResult? Validate(string zoneCode, double? durationHours, out BiddingZone zone)
    {
        zone = null!;

        if (durationHours is <= 0)
            return BadRequest("duration_hours must be greater than zero.");

        return _zones.TryByCode(zoneCode, out zone)
            ? null
            : BadRequest($"Unknown bidding zone code {zoneCode}.");
    }
}
