namespace spotPriceCalc.Services.SmartHome;

// Resolves GPS coordinates to the bidding zone that governs their price. Its own interface so the real geo
// lookup can land later without touching the scheduler.
public interface IZoneLocatorService
{
    int ResolveBiddingZone(decimal latitude, decimal longitude);
}
