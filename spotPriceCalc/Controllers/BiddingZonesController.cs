using Microsoft.AspNetCore.Mvc;
using spotPriceCalc.Services.Zones;
using spotPriceCalc.Dtos;
using spotPriceCalc.Services.SmartHome;

namespace spotPriceCalc.Controllers;

/// <summary>Zones a client can schedule against, so it ships no copy of the list: GET /api/zones.</summary>
[ApiController]
[Route("api/zones")]
public class BiddingZonesController : ControllerBase
{
    private readonly IZoneLocatorService _zoneLocator;
    private readonly IBiddingZoneCatalog _zones;

    public BiddingZonesController(IZoneLocatorService zoneLocator, IBiddingZoneCatalog zones)
    {
        _zoneLocator = zoneLocator;
        _zones = zones;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<BiddingZoneDto>), StatusCodes.Status200OK)]
    public IActionResult Get() =>
        Ok(_zones.All
            .OrderBy(z => z.Name)
            .Select(z => new BiddingZoneDto { Code = z.Code, Name = z.Name, TimeZoneId = z.TimeZoneId })
            .ToList());

    /// <summary>The zone governing a location, so a client can preselect it: GET /api/zones/resolve.</summary>
    [HttpGet("resolve")]
    [ProducesResponseType(typeof(BiddingZoneDto), StatusCodes.Status200OK)]
    public IActionResult Resolve([FromQuery] decimal lat, [FromQuery] decimal lon)
    {
        var zoneId = _zoneLocator.ResolveBiddingZone(lat, lon);
        return _zones.TryById(zoneId, out var zone)
            ? Ok(new BiddingZoneDto { Code = zone.Code, Name = zone.Name, TimeZoneId = zone.TimeZoneId })
            : NotFound();
    }
}
