using spotPriceCalc.Domain;
using spotPriceCalc.Infrastructure.Persistence;

namespace spotPriceCalc.Services.Zones;

/// <summary>The real catalog: the hardcoded seed list</summary>
public class BiddingZoneCatalog : IBiddingZoneCatalog
{
    public IReadOnlyList<BiddingZone> All => BiddingZoneSeedData.Zones;

    public bool TryByCode(string code, out BiddingZone zone) =>
        BiddingZoneSeedData.ByCode.TryGetValue(code, out zone!);

    public bool TryById(int id, out BiddingZone zone) =>
        BiddingZoneSeedData.ById.TryGetValue(id, out zone!);
}
