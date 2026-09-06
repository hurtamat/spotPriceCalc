using System.Text.Json.Serialization;

namespace spotPriceCalc.Dtos.Schedule;

// Body of POST /api/schedule. One device, one job: a device id, its zone, and the hours it needs.
public record ScheduleRequest
{
    [JsonPropertyName("device_id")]
    public required string DeviceId { get; init; }

    // ENTSO-E area code, e.g. "10YCZ-CEPS-----N". A string, so nothing depends on our own ids.
    [JsonPropertyName("zone_code")]
    public required string ZoneCode { get; init; }

    // Total hours of power the job needs. The one field that is always required.
    [JsonPropertyName("duration_hours")]
    public double DurationHours { get; init; }

    // The instant (UTC) the job must finish by; the window is the 24h before it. Null ⇒ 24h from now.
    [JsonPropertyName("ready_by_utc")]
    public DateTime? ReadyByUtc { get; init; }

    // true ⇒ hours run back-to-back (boiler, washer). false ⇒ split for the cheapest hours (EV charging).
    [JsonPropertyName("continuous_block")]
    public bool ContinuousBlock { get; init; }

    // Time-of-day only; may wrap past midnight (from > to).
    [JsonPropertyName("unavailable")]
    public UnavailableWindow? Unavailable { get; init; }

    // The deadline: the one given, else 24h out.
    public DateTime ResolveDeadlineUtc(DateTime? nowUtc = null) =>
        ReadyByUtc is DateTime given
            ? DateTime.SpecifyKind(given, DateTimeKind.Utc)
            : DateTime.SpecifyKind(nowUtc ?? DateTime.UtcNow, DateTimeKind.Utc).AddHours(24);
}

public record UnavailableWindow
{
    [JsonPropertyName("from")]
    public TimeOnly From { get; init; }

    [JsonPropertyName("to")]
    public TimeOnly To { get; init; }
}
