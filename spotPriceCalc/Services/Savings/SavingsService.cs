using spotPriceCalc.Domain;
using spotPriceCalc.Dtos;
using spotPriceCalc.Dtos.Schedule;
using spotPriceCalc.Services.SmartHome;

namespace spotPriceCalc.Services.Savings;

// Prices one cycle of each appliance against today's curve, by asking the scheduler where it would run.
public class SavingsService : ISavingsService
{
    private readonly IScheduleService _schedule;
    private readonly TimeProvider _clock;

    public SavingsService(IScheduleService schedule, TimeProvider clock)
    {
        _schedule = schedule;
        _clock = clock;
    }

    // TODO(stub): the cycle table and the tariff are hard-coded, and the tariff is one number for all
    // 45 zones. Replace with per-zone retail prices and the household's own appliances.
    private static readonly decimal FixedPriceCtPerKwh = 20.529m;

    private record Appliance(
        string Key, string Name, decimal CycleKwh, decimal CycleHours, bool Continuous);

    private static readonly Appliance[] Appliances =
    [
        new("boiler", "Electric boiler", 7.5m, 3m, true),
        new("ev", "Electric car", 8.5m, 4m, false),
        new("pool", "Pool heating", 6.2m, 6m, true),
        new("ac", "Air conditioning", 2.0m, 6m, true),
        new("dishwasher", "Dishwasher", 1.2m, 2m, true),
        new("dryer", "Dryer", 2.5m, 2m, true),
    ];

    public async Task<ApplianceSavingsDto> GetApplianceSavingsAsync(BiddingZone zone, CancellationToken ct)
    {
        // The whole market day, past hours included: this names today's best hour, not the next usable one.
        var today = MarketDay.WindowUtc(MarketDay.ContainingDay(_clock.GetUtcNow().UtcDateTime));

        var plans = new List<AppliancePlanDto>(Appliances.Length);
        foreach (var appliance in Appliances)
            plans.Add(await PlanAsync(zone, appliance, today.FromUtc, today.ToUtcExclusive, ct));

        return new ApplianceSavingsDto(zone.Name, zone.TimeZoneId, FixedPriceCtPerKwh, plans);
    }

    private async Task<AppliancePlanDto> PlanAsync(
        BiddingZone zone, Appliance appliance, DateTime dayStartUtc, DateTime dayEndUtc, CancellationToken ct)
    {
        var request = new ScheduleRequest
        {
            DeviceId = "savings-page",
            ZoneCode = zone.Code,
            DurationHours = (double)appliance.CycleHours,
            ReadyByUtc = dayEndUtc,
            ContinuousBlock = appliance.Continuous,
        };

        var plan = await _schedule.BuildAsync(zone, request, ct, dayStartUtc);
        if (!plan.Scheduled || plan.Blocks.Count == 0)
            return new AppliancePlanDto(
                appliance.Key, appliance.Name, appliance.CycleKwh, appliance.CycleHours, null, null, null);

        var greenCt = WeightedCtPerKwh(plan.Blocks);
        var savedPerKwh = (FixedPriceCtPerKwh - greenCt) / 100m;
        var start = TimeZoneInfo.ConvertTimeFromUtc(
            DateTime.SpecifyKind(plan.Blocks.Min(b => b.StartUtc), DateTimeKind.Utc),
            TimeZoneInfo.FindSystemTimeZoneById(zone.TimeZoneId));

        return new AppliancePlanDto(
            appliance.Key, appliance.Name, appliance.CycleKwh, appliance.CycleHours,
            start.ToString("HH:mm"), greenCt, appliance.CycleKwh * savedPerKwh);
    }

    // Weighted by block length, so a split plan is priced by time in each block, not by block count.
    private static decimal WeightedCtPerKwh(IReadOnlyList<ScheduledBlock> blocks)
    {
        decimal minutes = 0, weighted = 0;
        foreach (var b in blocks)
        {
            var span = (decimal)(b.EndUtc - b.StartUtc).TotalMinutes;
            minutes += span;
            weighted += b.EurPerMwh * span;
        }

        return minutes == 0 ? 0 : weighted / minutes / 10m;
    }
}
