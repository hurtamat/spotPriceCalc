# Design — .NET API current state (handoff doc)

This document describes **how the `spotPriceCalc` .NET API actually works today**, for the next
developer/AI picking it up. For the broader product vision (pool-heating scheduler, Python calc engine,
weather+COP optimization) see [README.md](./README.md) — that part is **not built yet**.

> **Status in one line:** the .NET API fetches ENTSO-E day-ahead electricity prices per bidding zone,
> stores them in Postgres, and serves them back over a date range. Weather (Open-Meteo) is scaffolded but
> not yet exposed or populated. No scheduler, no calc-service integration, no auth.

---

## Where this fits in the bigger system

Three services are planned (see README). Only the first is meaningfully built:

| Service | Dir | State |
| --- | --- | --- |
| **.NET API** | `spotPriceCalc/` | **This doc.** Price ingestion + read API. Working. |
| Calc service (Python/FastAPI) | `calc-service/` | Scaffolded only. The scheduling/thermal engine. |
| Frontend (React/Vite) | `frontend/` | Landing page + **working interactive zone map** driving a live price chart. |

---

## Architecture / layers

Clean-ish layered architecture. Folder = layer, dependencies point inward toward `Domain`.

```
spotPriceCalc/
├─ Controllers/           HTTP endpoints (thin)
├─ Services/              orchestration (ISpotPriceService, PriceDay logic, populate loop)
├─ Dtos/                  API response shapes (adds computed fields)
├─ Domain/               aggregates + core entity, persistence-ignorant
│   ├─ BiddingZone.cs         the one core entity (also EF-persisted + seeded)
│   ├─ ZoneSpotPrices.cs      aggregate: zone id once + List<PricePoint>
│   ├─ ZoneTemperatures.cs    aggregate: zone id once + List<TemperaturePoint>
│   ├─ PopulateResult.cs      populate-run summary (namespace is .Services)
│   └─ Enums/PriceDay.cs      Today | Tomorrow (namespace is .Services)
└─ Infrastructure/
    ├─ ExternalClients/       upstream HTTP (ENTSO-E, Open-Meteo)
    │   ├─ Entsoe/            XML DTOs + deserializer + mapper
    │   └─ OpenMeteo/         JSON DTOs + mapper
    └─ Persistence/           EF Core
        ├─ AppDbContext.cs
        ├─ BiddingZoneSeedData.cs   SOURCE OF TRUTH for zones (code)
        ├─ DbInitializer.cs         MigrateAsync() on startup
        ├─ Configurations/          IEntityTypeConfiguration per entity
        ├─ Entities/                flat EF rows
        └─ Repositories/            read/write, aggregate<->rows mapping
```

**Aggregate vs entity split (important):**
- **Domain aggregates** (`ZoneSpotPrices`, `ZoneTemperatures`) hold the `BiddingZoneId` **once** + a list of
  points. This is what services, providers, repositories, and DTOs pass around.
- **Persistence entities** (`SpotPriceEntity`, `TemperatureReadingEntity`) are **flat rows** with the zone id
  on *every* row. Repositories map: read = group rows → aggregate; write = flatten aggregate → rows.

---

## Data model / DB (Postgres via EF Core)

Three tables (snake_case names set in the configurations):

| Table | Entity | Key columns |
| --- | --- | --- |
| `bidding_zones` | `BiddingZone` | `Id` (PK, **not** auto-generated — assigned from seed), `Code` (unique EIC), `Name`, `TimeZoneId` (IANA), `Latitude`/`Longitude` (`numeric(9,6)`) |
| `spot_prices` | `SpotPriceEntity` | `Id` PK, `From`/`To` (timestamptz UTC), `Price` (`numeric(10,4)`, EUR/MWh), `BiddingZoneId` FK. Unique `(BiddingZoneId, From)` |
| `temperature_readings` | `TemperatureReadingEntity` | `Id` PK, `TimeUtc`, `TemperatureC` (`numeric(6,2)`), `BiddingZoneId` FK. Unique `(BiddingZoneId, TimeUtc)` |

- **Migrations** live in `spotPriceCalc/Migrations/` and **are committed** (they're source). `DbInitializer.InitializeAsync`
  runs `db.Database.MigrateAsync()` on startup — idempotent create + seed.
- **Zone seeding = EF `HasData`** fed from `BiddingZoneSeedData.Zones` (option A: list in code is source of truth,
  DB is a seeded copy the frontend reads). Changing the list → **needs a new migration**.
- **`lat/lng` are `decimal`**, not `double`, on purpose — `double` stored `48.15` as `48.149999…`. Seed literals
  carry the `m` suffix so they're exact base-10.

### The 39 bidding zones
`BiddingZoneSeedData.Zones` has 39 zones with **fixed ids** and a `ById` lookup dictionary.
- **Ids are a stable contract** (the frontend will send them). **NEVER renumber or reuse an id.** Appending is fine.
- Ids **39/40/42/43 are intentional gaps** — legacy Italian zones (Brindisi/Foggia/Priolo/Rossano) deprecated in
  the Jan-2021 Italian bidding-zone reform were removed. Italy is now the correct 7 zones.
- The list is **bidding zones**, not ENTSO-E "scheduling areas" (which represent Germany as TSO control areas, etc.).
- Some codes (CH, DE-LU virtual/aggregate zones) should be verified with a live A44 call.

---

## External data sources

### ENTSO-E Transparency Platform (`EntsoeSpotPriceClient`)
- **XML** response (not JSON) → parsed with `System.Xml.Serialization.XmlSerializer` into DTOs
  (`Entsoe/EntsoeDocument.cs`), namespace `urn:iec62325.351:tc57wg16:451-3:publicationdocument:7:3`.
- Query: `documentType=A44` (day-ahead prices), `in_Domain=out_Domain=zone.Code`, `periodStart/End` as
  `yyyyMMddHHmm`. **The window is the CET market day** — see below.
- Series selection: keep `IsDayAhead` (`contract_MarketAgreement.type == A01`, drops A07 intraday), then
  **prefer the series WITHOUT `classificationSequence`** (SDAC over EXAA), and take the first.

#### The delivery day is CET — for every zone (`Domain/MarketDay.cs`)

Verified against the live API (GR, FI, IE-SEM, CZ; summer *and* winter dates): **every** `Period/timeInterval`
comes back bounded at `22:00Z→22:00Z` in summer and `23:00Z→23:00Z` in winter, i.e. the CET/CEST calendar
day — for Greece and Finland (UTC+3 local) and Ireland (UTC+1 local) exactly as for Germany. Market time in
SDAC is CET, never the zone's own local time.

`MarketDay.WindowUtc(date)` is the single source of that window, shared by the ENTSO-E query, the read path,
and the populate skip-check. It converts against a **fixed `Europe/Berlin`**, so the DST switch and the
23h/25h transition days are handled by `TimeZoneInfo` automatically.

**`BiddingZone.TimeZoneId` is display-only** — it goes out on the DTO so the frontend can label the UTC curve
in the country's own wall-clock time. It must *not* be used to build market windows. It previously was, and
that was a real bug: for the 9 non-CET zones (GR/BG/RO/FI/EE/LV/LT one hour ahead of CET, PT/IE one hour
behind) the requested window straddled two CET publication days, ENTSO-E rounded it outward and returned
**each day as its own `TimeSeries`**, and "take the first series" then stored the *previous* day's prices.
Greece never converged: only ~4 slots landed in the expected window, under `MinSlotsForDay`, so every populate
run re-fetched it and `PopulateUntilCompleteAsync` burned all 5 attempts.

Other things the live responses confirm, worth knowing before touching this code:
- **Duplicate `TimeSeries` for the same day are normal** (CZ and IE-SEM each return two). Prices are byte-identical,
  so taking the first is fine — but it's only safe *because* the window now covers exactly one publication day.
- Resolution is `PT15M` (96 slots) for most zones, `PT60M` (24) for IE-SEM.
- Points are **sparse** — Greece returned 66 and 69 points for 96 slots — so the `curveType A03` carry-forward
  in `EntsoeSpotPriceMapper` is load-bearing, not a defensive nicety.
- **All date math + the `curveType A03` carry-forward** (sparse positions repeat the last price) live in
  `EntsoeSpotPriceMapper.ToPricePoints()` — nowhere else. Resolution from `XmlConvert.ToTimeSpan` (PT15M ⇒ 96
  slots/day, PT60M ⇒ 24). Prices are **EUR/MWh**.
- Security token read from config `Entsoe:SecurityToken`. **Currently hardcoded in
  `appsettings.Development.json` — move it out before committing/prod.**

### Open-Meteo (`OpenMeteoWeatherClient`)
- **JSON** response, parsed with `System.Text.Json`. Query uses `zone.Latitude/Longitude`,
  `hourly=temperature_2m`. **Still `forecast_days=1` — NOT yet from/to (a known TODO).**
- Provider + `IWeatherRepository` are registered in DI but **nothing calls them yet** (no endpoint, not in populate).

---

## Endpoints (`SpotPricesController`, route `api/spotprices`)

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/spotprices?biddingZoneId=6&from=2026-07-18&to=2026-07-18` | **Read** stored prices for one zone over an inclusive date range. Validates zone id (404) and `to >= from` (400). Returns `ZoneSpotPricesDto`. |
| `POST` | `/api/spotprices/populate?day=today` | **Write**: fetch + store prices for ALL zones for `today` (default) or `tomorrow`. Returns `PopulateResult`. |

- Read returns **only what's in the DB** — there is **no fetch-if-missing / caching** yet. Populate first, then read.
- `ZoneSpotPricesDto` adds a computed **`CtPerKwh = EurPerMwh / 10`** (consumer unit) on top of the raw EUR/MWh.

---

## Key flows

### Populate (`SpotPriceService.PopulateAsync`)
```
for each of the 39 seeded zones:
    window = MarketDay.WindowUtc(date)                     // CET day, same for every zone
    if repo.HasDayAsync(zone, window)  → skip              // >= MinSlotsForDay (12) stored
    else: provider.GetSpotPrices → repo.SaveAsync
    wait RequestDelay (100ms) between real ENTSO-E calls
return PopulateResult { date, zonesTotal, succeeded, skipped, failed, pointsSaved, failures[] }
```
Wrapped by `PopulateUntilCompleteAsync`, which re-runs the pass while any zone failed, up to `MaxAttempts` (5)
with a `RetryDelay` (10s) between attempts, then gives up and logs — for "tomorrow" before publication some
zones legitimately have no data yet, and the next scheduled run picks them up.

- **Idempotent & re-runnable**: `HasDayAsync` counts stored slots in the window and skips the zone at **≥ 12**
  (`MinSlotsForDay` — below a full hourly day of 24 and a full 15-minute day of 96, but above the handful a
  wrong/edge window could contain). So a re-run refills zones that failed *and* zones that stored a partial day.
- **Resilient**: each zone is try/catch'd; one failure (e.g. ENTSO-E gateway `ReadTimeoutException`, which comes
  from *their* Netty server, not us) is logged and collected in `failures[]`, the loop continues.
- **Throttled**: `RequestDelay` (currently 100ms) between calls.

### Read (`SpotPriceService.GetPricesAsync` → `SpotPriceRepository.GetAsync`)
- The **service** converts the `from`/`to` dates into the UTC window `[MarketDay(from).FromUtc, MarketDay(to).ToUtcExclusive)`
  — the same CET market day as populate uses, so a day written is exactly the day read back. The repository
  filters rows with `>= fromUtc && < toUtcExclusive` (half-open interval, inclusive `to`).
- Idempotent `SaveAsync` skips slots already stored (checks the unique index first) — no duplicate-key crashes.

---

## Conventions & decisions (the "why")

- **Bidding-zone ids are a stable public contract** — seeded with fixed ids, never renumbered. Frontend sends ids.
- **Everything is UTC** — columns are `timestamptz`, providers stamp `DateTimeKind.Utc`, date ranges use UTC bounds.
- **`decimal`/`numeric` for exact quantities** (prices, temps, lat/lng), never `double`.
- **Repositories are pure persistence** — no HTTP, no fetch-if-missing. Orchestration lives in the service.
- **DTO adds ct/kWh** and decouples the wire format from the domain (`ZoneSpotPricesDto`).
- **The user runs all `dotnet`/EF/package/build commands themselves in Rider** — hand them commands, don't run them.

---

## Running locally

Full instructions in README. DB specifics:

- **`appsettings.json` → `ConnectionStrings:Postgres` points at `localhost:5433`** — the docker-compose db. So
  the Rider-run app and the compose app share one database. Connect a GUI client (DataGrip etc.) with
  `localhost:5433`, db/user `spotprice`, password `spotprice123!`; tick the `spotprice.public` schema so the
  tables show up. (`Host=postgres;Port=5432` in `docker-compose.yml` is the *app container's* view over the
  compose network — that hostname doesn't resolve from the host machine.)
- `scripts/local-db.sh` starts a separate throwaway Postgres on **host 5432**. Nothing points at it now; it's
  there if you want a scratch DB isolated from compose.
- **`docker-compose.yml`** runs the full stack: a Postgres on **host 5433** (so it never collides with the local
  5432 one) + the `app` container, which overrides the connection string via env var `ConnectionStrings__Postgres`
  to reach the db internally as `postgres:5432`. `docker compose up -d --build` brings up both.
- App listens on `http://localhost:5262` (see `Properties/launchSettings.json`). Test calls in `spotPriceCalc.http`.

---

## Known gaps / TODOs / gotchas for the next AI

1. **Weather is scaffolded but inert** — no endpoint, not in populate, and Open-Meteo is still `forecast_days=1`.
   Next: add from/to support to `OpenMeteoWeatherClient`, a weather populate loop, and a read endpoint (symmetric
   to prices — the repository already supports the range).
2. **No caching / fetch-if-missing** — the read endpoint returns only stored data. Deliberate; add later.
3. **Populate is a manual `POST`** — intended to become an **Azure Function** running daily (~after the day-ahead
   auction, ~13:00 CET, populate `tomorrow`).
4. **Populate only ever does one day at a time** (`today` or `tomorrow`), and only on a manual `POST`. The
   range it *should* keep warm is roughly **the last 7 days + today + tomorrow** — history for the quantile /
   price-zone stats (which need `MinZoneSamples`, and a single day is thin), plus tomorrow once it publishes.
   Next step: let populate take a date range and work out for itself which days are missing rather than being
   told a single day — `HasDayAsync` already makes that cheap to check per (zone, day). Note **tomorrow only
   exists after the SDAC auction clears (~13:00 CET)**, so a run before that will legitimately fail for it.
5. **Security token hardcoded** in `appsettings.Development.json` — move to user-secrets / env before commit.
6. **Pending migration** — after removing the 4 legacy Italian zones, a new migration
   (`dotnet ef migrations add RemoveLegacyItalianZones`) is needed so `HasData` drops those rows.
7. **Minor layering leak** — `SpotPricesController` references `Infrastructure.Persistence.BiddingZoneSeedData`
   for id validation. Fine for now; move the zone catalog into a service if you want controllers off Infrastructure.
