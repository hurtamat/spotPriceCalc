using spotPriceCalc.Domain;

namespace spotPriceCalc.Infrastructure.Persistence;

// Canonical bidding zones (source of truth). TimeZoneId drives the ENTSO-E UTC window; lat/lng drive the
// Open-Meteo weather query. Seeded at runtime by DbInitializer. Some EIC codes are virtual/aggregate zones.
public static class BiddingZoneSeedData
{
    public static readonly IReadOnlyList<BiddingZone> Zones = new List<BiddingZone>
    {
        new() { Id = 1,  Name = "Austria",            Code = "10YAT-APG------L", TimeZoneId = "Europe/Vienna",     Latitude = 48.21m, Longitude = 16.37m },
        new() { Id = 2,  Name = "Belgium",            Code = "10YBE----------2", TimeZoneId = "Europe/Brussels",   Latitude = 50.85m, Longitude = 4.35m },
        new() { Id = 3,  Name = "Bulgaria",           Code = "10YCA-BULGARIA-R", TimeZoneId = "Europe/Sofia",      Latitude = 42.70m, Longitude = 23.32m },
        new() { Id = 4,  Name = "Switzerland",        Code = "10YCH-SWISSGRIDZ", TimeZoneId = "Europe/Zurich",     Latitude = 46.95m, Longitude = 7.45m },
        new() { Id = 5,  Name = "Czech Republic",     Code = "10YCZ-CEPS-----N", TimeZoneId = "Europe/Prague",     Latitude = 50.08m, Longitude = 14.44m },
        new() { Id = 6,  Name = "Slovakia",           Code = "10YSK-SEPS-----K", TimeZoneId = "Europe/Bratislava", Latitude = 48.15m, Longitude = 17.11m },
        new() { Id = 7,  Name = "Germany-Luxembourg", Code = "10Y1001A1001A82H", TimeZoneId = "Europe/Berlin",     Latitude = 52.52m, Longitude = 13.41m },
        new() { Id = 8,  Name = "Estonia",            Code = "10Y1001A1001A39I", TimeZoneId = "Europe/Tallinn",    Latitude = 59.44m, Longitude = 24.75m },
        new() { Id = 9,  Name = "Spain",              Code = "10YES-REE------0", TimeZoneId = "Europe/Madrid",     Latitude = 40.42m, Longitude = -3.70m },
        new() { Id = 10, Name = "Finland",            Code = "10YFI-1--------U", TimeZoneId = "Europe/Helsinki",   Latitude = 60.17m, Longitude = 24.94m },
        new() { Id = 11, Name = "France",             Code = "10YFR-RTE------C", TimeZoneId = "Europe/Paris",      Latitude = 48.85m, Longitude = 2.35m },
        new() { Id = 12, Name = "Greece",             Code = "10YGR-HTSO-----Y", TimeZoneId = "Europe/Athens",     Latitude = 37.98m, Longitude = 23.73m },
        new() { Id = 13, Name = "Croatia",            Code = "10YHR-HEP------M", TimeZoneId = "Europe/Zagreb",     Latitude = 45.81m, Longitude = 15.98m },
        new() { Id = 14, Name = "Hungary",            Code = "10YHU-MAVIR----U", TimeZoneId = "Europe/Budapest",   Latitude = 47.50m, Longitude = 19.04m },
        new() { Id = 15, Name = "Lithuania",          Code = "10YLT-1001A0008Q", TimeZoneId = "Europe/Vilnius",    Latitude = 54.69m, Longitude = 25.28m },
        new() { Id = 16, Name = "Latvia",             Code = "10YLV-1001A00074", TimeZoneId = "Europe/Riga",       Latitude = 56.95m, Longitude = 24.11m },
        new() { Id = 17, Name = "Netherlands",        Code = "10YNL----------L", TimeZoneId = "Europe/Amsterdam",  Latitude = 52.37m, Longitude = 4.90m },
        new() { Id = 18, Name = "Poland",             Code = "10YPL-AREA-----S", TimeZoneId = "Europe/Warsaw",     Latitude = 52.23m, Longitude = 21.01m },
        new() { Id = 19, Name = "Portugal",           Code = "10YPT-REN------W", TimeZoneId = "Europe/Lisbon",     Latitude = 38.72m, Longitude = -9.14m },
        new() { Id = 20, Name = "Romania",            Code = "10YRO-TEL------P", TimeZoneId = "Europe/Bucharest",  Latitude = 44.43m, Longitude = 26.10m },
        new() { Id = 21, Name = "Slovenia",           Code = "10YSI-ELES-----O", TimeZoneId = "Europe/Ljubljana",  Latitude = 46.05m, Longitude = 14.51m },

        new() { Id = 22, Name = "Sweden SE1",         Code = "10Y1001A1001A44P", TimeZoneId = "Europe/Stockholm",  Latitude = 65.58m, Longitude = 22.15m },
        new() { Id = 23, Name = "Sweden SE2",         Code = "10Y1001A1001A45N", TimeZoneId = "Europe/Stockholm",  Latitude = 62.39m, Longitude = 17.31m },
        new() { Id = 24, Name = "Sweden SE3",         Code = "10Y1001A1001A46L", TimeZoneId = "Europe/Stockholm",  Latitude = 59.33m, Longitude = 18.07m },
        new() { Id = 25, Name = "Sweden SE4",         Code = "10Y1001A1001A47J", TimeZoneId = "Europe/Stockholm",  Latitude = 55.60m, Longitude = 13.00m },
        new() { Id = 26, Name = "Norway NO1",         Code = "10YNO-1--------2", TimeZoneId = "Europe/Oslo",       Latitude = 59.91m, Longitude = 10.75m },
        new() { Id = 27, Name = "Norway NO2",         Code = "10YNO-2--------T", TimeZoneId = "Europe/Oslo",       Latitude = 58.15m, Longitude = 8.00m },
        new() { Id = 28, Name = "Norway NO3",         Code = "10YNO-3--------J", TimeZoneId = "Europe/Oslo",       Latitude = 63.43m, Longitude = 10.39m },
        new() { Id = 29, Name = "Norway NO4",         Code = "10YNO-4--------9", TimeZoneId = "Europe/Oslo",       Latitude = 69.65m, Longitude = 18.96m },
        new() { Id = 30, Name = "Norway NO5",         Code = "10Y1001A1001A48H", TimeZoneId = "Europe/Oslo",       Latitude = 60.39m, Longitude = 5.32m },
        new() { Id = 31, Name = "Denmark DK1",        Code = "10YDK-1--------W", TimeZoneId = "Europe/Copenhagen", Latitude = 56.16m, Longitude = 10.20m },
        new() { Id = 32, Name = "Denmark DK2",        Code = "10YDK-2--------M", TimeZoneId = "Europe/Copenhagen", Latitude = 55.68m, Longitude = 12.57m },
        new() { Id = 33, Name = "Italy North",        Code = "10Y1001A1001A73I", TimeZoneId = "Europe/Rome",       Latitude = 45.46m, Longitude = 9.19m },
        new() { Id = 34, Name = "Italy Centre-North", Code = "10Y1001A1001A70O", TimeZoneId = "Europe/Rome",       Latitude = 43.77m, Longitude = 11.26m },
        new() { Id = 35, Name = "Italy Centre-South", Code = "10Y1001A1001A71M", TimeZoneId = "Europe/Rome",       Latitude = 41.90m, Longitude = 12.50m },
        new() { Id = 36, Name = "Italy South",        Code = "10Y1001A1001A788", TimeZoneId = "Europe/Rome",       Latitude = 40.85m, Longitude = 14.27m },
        new() { Id = 37, Name = "Italy Sardinia",     Code = "10Y1001A1001A74G", TimeZoneId = "Europe/Rome",       Latitude = 39.22m, Longitude = 9.12m },
        new() { Id = 38, Name = "Italy Sicily",       Code = "10Y1001A1001A75E", TimeZoneId = "Europe/Rome",       Latitude = 38.12m, Longitude = 13.36m },
        new() { Id = 41, Name = "Italy Calabria",     Code = "10Y1001C--00096J", TimeZoneId = "Europe/Rome",       Latitude = 38.91m, Longitude = 16.59m },
        // Jan 2021 bidding-zone reform — removed. Ids left as gaps on purpose; never renumber existing ids.

        // Western Balkans + all-island Ireland (SEM) — support extended beyond the core 39.
        new() { Id = 44, Name = "Albania",            Code = "10YAL-KESH-----5", TimeZoneId = "Europe/Tirane",     Latitude = 41.33m, Longitude = 19.82m },
        new() { Id = 45, Name = "Montenegro",         Code = "10YCS-CG-TSO---S", TimeZoneId = "Europe/Podgorica",  Latitude = 42.44m, Longitude = 19.26m },
        new() { Id = 46, Name = "Kosovo",             Code = "10Y1001C--00100H", TimeZoneId = "Europe/Belgrade",   Latitude = 42.66m, Longitude = 21.17m },
        new() { Id = 47, Name = "North Macedonia",    Code = "10YMK-MEPSO----8", TimeZoneId = "Europe/Skopje",     Latitude = 41.99m, Longitude = 21.43m },
        new() { Id = 48, Name = "Serbia",             Code = "10YCS-SERBIATSOV", TimeZoneId = "Europe/Belgrade",   Latitude = 44.79m, Longitude = 20.45m },
        new() { Id = 49, Name = "Ireland (SEM)",      Code = "10Y1001A1001A59C", TimeZoneId = "Europe/Dublin",     Latitude = 53.35m, Longitude = -6.26m },
    };

    public static readonly IReadOnlyDictionary<int, BiddingZone> ById =
        Zones.ToDictionary(z => z.Id);
}
