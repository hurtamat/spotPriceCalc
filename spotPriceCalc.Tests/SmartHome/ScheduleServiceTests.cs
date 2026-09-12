using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Time.Testing;
using spotPriceCalc.Domain;
using spotPriceCalc.Dtos.Schedule;
using spotPriceCalc.Services.SmartHome;
using Xunit;

namespace spotPriceCalc.Tests.SmartHome;

// Tested through BuildAsync, not the private helpers.
public class ScheduleServiceTests
{
    private static readonly BiddingZone Zone = new()
    {
        Id = 6,
        Name = "Czech Republic",
        Code = "10YCZ-CEPS-----N",
        TimeZoneId = "Europe/Prague",
    };

    private static DateTime Utc(int year, int month, int day, int hour, int minute = 0) =>
        new(year, month, day, hour, minute, 0, DateTimeKind.Utc);

    private static ScheduleService Service(FakeSpotPriceService prices, DateTime nowUtc) =>
        new(prices,
            new FakeTimeProvider(new DateTimeOffset(nowUtc, TimeSpan.Zero)),
            NullLogger<ScheduleService>.Instance);

    private static ScheduleRequest Job(
        double hours,
        DateTime? readyBy = null,
        bool continuous = false,
        UnavailableWindow? unavailable = null) => new()
    {
        DeviceId = "test-device",
        ZoneCode = Zone.Code,
        DurationHours = hours,
        ReadyByUtc = readyBy,
        ContinuousBlock = continuous,
        Unavailable = unavailable,
    };

    private static UnavailableWindow Between(TimeOnly from, TimeOnly to) => new() { From = from, To = to };

    private static TimeOnly At(int hour) => new(hour, 0);

    #region Window and anchoring

    [Fact]
    public async Task NoDeadline_AnchorsTwentyFourHoursOut_AndWillNotReachPastIt()
    {
        var now = Utc(2026, 8, 13, 12);
        // Deadline is now + 24h = 14th 12:00Z, so the 1 EUR slot starting there ends past it.
        var prices = new FakeSpotPriceService(Curve.Hourly(Utc(2026, 8, 14, 10), 50m, 20m, 1m, 30m));

        var result = await Service(prices, now).BuildAsync(Zone, Job(hours: 1), default);

        Assert.True(result.Scheduled);
        var block = Assert.Single(result.Blocks);
        Assert.Equal(Utc(2026, 8, 14, 11), block.StartUtc);
        Assert.Equal(Utc(2026, 8, 14, 12), block.EndUtc);
        Assert.Equal(20m, block.EurPerMwh);
    }

    [Fact]
    public async Task DeadlineInsideTheLookBack_NeverSchedulesBeforeNow()
    {
        // "Ready by 06:00" polled at 22:00: a 24h look-back opens 16 hours of already-gone cheap slots.
        var now = Utc(2026, 8, 13, 20);
        var deadline = Utc(2026, 8, 14, 4);

        var prices = new FakeSpotPriceService(
            Curve.Hourly(Utc(2026, 8, 13, 2), 1m, 1m)   // already gone
                .Concat(Curve.Hourly(Utc(2026, 8, 13, 20), 50m, 40m, 30m, 35m, 45m, 20m, 10m, 15m)));

        var result = await Service(prices, now).BuildAsync(Zone, Job(hours: 2, readyBy: deadline), default);

        Assert.True(result.Scheduled);
        Assert.All(result.Blocks, b => Assert.True(b.StartUtc >= now, $"{b.StartUtc:o} is in the past"));

        var block = Assert.Single(result.Blocks);
        Assert.Equal(Utc(2026, 8, 14, 2), block.StartUtc);
        Assert.Equal(Utc(2026, 8, 14, 4), block.EndUtc);
        Assert.Equal(12.5m, block.EurPerMwh);
    }

    [Fact]
    public async Task SlotStraddlingAWindowEdge_IsRefusedWhole()
    {
        // A slot is indivisible, so one overlapping either edge is dropped rather than trimmed.
        var now = Utc(2026, 8, 13, 12, 30);
        var deadline = Utc(2026, 8, 13, 18);

        var prices = new FakeSpotPriceService(
            Curve.Hourly(Utc(2026, 8, 13, 12), 1m, 50m, 60m, 55m, 52m, 58m)   // 12:00 straddles windowStart
                .Concat(Curve.Hourly(Utc(2026, 8, 13, 18), 2m)));             // 18:00 ends past the deadline

        var result = await Service(prices, now).BuildAsync(Zone, Job(hours: 1, readyBy: deadline), default);

        // Both the 1 and 2 EUR slots undercut everything eligible, and neither may be used.
        var block = Assert.Single(result.Blocks);
        Assert.Equal(Utc(2026, 8, 13, 13), block.StartUtc);
        Assert.Equal(50m, block.EurPerMwh);
    }

    [Fact]
    public async Task LoadsMarketDaysAroundTheDeadline_ByCetDayNotUtcDate()
    {
        // 23:30Z is still the 13th in UTC but already the 14th in CET — the day the slot was published under.
        var now = Utc(2026, 8, 13, 20);
        var deadline = Utc(2026, 8, 13, 23, 30);
        var prices = new FakeSpotPriceService(Curve.Hourly(Utc(2026, 8, 13, 20), 40m, 12m, 30m, 5m));

        var result = await Service(prices, now).BuildAsync(Zone, Job(hours: 1, readyBy: deadline), default);

        Assert.True(prices.LastRangeRequested.HasValue);
        Assert.Equal(new DateOnly(2026, 8, 13), prices.LastRangeRequested!.Value.From);
        Assert.Equal(new DateOnly(2026, 8, 15), prices.LastRangeRequested!.Value.To);

        var block = Assert.Single(result.Blocks);
        Assert.Equal(Utc(2026, 8, 13, 21), block.StartUtc);
        Assert.Equal(12m, block.EurPerMwh);
    }

    #endregion

    #region Cheapest hours (continuous_block = false)

    [Fact]
    public async Task Cheapest_PicksTheCheapestSlots_AndReturnsThemInStartOrder()
    {
        var now = Utc(2026, 8, 13, 0);
        var deadline = Utc(2026, 8, 13, 12);
        var prices = new FakeSpotPriceService(
            Curve.Hourly(Utc(2026, 8, 13, 0), 60m, 30m, 70m, 20m, 80m, 10m));

        var result = await Service(prices, now).BuildAsync(Zone, Job(hours: 3, readyBy: deadline), default);

        Assert.True(result.Scheduled);
        Assert.Equal(3, result.Blocks.Count);

        // Ranked 10, 20, 30 by price; handed back 30, 20, 10 by start — the device runs a clock, not a ranking.
        Assert.Equal(Utc(2026, 8, 13, 1), result.Blocks[0].StartUtc);
        Assert.Equal(30m, result.Blocks[0].EurPerMwh);
        Assert.Equal(Utc(2026, 8, 13, 3), result.Blocks[1].StartUtc);
        Assert.Equal(20m, result.Blocks[1].EurPerMwh);
        Assert.Equal(Utc(2026, 8, 13, 5), result.Blocks[2].StartUtc);
        Assert.Equal(10m, result.Blocks[2].EurPerMwh);
    }

    [Fact]
    public async Task Cheapest_CannotCoverTheDuration_ReportsNotScheduledWithNoBlocks()
    {
        // A half-charged car is a failed job, not a cheap one. Never a partial plan.
        var now = Utc(2026, 8, 13, 0);
        var deadline = Utc(2026, 8, 13, 4);
        var prices = new FakeSpotPriceService(Curve.Hourly(Utc(2026, 8, 13, 0), 10m, 20m));

        var result = await Service(prices, now).BuildAsync(Zone, Job(hours: 8, readyBy: deadline), default);

        Assert.False(result.Scheduled);
        Assert.Empty(result.Blocks);
    }

    [Fact]
    public async Task Cheapest_ExactlyCoversTheDuration_IsScheduled()
    {
        // covered == needed must pass; durations are TimeSpans, so it's an exact comparison.
        var now = Utc(2026, 8, 13, 0);
        var deadline = Utc(2026, 8, 13, 4);
        var prices = new FakeSpotPriceService(Curve.Hourly(Utc(2026, 8, 13, 0), 10m, 20m, 30m, 40m));

        var result = await Service(prices, now).BuildAsync(Zone, Job(hours: 4, readyBy: deadline), default);

        Assert.True(result.Scheduled);
        var block = Assert.Single(result.Blocks);
        Assert.Equal(Utc(2026, 8, 13, 0), block.StartUtc);
        Assert.Equal(Utc(2026, 8, 13, 4), block.EndUtc);
        Assert.Equal(25m, block.EurPerMwh);
    }

    [Fact]
    public async Task Cheapest_DurationNotAWholeNumberOfSlots_OverDeliversRatherThanFail()
    {
        // 2.5h of hourly slots runs 3h: the job is satisfied and the extra half hour is cheap. Deliberate.
        var now = Utc(2026, 8, 13, 0);
        var deadline = Utc(2026, 8, 13, 6);
        var prices = new FakeSpotPriceService(
            Curve.Hourly(Utc(2026, 8, 13, 0), 10m, 90m, 20m, 95m, 30m, 99m));

        var result = await Service(prices, now).BuildAsync(Zone, Job(hours: 2.5, readyBy: deadline), default);

        Assert.True(result.Scheduled);
        Assert.Equal(3, result.Blocks.Count);
        var total = result.Blocks.Aggregate(TimeSpan.Zero, (sum, b) => sum + (b.EndUtc - b.StartUtc));
        Assert.Equal(TimeSpan.FromHours(3), total);
    }

    [Fact]
    public async Task Cheapest_NegativePrices_AreRankedBelowZero()
    {
        // Negative prices are normal here, and Cost = Price × hours goes negative with them.
        var now = Utc(2026, 8, 13, 0);
        var deadline = Utc(2026, 8, 13, 6);
        var prices = new FakeSpotPriceService(
            Curve.Hourly(Utc(2026, 8, 13, 0), 5m, -20m, 8m, -35m, 12m, 3m));

        var result = await Service(prices, now).BuildAsync(Zone, Job(hours: 2, readyBy: deadline), default);

        Assert.Equal(2, result.Blocks.Count);
        Assert.Equal(-20m, result.Blocks[0].EurPerMwh);
        Assert.Equal(Utc(2026, 8, 13, 1), result.Blocks[0].StartUtc);
        Assert.Equal(-35m, result.Blocks[1].EurPerMwh);
        Assert.Equal(Utc(2026, 8, 13, 3), result.Blocks[1].StartUtc);
    }

    #endregion

    #region Back-to-back run (continuous_block = true)

    [Fact]
    public async Task Contiguous_PrefersTheCheapestRun_NotTheCheapestSlots()
    {
        var now = Utc(2026, 8, 13, 0);
        var deadline = Utc(2026, 8, 13, 8);
        var prices = new FakeSpotPriceService(
            Curve.Hourly(Utc(2026, 8, 13, 0), 1m, 99m, 1m, 10m, 10m, 10m, 99m, 99m));

        var result = await Service(prices, now)
            .BuildAsync(Zone, Job(hours: 3, readyBy: deadline, continuous: true), default);

        // The cheapest three slots (1, 1, 10) don't adjoin, so they lose to the 1 + 10 + 10 run at 02:00.
        var block = Assert.Single(result.Blocks);
        Assert.Equal(Utc(2026, 8, 13, 2), block.StartUtc);
        Assert.Equal(Utc(2026, 8, 13, 5), block.EndUtc);
        Assert.Equal(7m, block.EurPerMwh);
    }

    [Fact]
    public async Task Contiguous_GapInTheStoredCurve_BreaksTheRun()
    {
        // Two 2h islands: four cheap hours exist, no three of them adjoin.
        var now = Utc(2026, 8, 13, 0);
        var deadline = Utc(2026, 8, 13, 12);
        var curve = Curve.Hourly(Utc(2026, 8, 13, 0), 10m, 10m)
            .Concat(Curve.Hourly(Utc(2026, 8, 13, 5), 10m, 10m))
            .ToList();

        var continuous = await Service(new FakeSpotPriceService(curve), now)
            .BuildAsync(Zone, Job(hours: 3, readyBy: deadline, continuous: true), default);

        Assert.False(continuous.Scheduled);
        Assert.Empty(continuous.Blocks);

        // Same curve split-allowed succeeds: it's adjacency that fails, not supply.
        var split = await Service(new FakeSpotPriceService(curve), now)
            .BuildAsync(Zone, Job(hours: 3, readyBy: deadline), default);

        Assert.True(split.Scheduled);
    }

    [Fact]
    public async Task Contiguous_MixedResolutionAcrossTheSpan_MeasuresDurationNotSlotCount()
    {
        // LoadSlotsAsync reads three days, so a PT60M → PT15M change can fall inside one request.
        // Counting slots instead of summing lengths hands back 15 minutes for a one-hour job.
        var now = Utc(2026, 8, 13, 20);
        var deadline = Utc(2026, 8, 14, 4);

        var curve = Curve.Hourly(Utc(2026, 8, 13, 20), 50m, 50m, 50m, 50m)
            .Concat(Curve.QuarterHourly(Utc(2026, 8, 14, 0), 10m, 10m, 10m, 10m, 10m, 10m, 10m, 10m))
            .Concat(Curve.Hourly(Utc(2026, 8, 14, 2), 50m, 50m));

        var result = await Service(new FakeSpotPriceService(curve), now)
            .BuildAsync(Zone, Job(hours: 1, readyBy: deadline, continuous: true), default);

        var block = Assert.Single(result.Blocks);
        Assert.Equal(TimeSpan.FromHours(1), block.EndUtc - block.StartUtc);
        Assert.Equal(Utc(2026, 8, 14, 0), block.StartUtc);
        Assert.Equal(10m, block.EurPerMwh);
    }

    [Fact]
    public async Task Contiguous_RunsOfEqualCost_TakesTheEarliest()
    {
        // The device caches the plan; a re-fetch returning an equally cheap other run would move the relay.
        var now = Utc(2026, 8, 13, 0);
        var deadline = Utc(2026, 8, 13, 8);
        var prices = new FakeSpotPriceService(
            Curve.Hourly(Utc(2026, 8, 13, 0), 10m, 10m, 99m, 10m, 10m, 99m, 99m, 99m));

        var result = await Service(prices, now)
            .BuildAsync(Zone, Job(hours: 2, readyBy: deadline, continuous: true), default);

        var block = Assert.Single(result.Blocks);
        Assert.Equal(Utc(2026, 8, 13, 0), block.StartUtc);
        Assert.Equal(Utc(2026, 8, 13, 2), block.EndUtc);
    }

    #endregion

    #region The unavailable window

    [Fact]
    public async Task Unavailable_ExcludesSlotsInsideIt_AndIsHalfOpenAtTo()
    {
        var now = Utc(2026, 8, 13, 0);
        var deadline = Utc(2026, 8, 13, 12);
        var prices = new FakeSpotPriceService(
            Curve.Hourly(Utc(2026, 8, 13, 0), 90m, 95m, 1m, 2m, 3m, 99m));

        var result = await Service(prices, now).BuildAsync(
            Zone, Job(hours: 1, readyBy: deadline, unavailable: Between(At(2), At(4))), default);

        // 1 and 2 EUR fall inside the window; 3 EUR starts exactly at `to` and runs.
        var block = Assert.Single(result.Blocks);
        Assert.Equal(Utc(2026, 8, 13, 4), block.StartUtc);
        Assert.Equal(3m, block.EurPerMwh);
    }

    [Fact]
    public async Task Unavailable_WrappingPastMidnight_ExcludesBothSides()
    {
        // from > to is a wrap, e.g. quiet hours of 22:00–06:00.
        var now = Utc(2026, 8, 13, 20);
        var deadline = Utc(2026, 8, 14, 8);
        var prices = new FakeSpotPriceService(Curve.Hourly(
            Utc(2026, 8, 13, 20), 50m, 55m, 1m, 2m, 3m, 4m, 5m, 6m, 7m, 8m, 40m, 45m));

        var result = await Service(prices, now).BuildAsync(
            Zone, Job(hours: 1, readyBy: deadline, unavailable: Between(At(22), At(6))), default);

        // The whole cheap 22:00–05:00 stretch is refused, leaving 40 EUR at 06:00.
        var block = Assert.Single(result.Blocks);
        Assert.Equal(Utc(2026, 8, 14, 6), block.StartUtc);
        Assert.Equal(40m, block.EurPerMwh);
    }

    [Fact]
    public async Task Unavailable_LeavesTooFewHours_ReportsNotScheduled()
    {
        var now = Utc(2026, 8, 13, 0);
        var deadline = Utc(2026, 8, 13, 6);
        var prices = new FakeSpotPriceService(
            Curve.Hourly(Utc(2026, 8, 13, 0), 10m, 10m, 10m, 10m, 10m, 10m));

        var result = await Service(prices, now).BuildAsync(
            Zone, Job(hours: 4, readyBy: deadline, unavailable: Between(At(1), At(5))), default);

        // Six hours stored, four excluded: the exclusion is what makes the job unplaceable.
        Assert.False(result.Scheduled);
        Assert.Empty(result.Blocks);
    }

    #endregion

    #region Merging into blocks

    [Fact]
    public async Task AdjacentChosenSlots_MergeIntoOneBlock_SeparatedOnesStayApart()
    {
        var now = Utc(2026, 8, 13, 0);
        var deadline = Utc(2026, 8, 13, 8);
        var prices = new FakeSpotPriceService(
            Curve.Hourly(Utc(2026, 8, 13, 0), 10m, 12m, 99m, 11m, 99m, 99m, 99m, 99m));

        var result = await Service(prices, now).BuildAsync(Zone, Job(hours: 3, readyBy: deadline), default);

        // 10, 11 and 12 are chosen; the first two adjoin and collapse, the third stands alone.
        Assert.Equal(2, result.Blocks.Count);
        Assert.Equal(Utc(2026, 8, 13, 0), result.Blocks[0].StartUtc);
        Assert.Equal(Utc(2026, 8, 13, 2), result.Blocks[0].EndUtc);
        Assert.Equal(11m, result.Blocks[0].EurPerMwh);
        Assert.Equal(Utc(2026, 8, 13, 3), result.Blocks[1].StartUtc);
        Assert.Equal(Utc(2026, 8, 13, 4), result.Blocks[1].EndUtc);
    }

    [Fact]
    public async Task BlockPrice_IsWeightedByDuration_NotAPlainAverage()
    {
        // 1h at 100 then two quarter-hours at 20: plain mean 46.67, weighted 110 / 1.5 = 73.3333.
        var now = Utc(2026, 8, 13, 0);
        var deadline = Utc(2026, 8, 13, 6);

        var curve = Curve.Hourly(Utc(2026, 8, 13, 0), 100m)
            .Concat(Curve.QuarterHourly(Utc(2026, 8, 13, 1), 20m, 20m))
            .Concat(Curve.Hourly(Utc(2026, 8, 13, 1, 30), 999m, 999m));

        var result = await Service(new FakeSpotPriceService(curve), now)
            .BuildAsync(Zone, Job(hours: 1.5, readyBy: deadline, continuous: true), default);

        var block = Assert.Single(result.Blocks);
        Assert.Equal(Utc(2026, 8, 13, 0), block.StartUtc);
        Assert.Equal(Utc(2026, 8, 13, 1, 30), block.EndUtc);
        Assert.Equal(73.3333m, block.EurPerMwh);
    }

    #endregion
}
