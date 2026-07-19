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

    /// <summary>GET /api/spotprices?biddingZoneId=6&amp;from=2026-07-18&amp;to=2026-07-18 — stored day-ahead
    /// prices for one zone over an inclusive date range.</summary>
    [HttpGet]
    public async Task<IActionResult> GetPrices(
        [FromQuery] int biddingZoneId,
        [FromQuery] DateOnly from,
        [FromQuery] DateOnly to,
        CancellationToken ct)
    {
        if (!BiddingZoneSeedData.ById.ContainsKey(biddingZoneId))
            return NotFound($"Unknown bidding zone id {biddingZoneId}.");

        if (to < from)
            return BadRequest("'to' must be on or after 'from'.");

        var prices = await _service.GetPricesAsync(biddingZoneId, from, to, ct);
        return Ok(ZoneSpotPricesDto.From(prices));
    }

    /// <summary>POST /api/spotprices/populate?day=today — fetches and stores prices for ALL zones for the
    /// day (today by default, or tomorrow). Manual trigger for now; an Azure Function will call it daily.</summary>
    [HttpPost("populate")]
    public async Task<IActionResult> Populate([FromQuery] PriceDay day = PriceDay.Today, CancellationToken ct = default)
    {
        var result = await _service.PopulateAsync(day, ct);
        return Ok(result);
    }
}
