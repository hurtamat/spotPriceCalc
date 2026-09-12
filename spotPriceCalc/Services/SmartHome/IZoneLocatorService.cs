namespace spotPriceCalc.Services.SmartHome;

// Resolves GPS coordinates to the bidding zone that governs their price.
public interface IZoneLocatorService
{
    int ResolveBiddingZone(decimal latitude, decimal longitude);
}
