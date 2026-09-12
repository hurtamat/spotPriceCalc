using System.Threading.RateLimiting;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Http.Resilience;
using spotPriceCalc.Infrastructure.ExternalClients;
using spotPriceCalc.Infrastructure.ExternalClients.OpenMeteo;
using spotPriceCalc.Infrastructure.Persistence;
using spotPriceCalc.Infrastructure.Persistence.Repositories;
using spotPriceCalc.Services;
using spotPriceCalc.Services.SmartHome;
using spotPriceCalc.Services.Zones;

var builder = WebApplication.CreateBuilder(args);

const string FrontendCors = "frontend-dev";
// Allowed origins come from config so each environment can add its own frontend URL without a code change.
var corsOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
                  ?? new[]
                  {
                      "http://localhost:5173", "http://127.0.0.1:5173",
                      "http://localhost:4173", "http://127.0.0.1:4173",
                  };
builder.Services.AddCors(options =>
    options.AddPolicy(FrontendCors, policy => policy
        .WithOrigins(corsOrigins)
        .AllowAnyHeader()
        .AllowAnyMethod()));

// Ingress terminates TLS and opens its own connection
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.ForwardLimit = 1;
    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();
});

// Per-caller ceiling
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(ctx =>
        RateLimitPartition.GetFixedWindowLimiter(
            ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions { PermitLimit = 120, Window = TimeSpan.FromMinutes(1) }));
});

builder.Services.AddControllers();

builder.Services.AddSingleton(TimeProvider.System);

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("Postgres")));

// Retry, breaker and timeouts for the two third-party APIs
static void Resilience(HttpStandardResilienceOptions o)
{
    o.AttemptTimeout.Timeout = TimeSpan.FromSeconds(20);
    o.Retry.MaxRetryAttempts = 3;
    o.TotalRequestTimeout.Timeout = TimeSpan.FromSeconds(70);
    o.CircuitBreaker.SamplingDuration = TimeSpan.FromSeconds(60);
}

builder.Services.AddHttpClient<ISpotPriceProvider, EntsoeSpotPriceClient>(c =>
        c.BaseAddress = new Uri(builder.Configuration["Entsoe:BaseUrl"]))
    .AddStandardResilienceHandler(Resilience);

builder.Services.AddHttpClient<IWeatherProvider, OpenMeteoWeatherClient>(c =>
        c.BaseAddress = new Uri(builder.Configuration["OpenMeteo:BaseUrl"]))
    .AddStandardResilienceHandler(Resilience);

// Trailing slash on the base URL matters, without it "price-zones" replaces the last path segment.
builder.Services.AddHttpClient<IPriceZoneProvider, CalcServicePriceZoneClient>(c =>
{
    c.BaseAddress = new Uri(builder.Configuration["CalcService:BaseUrl"]
                            ?? throw new InvalidOperationException("CalcService:BaseUrl is not configured."));
    c.Timeout = TimeSpan.FromSeconds(20);
});

builder.Services.AddSingleton<IBiddingZoneCatalog, BiddingZoneCatalog>();

builder.Services.AddScoped<ISpotPriceRepository, SpotPriceRepository>();
builder.Services.AddScoped<IWeatherRepository, WeatherRepository>();

builder.Services.AddScoped<ISpotPriceService, SpotPriceService>();

builder.Services.AddHostedService<PriceDataScheduler>();

// Smart-home scheduling: zone resolution + the device-agnostic decision engine.
builder.Services.AddScoped<IZoneLocatorService, ZoneLocatorService>();
builder.Services.AddScoped<IScheduleService, ScheduleService>();

builder.Services.AddOpenApi();

var app = builder.Build();

await DbInitializer.InitializeAsync(app.Services);

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseForwardedHeaders();

// In containers the platform's ingress terminates TLS, so only redirect when running natively.
if (!builder.Configuration.GetValue<bool>("DOTNET_RUNNING_IN_CONTAINER"))
{
    app.UseHttpsRedirection();
}

app.UseCors(FrontendCors);
app.UseRateLimiter();
app.MapControllers();

app.Run();
