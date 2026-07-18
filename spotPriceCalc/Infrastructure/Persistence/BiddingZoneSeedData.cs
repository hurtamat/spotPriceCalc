using spotPriceCalc.Domain;

namespace spotPriceCalc.Infrastructure.Persistence;

/// <summary>
/// Canonical bidding zones (source of truth, from coutnries.txt). Code + Name come from the file;
/// TimeZoneId (IANA) and Latitude/Longitude are added here — timezone drives the ENTSO-E UTC window,
/// lat/lng drive the Open-Meteo weather query. Fed to EF via BiddingZoneConfiguration.HasData, so the
/// table is seeded once from this list.
/// Note: some EIC codes are virtual/aggregate zones — verify each with a live A44 query.
/// </summary>
public static class BiddingZoneSeedData
{
    public static readonly IReadOnlyList<BiddingZone> Zones = new List<BiddingZone>
    {
        new() { Id = 1,  Name = "Austria",            Code = "10YAT-APG------L", TimeZoneId = "Europe/Vienna",     Latitude = 48.21, Longitude = 16.37 },
        new() { Id = 2,  Name = "Belgium",            Code = "10YBE----------2", TimeZoneId = "Europe/Brussels",   Latitude = 50.85, Longitude = 4.35 },
        new() { Id = 3,  Name = "Bulgaria",           Code = "10YCA-BULGARIA-R", TimeZoneId = "Europe/Sofia",      Latitude = 42.70, Longitude = 23.32 },
        new() { Id = 4,  Name = "Switzerland",        Code = "10YCH-SWISSGRIDZ", TimeZoneId = "Europe/Zurich",     Latitude = 46.95, Longitude = 7.45 },
        new() { Id = 5,  Name = "Czech Republic",     Code = "10YCZ-CEPS-----N", TimeZoneId = "Europe/Prague",     Latitude = 50.08, Longitude = 14.44 },
        new() { Id = 6,  Name = "Slovakia",           Code = "10YSK-SEPS-----K", TimeZoneId = "Europe/Bratislava", Latitude = 48.15, Longitude = 17.11 },
        new() { Id = 7,  Name = "Germany-Luxembourg", Code = "10Y1001A1001A82H", TimeZoneId = "Europe/Berlin",     Latitude = 52.52, Longitude = 13.41 },
        new() { Id = 8,  Name = "Estonia",            Code = "10Y1001A1001A39I", TimeZoneId = "Europe/Tallinn",    Latitude = 59.44, Longitude = 24.75 },
        new() { Id = 9,  Name = "Spain",              Code = "10YES-REE------0", TimeZoneId = "Europe/Madrid",     Latitude = 40.42, Longitude = -3.70 },
        new() { Id = 10, Name = "Finland",            Code = "10YFI-1--------U", TimeZoneId = "Europe/Helsinki",   Latitude = 60.17, Longitude = 24.94 },
        new() { Id = 11, Name = "France",             Code = "10YFR-RTE------C", TimeZoneId = "Europe/Paris",      Latitude = 48.85, Longitude = 2.35 },
        new() { Id = 12, Name = "Greece",             Code = "10YGR-HTSO-----Y", TimeZoneId = "Europe/Athens",     Latitude = 37.98, Longitude = 23.73 },
        new() { Id = 13, Name = "Croatia",            Code = "10YHR-HEP------M", TimeZoneId = "Europe/Zagreb",     Latitude = 45.81, Longitude = 15.98 },
        new() { Id = 14, Name = "Hungary",            Code = "10YHU-MAVIR----U", TimeZoneId = "Europe/Budapest",   Latitude = 47.50, Longitude = 19.04 },
        new() { Id = 15, Name = "Lithuania",          Code = "10YLT-1001A0008Q", TimeZoneId = "Europe/Vilnius",    Latitude = 54.69, Longitude = 25.28 },
        new() { Id = 16, Name = "Latvia",             Code = "10YLV-1001A00074", TimeZoneId = "Europe/Riga",       Latitude = 56.95, Longitude = 24.11 },
        new() { Id = 17, Name = "Netherlands",        Code = "10YNL----------L", TimeZoneId = "Europe/Amsterdam",  Latitude = 52.37, Longitude = 4.90 },
        new() { Id = 18, Name = "Poland",             Code = "10YPL-AREA-----S", TimeZoneId = "Europe/Warsaw",     Latitude = 52.23, Longitude = 21.01 },
        new() { Id = 19, Name = "Portugal",           Code = "10YPT-REN------W", TimeZoneId = "Europe/Lisbon",     Latitude = 38.72, Longitude = -9.14 },
        new() { Id = 20, Name = "Romania",            Code = "10YRO-TEL------P", TimeZoneId = "Europe/Bucharest",  Latitude = 44.43, Longitude = 26.10 },
        new() { Id = 21, Name = "Slovenia",           Code = "10YSI-ELES-----O", TimeZoneId = "Europe/Ljubljana",  Latitude = 46.05, Longitude = 14.51 },

        new() { Id = 22, Name = "Sweden SE1",         Code = "10Y1001A1001A44P", TimeZoneId = "Europe/Stockholm",  Latitude = 65.58, Longitude = 22.15 },
        new() { Id = 23, Name = "Sweden SE2",         Code = "10Y1001A1001A45N", TimeZoneId = "Europe/Stockholm",  Latitude = 62.39, Longitude = 17.31 },
        new() { Id = 24, Name = "Sweden SE3",         Code = "10Y1001A1001A46L", TimeZoneId = "Europe/Stockholm",  Latitude = 59.33, Longitude = 18.07 },
        new() { Id = 25, Name = "Sweden SE4",         Code = "10Y1001A1001A47J", TimeZoneId = "Europe/Stockholm",  Latitude = 55.60, Longitude = 13.00 },
        new() { Id = 26, Name = "Norway NO1",         Code = "10YNO-1--------2", TimeZoneId = "Europe/Oslo",       Latitude = 59.91, Longitude = 10.75 },
        new() { Id = 27, Name = "Norway NO2",         Code = "10YNO-2--------T", TimeZoneId = "Europe/Oslo",       Latitude = 58.15, Longitude = 8.00 },
        new() { Id = 28, Name = "Norway NO3",         Code = "10YNO-3--------J", TimeZoneId = "Europe/Oslo",       Latitude = 63.43, Longitude = 10.39 },
        new() { Id = 29, Name = "Norway NO4",         Code = "10YNO-4--------9", TimeZoneId = "Europe/Oslo",       Latitude = 69.65, Longitude = 18.96 },
        new() { Id = 30, Name = "Norway NO5",         Code = "10Y1001A1001A48H", TimeZoneId = "Europe/Oslo",       Latitude = 60.39, Longitude = 5.32 },
        new() { Id = 31, Name = "Denmark DK1",        Code = "10YDK-1--------W", TimeZoneId = "Europe/Copenhagen", Latitude = 56.16, Longitude = 10.20 },
        new() { Id = 32, Name = "Denmark DK2",        Code = "10YDK-2--------M", TimeZoneId = "Europe/Copenhagen", Latitude = 55.68, Longitude = 12.57 },
        new() { Id = 33, Name = "Italy North",        Code = "10Y1001A1001A73I", TimeZoneId = "Europe/Rome",       Latitude = 45.46, Longitude = 9.19 },
        new() { Id = 34, Name = "Italy Centre-North", Code = "10Y1001A1001A70O", TimeZoneId = "Europe/Rome",       Latitude = 43.77, Longitude = 11.26 },
        new() { Id = 35, Name = "Italy Centre-South", Code = "10Y1001A1001A71M", TimeZoneId = "Europe/Rome",       Latitude = 41.90, Longitude = 12.50 },
        new() { Id = 36, Name = "Italy South",        Code = "10Y1001A1001A788", TimeZoneId = "Europe/Rome",       Latitude = 40.85, Longitude = 14.27 },
        new() { Id = 37, Name = "Italy Sardinia",     Code = "10Y1001A1001A74G", TimeZoneId = "Europe/Rome",       Latitude = 39.22, Longitude = 9.12 },
        new() { Id = 38, Name = "Italy Sicily",       Code = "10Y1001A1001A75E", TimeZoneId = "Europe/Rome",       Latitude = 38.12, Longitude = 13.36 },
        new() { Id = 39, Name = "Italy Brindisi",     Code = "10Y1001A1001A699", TimeZoneId = "Europe/Rome",       Latitude = 40.63, Longitude = 17.94 },
        new() { Id = 40, Name = "Italy Foggia",       Code = "10Y1001A1001A72K", TimeZoneId = "Europe/Rome",       Latitude = 41.46, Longitude = 15.55 },
        new() { Id = 41, Name = "Italy Calabria",     Code = "10Y1001C--00096J", TimeZoneId = "Europe/Rome",       Latitude = 38.91, Longitude = 16.59 },
        new() { Id = 42, Name = "Italy Priolo",       Code = "10Y1001A1001A76C", TimeZoneId = "Europe/Rome",       Latitude = 37.16, Longitude = 15.18 },
        new() { Id = 43, Name = "Italy Rossano",      Code = "10Y1001A1001A77A", TimeZoneId = "Europe/Rome",       Latitude = 39.57, Longitude = 16.63 },
    };
}
