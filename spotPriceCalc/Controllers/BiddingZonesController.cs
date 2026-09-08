using Microsoft.AspNetCore.Mvc;
using spotPriceCalc.Dtos;
using spotPriceCalc.Infrastructure.Persistence;
using spotPriceCalc.Services.SmartHome;

namespace spotPriceCalc.Controllers;

/// <summary>Zones a client can schedule against, so it ships no copy of the list: GET /api/zones.</summary>
[ApiController]
[Route("api/zones")]
public class BiddingZonesController : ControllerBase
{
    private readonly IZoneLocatorService _zoneLocator;

    public BiddingZonesController(IZoneLocatorService zoneLocator)
    {
        _zoneLocator = zoneLocator;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<BiddingZoneDto>), StatusCodes.Status200OK)]
    public IActionResult Get() =>
        Ok(BiddingZoneSeedData.Zones
            .OrderBy(z => z.Name)
            .Select(z => new BiddingZoneDto { Code = z.Code, Name = z.Name, TimeZoneId = z.TimeZoneId })
            .ToList());

    /// <summary>The zone governing a location, so a client can preselect it: GET /api/zones/resolve.</summary>
    [HttpGet("resolve")]
    [ProducesResponseType(typeof(BiddingZoneDto), StatusCodes.Status200OK)]
    public IActionResult Resolve([FromQuery] decimal lat, [FromQuery] decimal lon)
    {
        var zoneId = _zoneLocator.ResolveBiddingZone(lat, lon);
        return BiddingZoneSeedData.ById.TryGetValue(zoneId, out var zone)
            ? Ok(new BiddingZoneDto { Code = zone.Code, Name = zone.Name, TimeZoneId = zone.TimeZoneId })
            : NotFound();
    }
}
