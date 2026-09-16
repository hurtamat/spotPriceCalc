using Microsoft.AspNetCore.Mvc;
using spotPriceCalc.Services.Savings;
using spotPriceCalc.Services.Zones;

namespace spotPriceCalc.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SavingsController : ControllerBase
{
    private readonly ISavingsService _savings;
    private readonly IBiddingZoneCatalog _zones;

    public SavingsController(ISavingsService savings, IBiddingZoneCatalog zones)
    {
        _savings = savings;
        _zones = zones;
    }

    /// <summary>What each appliance saves by running in today's cheapest window instead of a fixed tariff.</summary>
    [HttpGet("appliances")]
    public async Task<IActionResult> GetApplianceSavings([FromQuery] string zoneCode, CancellationToken ct)
    {
        if (!_zones.TryByCode(zoneCode ?? "", out var zone))
            return BadRequest($"Unknown bidding zone code {zoneCode}.");

        return Ok(await _savings.GetApplianceSavingsAsync(zone, ct));
    }
}
