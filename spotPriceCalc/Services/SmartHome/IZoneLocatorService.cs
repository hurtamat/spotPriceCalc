namespace spotPriceCalc.Services.SmartHome;

/// <summary>Resolves GPS coordinates to the bidding zone that governs their electricity price.
/// Single responsibility so the real geo lookup can land later without touching the scheduler.</summary>
public interface IZoneLocatorService
{
    /// <summary>Returns the seeded <c>BiddingZone.Id</c> whose area contains the point.</summary>
    int ResolveBiddingZone(decimal latitude, decimal longitude);
}
