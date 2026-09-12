using Microsoft.AspNetCore.Mvc;
using spotPriceCalc.Services.Zones;
using spotPriceCalc.Dtos;
using spotPriceCalc.Services;

namespace spotPriceCalc.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SpotPricesController : ControllerBase
{
    private readonly ISpotPriceService _service;
    private readonly IBiddingZoneCatalog _zones;

    public SpotPricesController(ISpotPriceService service, IBiddingZoneCatalog zones)
    {
        _service = service;
        _zones = zones;
    }

    /// <summary>Stored day-ahead prices for one zone for a single CET market day.</summary>
    [HttpGet]
    public async Task<IActionResult> GetPrices(
        [FromQuery] int biddingZoneId,
        [FromQuery] DateOnly date,
        CancellationToken ct)
    {
        if (!_zones.TryById(biddingZoneId, out var zone))
            return NotFound($"Unknown bidding zone id {biddingZoneId}.");

        var prices = await _service.GetPricesAsync(biddingZoneId, date, date, ct);
        return Ok(ZoneSpotPricesDto.From(prices, zone.TimeZoneId));
    }
}
