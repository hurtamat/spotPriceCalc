using Microsoft.EntityFrameworkCore;
using spotPriceCalc.Infrastructure.ExternalClients;
using spotPriceCalc.Infrastructure.ExternalClients.OpenMeteo;
using spotPriceCalc.Infrastructure.Persistence;
using spotPriceCalc.Infrastructure.Persistence.Repositories;
using spotPriceCalc.Services;
using spotPriceCalc.Services.SmartHome;

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

builder.Services.AddControllers();

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("Postgres")));

builder.Services.AddHttpClient<ISpotPriceProvider, EntsoeSpotPriceClient>(c =>
    c.BaseAddress = new Uri(builder.Configuration["Entsoe:BaseUrl"]));

builder.Services.AddHttpClient<IWeatherProvider, OpenMeteoWeatherClient>(c =>
    c.BaseAddress = new Uri(builder.Configuration["OpenMeteo:BaseUrl"]));

// Trailing slash on the base URL matters, without it "price-zones" replaces the last path segment.
builder.Services.AddHttpClient<IPriceZoneProvider, CalcServicePriceZoneClient>(c =>
    c.BaseAddress = new Uri(builder.Configuration["CalcService:BaseUrl"]
                            ?? throw new InvalidOperationException("CalcService:BaseUrl is not configured.")));

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

// In containers the platform's ingress terminates TLS, so only redirect when running natively.
if (!builder.Configuration.GetValue<bool>("DOTNET_RUNNING_IN_CONTAINER"))
{
    app.UseHttpsRedirection();
}

app.UseCors(FrontendCors);

app.MapControllers();

app.Run();