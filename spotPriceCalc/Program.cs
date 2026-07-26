using Microsoft.EntityFrameworkCore;
using spotPriceCalc.Infrastructure.ExternalClients;
using spotPriceCalc.Infrastructure.ExternalClients.OpenMeteo;
using spotPriceCalc.Infrastructure.Persistence;
using spotPriceCalc.Infrastructure.Persistence.Repositories;
using spotPriceCalc.Services;
using spotPriceCalc.Services.SmartHome;

var builder = WebApplication.CreateBuilder(args);

const string FrontendCors = "frontend-dev";
builder.Services.AddCors(options =>
    options.AddPolicy(FrontendCors, policy => policy
        // Vite dev server (npm run dev) and preview (npm run preview).
        .WithOrigins(
            "http://localhost:5173", "http://127.0.0.1:5173",
            "http://localhost:4173", "http://127.0.0.1:4173")
        .AllowAnyHeader()
        .AllowAnyMethod()));

builder.Services.AddControllers();

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("Postgres")));

builder.Services.AddHttpClient<ISpotPriceProvider, EntsoeSpotPriceClient>(c =>
    c.BaseAddress = new Uri(builder.Configuration["Entsoe:BaseUrl"]));

builder.Services.AddHttpClient<IWeatherProvider, OpenMeteoWeatherClient>(c =>
    c.BaseAddress = new Uri(builder.Configuration["OpenMeteo:BaseUrl"]));

builder.Services.AddScoped<ISpotPriceRepository, SpotPriceRepository>();
builder.Services.AddScoped<IWeatherRepository, WeatherRepository>();

builder.Services.AddScoped<ISpotPriceService, SpotPriceService>();

// In-process price-data trigger: startup catch-up (yesterday/today/tomorrow) + daily 13:25 CET populate
// of tomorrow. Resolves ISpotPriceService per run via a scope. Requires min-replicas >= 1 when hosted.
builder.Services.AddHostedService<PriceDataScheduler>();

// Smart-home scheduling: zone resolution (stubbed) + the device-agnostic decision engine.
builder.Services.AddScoped<IZoneLocatorService, ZoneLocatorService>();
builder.Services.AddScoped<IScheduleService, ScheduleService>();

// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

var app = builder.Build();

// Apply migrations + seed bidding zones on startup.
await DbInitializer.InitializeAsync(app.Services);

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

app.UseCors(FrontendCors);

app.MapControllers();

app.Run();