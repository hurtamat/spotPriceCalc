using spotPriceCalc.Infrastructure.ExternalClients;
using spotPriceCalc.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();

builder.Services.AddHttpClient<ISpotPriceProvider, EntsoeSpotPriceClient>(c =>
    c.BaseAddress = new Uri(builder.Configuration["Entsoe:BaseUrl"]));

builder.Services.AddScoped<ISpotPriceService, SpotPriceService>();

// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

app.MapControllers();

app.Run();