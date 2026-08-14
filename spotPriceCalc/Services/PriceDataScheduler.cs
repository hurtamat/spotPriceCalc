namespace spotPriceCalc.Services;

// In-process price-data trigger: on startup populate yesterday/today/tomorrow (catch-up), then daily populate
// tomorrow shortly after the day-ahead auction clears. Only decides *when* — the fetch + retry-until-complete
// lives in ISpotPriceService.PopulateUntilCompleteAsync. Needs min-replicas >= 1 (a timer needs a running
// replica); move to a Container Apps cron Job if the API ever scales to zero.
public class PriceDataScheduler : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<PriceDataScheduler> _logger;

    // Trailing days fetched at startup so the first classification has a full window. Matches
    // SpotPriceService.QuantileWindowDays.
    private const int QuantileWindowDays = 7;

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
                    "Next daily populate (tomorrow) scheduled for {NextRunUtc:o} ({RunTime} CET, in {Delay})",
                    nextRunUtc, DailyRunTime, delay);

                await Task.Delay(delay, stoppingToken);
                
                var tomorrow = DateOnly.FromDateTime(DateTime.UtcNow).AddDays(1);
                await PopulateAsync(tomorrow, "daily 13:25 CET", stoppingToken);
            }
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            // Normal shutdown, nothing to do.
        }
    }

    // Startup catch-up. History first (one call per zone, unclassified) so that when yesterday classifies
    // it already has its full trailing window; then the three real days, oldest-first, each classifying
    // its own zones.
    private async Task RunStartupPopulateAsync(CancellationToken ct)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        // Ends the day before yesterday — yesterday itself arrives (classified) in the populate below.
        await BackfillHistoryAsync(today.AddDays(-QuantileWindowDays), today.AddDays(-2), ct);

        _logger.LogInformation("Startup populate: yesterday, today, tomorrow");
        await PopulateAsync(today.AddDays(-1), "startup: yesterday", ct);
        await PopulateAsync(today, "startup: today", ct);
        await PopulateAsync(today.AddDays(1), "startup: tomorrow", ct);
    }

    private async Task BackfillHistoryAsync(DateOnly from, DateOnly to, CancellationToken ct)
    {
        try
        {
            _logger.LogInformation("Startup history backfill {From}..{To}", from, to);
            await using var scope = _scopeFactory.CreateAsyncScope();
            var service = scope.ServiceProvider.GetRequiredService<ISpotPriceService>();
            await service.BackfillHistoryAsync(from, to, ct);
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            // History is context, not correctness — a failure just means thinner quantile windows.
            _logger.LogError(ex, "History backfill {From}..{To} threw — startup continues", from, to);
        }
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
