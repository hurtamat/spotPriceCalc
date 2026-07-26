using Microsoft.AspNetCore.Mvc;
using spotPriceCalc.Dtos.Schedule;
using spotPriceCalc.Services.SmartHome;

namespace spotPriceCalc.Controllers;

/// <summary>Shelly integration endpoint. POST /api/schedule — a Shelly device sends its availability window
/// and tasks, gets back the current relay state plus the per-task plan. Inherits the shared pipeline from
/// <see cref="SmartHomeIntegrationController"/>; if Shelly ever needs a vendor-specific request/response
/// shape, override <c>BuildScheduleAsync</c> here rather than touching the base.</summary>
[ApiController]
[Route("api/schedule")]
public class SmartHomeShellyController : SmartHomeIntegrationController
{
    public SmartHomeShellyController(IScheduleService schedule) : base(schedule)
    {
    }

    [HttpPost]
    public async Task<IActionResult> Post([FromBody] ScheduleRequest request, CancellationToken ct)
    {
        if (request.Tasks is null || request.Tasks.Count == 0)
            return BadRequest("At least one task is required.");

        var response = await BuildScheduleAsync(request, ct);
        return Ok(response);
    }
}
