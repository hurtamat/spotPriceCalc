namespace spotPriceCalc.Services;

// On startup populate yesterday/today/tomorrow then daily populate job.
public class PriceDataScheduler : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<PriceDataScheduler> _logger;

    private const int QuantileWindowDays = 7;

    // Daily run at 13:21 CET, chosen to avoid a round time other people might use
    private static readonly TimeOnly DailyRunTime = new(13, 21);
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

    // History first, then the three real days oldest first so yesterday has its full trailing window.
    private async Task RunStartupPopulateAsync(CancellationToken ct)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        // Ends the day before yesterday; yesterday itself arrives classified in the populate below.
        await BackfillHistoryAsync(today.AddDays(-QuantileWindowDays), today.AddDays(-2), ct);

        await PopulateAsync(today.AddDays(-1), "startup: yesterday", ct);
        await PopulateAsync(today, "startup: today", ct);
        
        if (DayAheadPublished(DateTimeOffset.UtcNow))
            await PopulateAsync(today.AddDays(1), "startup: tomorrow", ct);
        else
            _logger.LogInformation(
                "Startup: skipping tomorrow, before {RunTime} CET the day-ahead prices are not published",
                DailyRunTime);
    }

    // Whether tomorrow's prices should exist yet, in the same CET wall clock the daily run uses.
    private static bool DayAheadPublished(DateTimeOffset nowUtc) =>
        TimeOnly.FromDateTime(TimeZoneInfo.ConvertTime(nowUtc, CentralEurope).DateTime) >= DailyRunTime;

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
            // History is context, not correctness: a failure just means thinner quantile windows.
            _logger.LogError(ex, "History backfill {From}..{To} threw — startup continues", from, to);
        }
    }

    // Never throws; logs and continues.
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
