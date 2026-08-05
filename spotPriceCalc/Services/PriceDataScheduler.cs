namespace spotPriceCalc.Services;

// In-process price-data trigger: on startup populate yesterday/today/tomorrow (catch-up), then daily populate
// tomorrow shortly after the day-ahead auction clears. Only decides *when* — the fetch + retry-until-complete
// lives in ISpotPriceService.PopulateUntilCompleteAsync. Needs min-replicas >= 1 (a timer needs a running
// replica); move to a Container Apps cron Job if the API ever scales to zero.
public class PriceDataScheduler : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<PriceDataScheduler> _logger;

    // Daily run time, Central European (CET/CEST); IANA id resolves on Linux and Windows.
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

    // Startup catch-up: yesterday, today, tomorrow, in order (each confirmed before the next).
    private async Task RunStartupPopulateAsync(CancellationToken ct)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        _logger.LogInformation("Startup populate: yesterday, today, tomorrow");

        await PopulateAsync(today.AddDays(-1), "startup: yesterday", ct);
        await PopulateAsync(today, "startup: today", ct);
        await PopulateAsync(today.AddDays(1), "startup: tomorrow", ct);
    }

    // Runs the retry-until-complete populate for one date in a fresh scope. Never throws — logs and continues.
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
