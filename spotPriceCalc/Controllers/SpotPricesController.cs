using Microsoft.AspNetCore.Mvc;
using spotPriceCalc.Dtos;
using spotPriceCalc.Infrastructure.Persistence;
using spotPriceCalc.Services;

namespace spotPriceCalc.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SpotPricesController : ControllerBase
{
    private readonly ISpotPriceService _service;

    public SpotPricesController(ISpotPriceService service)
    {
        _service = service;
    }

    /// <summary>Stored day-ahead prices for one zone for a single CET market day.</summary>
    [HttpGet]
    public async Task<IActionResult> GetPrices(
        [FromQuery] int biddingZoneId,
        [FromQuery] DateOnly date,
        CancellationToken ct)
    {
        if (!BiddingZoneSeedData.ById.ContainsKey(biddingZoneId))
            return NotFound($"Unknown bidding zone id {biddingZoneId}.");

        var prices = await _service.GetPricesAsync(biddingZoneId, date, date, ct);
        var zone = BiddingZoneSeedData.ById[biddingZoneId]; // validated above
        return Ok(ZoneSpotPricesDto.From(prices, zone.TimeZoneId));
    }

    /// <summary>Fetches and stores prices for all zones for the given date, retrying until every zone is in.</summary>
    [HttpPost("populate")]
    public async Task<IActionResult> Populate([FromQuery] DateOnly? date, CancellationToken ct = default)
    {
        var target = date ?? DateOnly.FromDateTime(DateTime.UtcNow);
        var result = await _service.PopulateUntilCompleteAsync(target, ct);
        return Ok(result);
    }
}
