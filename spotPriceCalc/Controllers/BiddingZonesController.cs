using Microsoft.AspNetCore.Mvc;
using spotPriceCalc.Dtos;
using spotPriceCalc.Infrastructure.Persistence;

namespace spotPriceCalc.Controllers;

/// <summary>Zones a client can schedule against, so it ships no copy of the list: GET /api/zones.</summary>
[ApiController]
[Route("api/zones")]
public class BiddingZonesController : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<BiddingZoneDto>), StatusCodes.Status200OK)]
    public IActionResult Get() =>
        Ok(BiddingZoneSeedData.Zones
            .OrderBy(z => z.Name)
            .Select(z => new BiddingZoneDto { Code = z.Code, Name = z.Name })
            .ToList());
}
