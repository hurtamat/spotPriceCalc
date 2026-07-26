namespace spotPriceCalc.Services;

/// <summary>The in-process price-data trigger. Two responsibilities:
/// <list type="number">
///   <item>On startup: populate <b>yesterday, today, tomorrow</b> (a catch-up so a fresh boot / redeploy
///   isn't missing recent days), each awaited and retried until every zone lands.</item>
///   <item>Daily at <b>13:25 CET/CEST</b> (shortly after the ~12:45 CET day-ahead auction clears): populate
///   <b>tomorrow</b>.</item>
/// </list>
/// The actual fetch + "retry until all zones present" lives in <see cref="ISpotPriceService.PopulateUntilCompleteAsync"/> —
/// this class only decides <i>when</i>. Runs in-process, so the app must stay at min-replicas ≥ 1 in
/// Container Apps (a scaled-to-zero container has no running timer). If we later want the API to scale to
/// zero, move the daily job to a Container Apps Job (cron) that calls the same service method.</summary>
public class PriceDataScheduler : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<PriceDataScheduler> _logger;

    // 13:25 local time, Central European (CET/CEST). IANA id resolves on Linux (Container Apps) and on
    private static readonly TimeOnly DailyRunTime = new(17, 28);
    private static readonly TimeZoneInfo CentralEurope = TimeZoneInfo.FindSystemTimeZoneById("Europe/Prague");

    public PriceDataScheduler(IServiceScopeFactory scopeFactory, ILogger<PriceDataScheduler> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            await RunStartupPopulateAsync(stoppingToken);

            while (!stoppingToken.IsCancellationRequested)
            {
                var nextRunUtc = NextRunUtc(DateTimeOffset.UtcNow);
                var delay = nextRunUtc - DateTimeOffset.UtcNow;
                _logger.LogInformation(
                    "Next daily populate (tomorrow) scheduled for {NextRunUtc:o} (13:25 CET, in {Delay})",
                    nextRunUtc, delay);

                await Task.Delay(delay, stoppingToken);
                
                var tomorrow = DateOnly.FromDateTime(DateTime.UtcNow).AddDays(1);
                await PopulateAsync(tomorrow, "daily 13:25 CET", stoppingToken);
            }
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            // Normal shutdown — nothing to do.
        }
    }

    /// <summary>Startup catch-up: yesterday, today, tomorrow, in order. Awaited, so each is confirmed
    /// complete (or given up on) before the next. Runs in the background — it does not block app boot.</summary>
    private async Task RunStartupPopulateAsync(CancellationToken ct)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        _logger.LogInformation("Startup populate: yesterday, today, tomorrow");

        await PopulateAsync(today.AddDays(-1), "startup: yesterday", ct);
        await PopulateAsync(today, "startup: today", ct);
        await PopulateAsync(today.AddDays(1), "startup: tomorrow", ct);
    }

    /// <summary>Resolves a fresh scope (the service + its DbContext are scoped) and runs the retry-until-complete
    /// populate for one date. Never throws — a failed run is logged and the schedule loop continues.</summary>
    private async Task PopulateAsync(DateOnly date, string reason, CancellationToken ct)
    {
        try
        {
            _logger.LogInformation("Populate triggered ({Reason}) for {Date}", reason, date);
            await using var scope = _scopeFactory.CreateAsyncScope();
            var service = scope.ServiceProvider.GetRequiredService<ISpotPriceService>();
            await service.PopulateUntilCompleteAsync(date, ct);
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested)
        {
            throw; // let shutdown propagate
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Populate ({Reason}) for {Date} threw — schedule continues", reason, date);
        }
    }

    /// <summary>Next occurrence of 13:25 CET/CEST strictly after <paramref name="fromUtc"/>, as UTC.</summary>
    private static DateTimeOffset NextRunUtc(DateTimeOffset fromUtc)
    {
        var localNow = TimeZoneInfo.ConvertTime(fromUtc, CentralEurope);
        // Build the target wall-clock time (Unspecified kind) so ConvertTimeToUtc applies the zone's DST rules.
        var targetLocal = localNow.Date.Add(DailyRunTime.ToTimeSpan());
        if (targetLocal <= localNow.DateTime)
            targetLocal = targetLocal.AddDays(1);

        var targetUtc = TimeZoneInfo.ConvertTimeToUtc(
            DateTime.SpecifyKind(targetLocal, DateTimeKind.Unspecified), CentralEurope);
        return new DateTimeOffset(targetUtc, TimeSpan.Zero);
    }
}
