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
    /// zone for a single day. The date is the zone's LOCAL delivery day (resolved to a UTC window server-side
    /// via the zone's timezone), so the returned curve is a whole local day, not a UTC-midnight slice.</summary>
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

    /// <summary>GET /api/spotprices/zones?biddingZoneId=6&amp;from=2026-08-04&amp;to=2026-08-10 — the two cut-off
    /// prices (EUR/MWh) splitting the range into cheap/medium/expensive. Same call for 7 days or a year.</summary>
    [HttpGet("zones")]
    public async Task<IActionResult> GetZones(
        [FromQuery] int biddingZoneId,
        [FromQuery] DateOnly from,
        [FromQuery] DateOnly to,
        CancellationToken ct = default)
    {
        if (!BiddingZoneSeedData.ById.ContainsKey(biddingZoneId))
            return NotFound($"Unknown bidding zone id {biddingZoneId}.");

        if (to < from)
            return BadRequest("'to' must not be earlier than 'from'.");

        try
        {
            return Ok(await _service.GetPriceZonesAsync(biddingZoneId, from, to, ct));
        }
        catch (InvalidOperationException ex)
        {
            // Not enough stored prices in the range — a state problem, not a bad request.
            return Conflict(ex.Message);
        }
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
