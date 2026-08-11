using Microsoft.EntityFrameworkCore;
using spotPriceCalc.Infrastructure.ExternalClients;
using spotPriceCalc.Infrastructure.ExternalClients.OpenMeteo;
using spotPriceCalc.Infrastructure.Persistence;
using spotPriceCalc.Infrastructure.Persistence.Repositories;
using spotPriceCalc.Services;
using spotPriceCalc.Services.SmartHome;

var builder = WebApplication.CreateBuilder(args);

const string FrontendCors = "frontend-dev";
// Allowed origins come from config (Cors:AllowedOrigins) so each environment can add its own frontend
// URL — e.g. the deployed Container App — without a code change. Falls back to the local Vite origins.
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

builder.Services.AddControllers();

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("Postgres")));

builder.Services.AddHttpClient<ISpotPriceProvider, EntsoeSpotPriceClient>(c =>
    c.BaseAddress = new Uri(builder.Configuration["Entsoe:BaseUrl"]));

builder.Services.AddHttpClient<IWeatherProvider, OpenMeteoWeatherClient>(c =>
    c.BaseAddress = new Uri(builder.Configuration["OpenMeteo:BaseUrl"]));

// Trailing slash on the base URL matters — without it "price-zones" replaces the last path segment.
builder.Services.AddHttpClient<IPriceZoneProvider, CalcServicePriceZoneClient>(c =>
    c.BaseAddress = new Uri(builder.Configuration["CalcService:BaseUrl"]
                            ?? throw new InvalidOperationException("CalcService:BaseUrl is not configured.")));

builder.Services.AddScoped<ISpotPriceRepository, SpotPriceRepository>();
builder.Services.AddScoped<IWeatherRepository, WeatherRepository>();

builder.Services.AddScoped<ISpotPriceService, SpotPriceService>();

// In-process price-data trigger: startup catch-up (yesterday/today/tomorrow) + daily 13:25 CET populate
// of tomorrow. Resolves ISpotPriceService per run via a scope. Requires min-replicas >= 1 when hosted.
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

// In containers (compose or Azure Container Apps) the app serves plain HTTP on 8080 and the platform's
// ingress terminates TLS, so an in-app HTTP->HTTPS redirect just breaks requests. Only redirect when
// running natively (e.g. Rider's https launch profile). The base aspnet image sets this env var.
if (!builder.Configuration.GetValue<bool>("DOTNET_RUNNING_IN_CONTAINER"))
{
    app.UseHttpsRedirection();
}

app.UseCors(FrontendCors);

app.MapControllers();

app.Run();