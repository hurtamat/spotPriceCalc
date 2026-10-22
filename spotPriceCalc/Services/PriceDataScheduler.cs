using spotPriceCalc.Domain;

namespace spotPriceCalc.Services;

// Populates yesterday/today/tomorrow on startup, then the latest day every two hours.
public class PriceDataScheduler : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly TimeProvider _clock;
    private readonly ILogger<PriceDataScheduler> _logger;

    private const int QuantileWindowDays = 7;

    // Half an hour after ENTSO-E's 13:00 Prague deadline, the same in summer and winter.
    private static readonly TimeOnly PublishedBy = new(13, 30);
    private static readonly TimeSpan RunInterval = TimeSpan.FromHours(2);
    private static readonly TimeZoneInfo CentralEurope = TimeZoneInfo.FindSystemTimeZoneById("Europe/Prague");
    
    public PriceDataScheduler(
        IServiceScopeFactory scopeFactory, TimeProvider clock, ILogger<PriceDataScheduler> logger)
    {
        _scopeFactory = scopeFactory;
        _clock = clock;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            await RunStartupPopulateAsync(stoppingToken);

            while (!stoppingToken.IsCancellationRequested)
            {
                var nextRunUtc = NextRunUtc(_clock.GetUtcNow());
                var delay = nextRunUtc - _clock.GetUtcNow();
                _logger.LogInformation("Next populate scheduled for {NextRunUtc:o} (in {Delay})", nextRunUtc, delay);

                await Task.Delay(delay, _clock, stoppingToken);

                // Stored zones are skipped, so only missing ones hit ENTSO-E.
                var date = LatestMarketDay(_clock.GetUtcNow());
                await PopulateAsync(date, $"every {RunInterval.TotalHours:0} h", stoppingToken);
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
        var today = MarketDay.ContainingDay(_clock.GetUtcNow().UtcDateTime);

        // Ends the day before yesterday; yesterday itself arrives classified in the populate below.
        await BackfillHistoryAsync(today.AddDays(-QuantileWindowDays), today.AddDays(-2), ct);

        await PopulateAsync(today.AddDays(-1), "startup: yesterday", ct);
        await PopulateAsync(today, "startup: today", ct);

        if (DayAheadPublished(_clock.GetUtcNow()))
            await PopulateAsync(today.AddDays(1), "startup: tomorrow", ct);
        else
            _logger.LogInformation(
                "Startup: skipping tomorrow, before {PublishedBy} CET the day-ahead prices are not published",
                PublishedBy);
    }

    private static bool DayAheadPublished(DateTimeOffset nowUtc) =>
        TimeOnly.FromDateTime(TimeZoneInfo.ConvertTime(nowUtc, CentralEurope).DateTime) >= PublishedBy;

    // Before publication, today: catches zones that came in late.
    public static DateOnly LatestMarketDay(DateTimeOffset nowUtc)
    {
        var today = MarketDay.ContainingDay(nowUtc.UtcDateTime);
        return DayAheadPublished(nowUtc) ? today.AddDays(1) : today;
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
            await service.PopulateAsync(date, ct);
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

    // 13:30, 15:30, … 11:30 Prague; odd hours never fall in the 02:00–03:00 DST gap.
    public static DateTimeOffset NextRunUtc(DateTimeOffset fromUtc)
    {
        var localNow = TimeZoneInfo.ConvertTime(fromUtc, CentralEurope).DateTime;
        var firstOfDay = TimeSpan.FromTicks(PublishedBy.ToTimeSpan().Ticks % RunInterval.Ticks);

        var targetLocal = localNow.Date.Add(firstOfDay);
        while (targetLocal <= localNow)
            targetLocal = targetLocal.Add(RunInterval);

        // Unspecified kind, so ConvertTimeToUtc applies the zone's DST rules.
        var targetUtc = TimeZoneInfo.ConvertTimeToUtc(
            DateTime.SpecifyKind(targetLocal, DateTimeKind.Unspecified), CentralEurope);
        return new DateTimeOffset(targetUtc, TimeSpan.Zero);
    }
}
