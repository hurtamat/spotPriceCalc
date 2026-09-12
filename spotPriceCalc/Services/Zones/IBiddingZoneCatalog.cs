using spotPriceCalc.Domain;

namespace spotPriceCalc.Services.Zones;

/// <summary>The bidding zones the system knows about.</summary>
public interface IBiddingZoneCatalog
{
    IReadOnlyList<BiddingZone> All { get; }

    bool TryByCode(string code, out BiddingZone zone);

    bool TryById(int id, out BiddingZone zone);
}
