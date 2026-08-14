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

    /// <summary>GET /api/spotprices?biddingZoneId=6&amp;date=2026-07-18 — stored day-ahead prices for one
    /// zone for a single day. The date is the CET <b>market</b> day (see Domain/MarketDay.cs) — the same day
    /// ENTSO-E publishes, for every zone — resolved to its UTC window server-side.</summary>
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

    /// <summary>POST /api/spotprices/populate?date=2026-07-25 — fetches and stores prices for ALL zones for
    /// the given date (defaults to today, UTC), retrying until every zone is in. Manual trigger; the
    /// in-process scheduler calls the same service method daily.</summary>
    [HttpPost("populate")]
    public async Task<IActionResult> Populate([FromQuery] DateOnly? date, CancellationToken ct = default)
    {
        var target = date ?? DateOnly.FromDateTime(DateTime.UtcNow);
        var result = await _service.PopulateUntilCompleteAsync(target, ct);
        return Ok(result);
    }
}
