using Microsoft.EntityFrameworkCore;
using spotPriceCalc.Infrastructure.ExternalClients;
using spotPriceCalc.Infrastructure.ExternalClients.OpenMeteo;
using spotPriceCalc.Infrastructure.Persistence;
using spotPriceCalc.Infrastructure.Persistence.Repositories;
using spotPriceCalc.Services;

var builder = WebApplication.CreateBuilder(args);

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

app.MapControllers();

app.Run();