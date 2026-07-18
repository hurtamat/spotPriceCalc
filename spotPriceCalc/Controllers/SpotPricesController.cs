using Microsoft.AspNetCore.Mvc;
using spotPriceCalc.Dtos;
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

    /// <summary>GET /api/spotprices?date=2026-07-18 — day-ahead prices for the (hardcoded) zone.</summary>
    [HttpGet]
    public async Task<IActionResult> GetPrices([FromQuery] DateOnly date, CancellationToken ct)
    {
        var prices = await _service.GetPricesAsync(date, ct);
        return Ok(prices.Select(SpotPriceDto.From));
    }
}
