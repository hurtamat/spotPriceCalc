# Design — .NET API current state (handoff doc)

This document describes **how the `spotPriceCalc` .NET API actually works today**, for the next
developer/AI picking it up. For the broader product vision (pool-heating scheduler, Python calc engine,
weather+COP optimization) see [README.md](./README.md) — that part is **not built yet**.

> **Status in one line:** the .NET API fetches ENTSO-E day-ahead prices per bidding zone on a schedule,
> stores them in Postgres with a Green/Yellow/Red quantile stamped on every slot by the calc-service, and
> serves them to the frontend and to smart-home devices. Weather (Open-Meteo) is scaffolded but inert.
> No auth; a per-IP rate limiter is the only protection on the public endpoints.

---

## Where this fits in the bigger system

| Service | Dir | State |
| --- | --- | --- |
| **.NET API** | `spotPriceCalc/` | **This doc.** Price ingestion, classification, read API, smart-home endpoints. |
| Calc service (Python/FastAPI) | `calc-service/` | `POST /price-zones` is **wired up and called during populate**; it returns de-trended residual quantiles (see `calc-service/README.md`), though at the 7-day window .NET sends, the baseline barely moves. `POST /schedule` exists and is not called by .NET. |
| Frontend (React/Vite) | `frontend/` | Landing page + **working interactive zone map** driving a live price chart, the **Shelly setup wizard** at `/shelly` that generates a pre-filled device script, the Home Assistant guide at `/home-assistant`, and the legal documents at `/privacy` and `/terms`. |
| Shelly scripts | `scripts/shelly/` | Two device scripts: `priceColor` (LED ring from `/api/shelly/schedule/status`) and `schedule`. Minified by `minify.sh` into a committed `dist/` the wizard fills in — an mJS script gets ~8 KB of heap, so source size is a hard constraint. |

---

## Architecture / layers

Clean-ish layered architecture. Folder = layer, dependencies point inward toward `Domain`.

```
spotPriceCalc/
├─ Controllers/
│   ├─ SpotPricesController.cs           read (populate is the scheduler's job, no write endpoint)
│   ├─ SmartHomeIntegrationController.cs abstract adapter shared by integrations
│   ├─ BiddingZonesController.cs         GET /api/zones, /api/zones/resolve
│   ├─ SmartHomeShellyController.cs      POST /api/shelly/schedule, GET /api/shelly/schedule/status
│   └─ ShellyLocalTime.cs                wall clock -> instant, Shelly only (see smartHomeIntegration.md)
├─ Services/
│   ├─ SpotPriceService.cs               fetch → store → classify; regions: Reads / Populate / History backfill
│   ├─ PriceDataScheduler.cs             BackgroundService: startup catch-up + daily run
│   └─ SmartHome/                        ScheduleService (device planning), ZoneLocatorService (coords → zone)
├─ Dtos/                                 wire shapes (adds computed fields); Schedule/ and PriceZones/
├─ Domain/                              persistence-ignorant core
│   ├─ BiddingZone.cs         the one core entity (also EF-persisted + seeded)
│   ├─ MarketDay.cs           THE CET market-day window — see below, read this before touching dates
│   ├─ PriceQuantile.cs       Green | Yellow | Red, stored as int
│   ├─ ZoneSpotPrices.cs      aggregate: zone id once + List<PricePoint> (each carries Price + Quantile?)
│   ├─ ZoneTemperatures.cs    aggregate: zone id once + List<TemperaturePoint>
│   └─ PopulateResult.cs      populate-run summary (file is in Domain/, namespace is .Services)
└─ Infrastructure/
    ├─ ExternalClients/       upstream HTTP (ENTSO-E, Open-Meteo, calc-service)
    │   ├─ Entsoe/            XML DTOs + deserializer + mapper + acknowledgement/error DTOs
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
| `spot_prices` | `SpotPriceEntity` | `Id` PK, `From`/`To` (timestamptz UTC), `Price` (`numeric(10,4)`, EUR/MWh), `Quantile` (nullable `integer` — `PriceQuantile`), `BiddingZoneId` FK. Unique `(BiddingZoneId, From)` |
| `temperature_readings` | `TemperatureReadingEntity` | `Id` PK, `TimeUtc`, `TemperatureC` (`numeric(6,2)`), `BiddingZoneId` FK. Unique `(BiddingZoneId, TimeUtc)` |

- **Migrations** live in `spotPriceCalc/Migrations/` and **are committed** (they're source). `DbInitializer.InitializeAsync`
  runs `db.Database.MigrateAsync()` on startup — idempotent create + seed.
- **Zone seeding = EF `HasData`** fed from `BiddingZoneSeedData.Zones` (option A: list in code is source of truth,
  DB is a seeded copy the frontend reads). Changing the list → **needs a new migration**.
- **`lat/lng` are `decimal`**, not `double`, on purpose — `double` stored `48.15` as `48.149999…`. Seed literals
  carry the `m` suffix so they're exact base-10.
- **`Quantile` is stored as its int value** (EF's default for an enum), so the numbers are the contract:
  `PriceQuantile` pins `Green = 0, Yellow = 1, Red = 2`. **Append, never renumber** — reordering the enum would
  silently reinterpret every stored row. Null until a slot has enough trailing history to classify.

### The 45 bidding zones
`BiddingZoneSeedData.Zones` has 45 zones with **fixed ids** and a `ById` lookup dictionary.
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
  `yyyyMMddHHmm`. **The window is a CET market-day range** (`from`..`to`, inclusive) — see below.
- **Series handling: take them ALL, then dedupe by slot start.** One `TimeSeries` per publication day, so a
  7-day request returns several. The count per day is *not* predictable — a live CZ 7-day call returned 12
  series for 7 days (one for the two oldest days, two for the rest); IE-SEM the same, GR one per day. So never
  count or index series; match on each point's own timestamp:
  ```csharp
  .Where(t => t.IsDayAhead)                                // A01, drops A07 intraday
  .OrderBy(t => t.ClassificationSequencePosition.HasValue)  // SDAC-over-EXAA preference (see caveat)
  .SelectMany(t => t.Periods).SelectMany(p => p.ToPricePoints())
  .GroupBy(p => p.From).Select(g => g.First())              // collapse duplicate series
  ```
  The dedupe is **load-bearing, not defensive**: without it 12 CZ series expand to ~1150 points where 672 are
  real, and `SaveAsync` (which only checks the *database* for existing slots, not the incoming list) hits the
  unique index.

> ⚠️ **The SDAC-over-EXAA ordering does not actually work for Austria.** EXAA is a separate Austrian exchange
> running its own earlier day-ahead auction for AT/DE, producing a genuinely *different* price for the same
> slot. The intent is to prefer the coupled SDAC price. But a live AT call returns three series, **all** with a
> `classificationSequence` (`2`, `1`, `1`) — so the `HasValue` sort is a tie, `First()` falls back to document
> order, and we take `classificationSequence=2`. The duplicated pair (`1`) matches the multi-NEMO pattern seen
> in SDAC-coupled zones, suggesting **`1` is SDAC and we're currently picking EXAA for Austria**. Inference from
> the duplication pattern, not stated in the XML — confirm against a published AT price before changing it.
> Affects AT and probably DE-LU; every other zone has no `classificationSequence` at all, so it's moot there.

#### Errors: ENTSO-E answers with an Acknowledgement document
When it won't serve a request, ENTSO-E returns an `Acknowledgement_MarketDocument` (**different XML namespace**,
`…451-1:acknowledgementdocument:7:0`) carrying a `Reason/code` + `text`. Two traps, both verified live:
- **"No matching data found" comes back as HTTP 200.** The status code cannot distinguish a declined request
  from a served one, so `EntsoeSpotPriceClient` uses `GetAsync` (not `GetStringAsync`) and calls
  `EntsoeXml.TryReadAcknowledgement(body)` **before** `EnsureSuccessStatusCode()`.
- **Code 999 is not a discriminator** — both "No matching data found" and "Authentication failed." return 999.
  A bad token therefore surfaces as every zone declining. If you see 45 declines in a row, check the token; the
  reason *text* is in the log line.

An acknowledgement throws `EntsoeAcknowledgementException`, which populate counts as `Declined` rather than
`Failed` — so it never triggers the retry loop, because asking again cannot change the answer. Anything else
non-2xx (a gateway error, an HTML error page) falls through to `EnsureSuccessStatusCode` and *is* retried.

#### The delivery day is CET — for every zone (`Domain/MarketDay.cs`)

Verified against the live API (GR, FI, IE-SEM, CZ; summer *and* winter dates): **every** `Period/timeInterval`
comes back bounded at `22:00Z→22:00Z` in summer and `23:00Z→23:00Z` in winter, i.e. the CET/CEST calendar
day — for Greece and Finland (UTC+3 local) and Ireland (UTC+1 local) exactly as for Germany. Market time in
SDAC is CET, never the zone's own local time.

`MarketDay.WindowUtc(date)` is the single source of that window, shared by the ENTSO-E query, the read path,
and the populate skip-check. It converts against a **fixed `Europe/Berlin`**, so the DST switch and the
23h/25h transition days are handled by `TimeZoneInfo` automatically.

`MarketDay.ContainingDay(utcInstant)` is the other direction — the market day an instant falls in — and it
reads the instant **in CET, not UTC**. Anything going from an instant to a day must use it. Taking
`DateOnly.FromDateTime` of a UTC instant looks equivalent and is not: at 23:00Z the UTC date is still today
while the CET delivery day is already tomorrow, so `WindowUtc(that date)` does not contain the instant and
the lookup finds no slot. That was a real bug — `/api/shelly/schedule/status` returned 204 for the last one
to two hours of every day, in every zone, and the LED ring went dark.

**`BiddingZone.TimeZoneId` is display-only** — it goes out on the DTO so the frontend can label the UTC curve
in the country's own wall-clock time. It must *not* be used to build market windows. It previously was, and
that was a real bug: for the 9 non-CET zones (GR/BG/RO/FI/EE/LV/LT one hour ahead of CET, PT/IE one hour
behind) the requested window straddled two CET publication days, ENTSO-E rounded it outward and returned
**each day as its own `TimeSeries`**, and "take the first series" then stored the *previous* day's prices.
Greece never converged: only ~4 slots landed in the expected window, under `MinSlotsForDay`, so every populate
run re-fetched it and `PopulateUntilCompleteAsync` burned all 5 attempts.

Other things the live responses confirm, worth knowing before touching this code:
- **The API rounds any request outward to whole publication days.** Asking for a single hour returns all 96
  slots of the containing CET day. The window you send selects *documents*, not time — which is why a
  straddling window silently returned two days.
- **Duplicate `TimeSeries` for the same day are normal** (CZ and IE-SEM each return two, prices byte-identical);
  likely one per NEMO, since zones with several exchanges show it. Nothing in the XML distinguishes them beyond
  `mRID`, a bare counter.
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

## Endpoints

### Prices (`SpotPricesController`, route `api/spotprices`)

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/spotprices?biddingZoneId=6&date=2026-08-13` | **Read** stored prices for one zone for a **single** CET market day. Validates zone id (404). Returns `ZoneSpotPricesDto`. |

- Read returns **only what's in the DB** — there is **no fetch-if-missing / caching**. `PriceDataScheduler` is
  the only thing that populates; there is no manual write endpoint.
- `ZoneSpotPricesDto` adds a computed **`CtPerKwh = EurPerMwh / 10`** (consumer unit) on top of the raw EUR/MWh,
  and carries the zone's `TimeZoneId` so the frontend can label the UTC curve in the country's own wall clock.
- Each point also carries its **`Quantile` as a name** (`"Green"`/`"Yellow"`/`"Red"`, `null` when unclassified),
  not the stored int — the numbers are a storage contract clients shouldn't depend on. The frontend colours its
  bars from it and renders `null` grey rather than guessing.
- Populate runs **only** from `PriceDataScheduler` (startup + daily). The manual `POST /populate` was removed:
  it was unauthenticated and fanned out to one ENTSO-E request per zone, retried, so anyone could burn our
  upstream quota. Backfilling a missed day means a restart, or calling the service from a test.

### Smart home (`SmartHomeShellyController`, route `api/shelly`; `SmartHomeHomeAssistantController`, route `api/homeassistant`)

| Method | Route | Purpose |
| --- | --- | --- |
| `POST` | `/api/shelly/schedule` | Device sends one job ("N hours by X" in a zone), gets back `slots` as `[start, end]` pairs plus ready-made local-time label text. Its own flat shape, not `ScheduleResponse` — see [smartHomeIntegration.md](./smartHomeIntegration.md). |
| `GET` | `/api/shelly/schedule/status?zoneCode=&time=` | Current price colour for a zone: `200` + `0`/`1`/`2` (Green/Yellow/Red), or **`204 No Content`** when the slot is missing or unclassified. |

The 204 is deliberate: the Shelly script clears its LEDs on anything that isn't a 200, so an unclassified slot
shows nothing rather than a guessed colour. `ResolveStatus` returns `PriceColor?` and the controller maps null
to 204.

### Bidding zones (`BiddingZonesController`, route `api/zones`)

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/zones` | Every zone as `{code, name, time_zone_id}`, so a client offers a picker without shipping its own list. The timezone is display-only — it tells the setup wizard which clock the hours a user picks belong to. |
| `GET` | `/api/zones/resolve?lat=&lon=` | The zone covering a location, for preselecting it. Nearest zone centre, same as the scheduler used to do internally. |

Clients name their zone by **ENTSO-E code**, never by our `Id` — the ids are a storage detail, the codes are
the industry's own identifiers.

---

## Key flows

### Scheduling (`PriceDataScheduler`, a `BackgroundService`)
Decides *when*; all the work lives in `ISpotPriceService`. On startup:
```
BackfillHistoryAsync(today-7, today-2)   // 6 days, unclassified — see below
PopulateAsync(today-1)                   // yesterday  → classified
PopulateAsync(today)                     // today      → classified
PopulateAsync(today+1)                   // tomorrow   → only past DailyRunTime CET
```

**Tomorrow is skipped when the app starts before `DailyRunTime` (13:21 CET).** The SDAC auction has not
cleared, so every one of the 45 zones would decline; the daily loop populates it at that time anyway.
`DayAheadPublished` uses the same CET wall clock as `NextRunUtc`, so the two agree by construction.
then loops, waking daily at `DailyRunTime` (Europe/Prague) to populate tomorrow.

**Order matters and the days are sequential, not parallel.** Classification looks back over the trailing
`QuantileWindowDays` (7), so yesterday needs `today-7 … today-1` present *before* it classifies. Running the
three days concurrently races that, and also triples the ENTSO-E load against a throttle that assumes one
caller. Ending the backfill at `today-2` is what makes yesterday's window exactly 7 days — yesterday itself
arrives from the populate that classifies it, and today/tomorrow then inherit a full window for free.

Being a `BackgroundService` it needs min-replicas ≥ 1; move to a Container Apps cron Job if the API ever scales
to zero. It has **no interface** on purpose — nothing injects it, and `IHostedService` is already the seam.

### Populate (`SpotPriceService.PopulateUntilCompleteAsync` → `PopulateOnceAsync` → `PopulateZoneAsync`)
```
for each of the 45 seeded zones:
    window = MarketDay.WindowUtc(date)                     // CET day, same for every zone
    if repo.HasDayAsync(zone, window)  → skip              // >= MinSlotsForDay (12) stored
    else: provider.GetSpotPrices(date, date) → repo.SaveAsync → ClassifyDayAsync
    wait RequestDelay (100ms) between real ENTSO-E calls
return PopulateResult { date, zonesTotal, succeeded, skipped, failed, declined, pointsSaved, failures[] }
```
Wrapped by `PopulateUntilCompleteAsync`, which re-runs the pass while `Failed > 0`, up to `MaxAttempts` (5)
with a `RetryDelay` (10s) between attempts.

- **`Failed` vs `Declined`**: `Failed` counts only *retryable* problems (timeouts, gateway errors) and is what
  drives the retry loop. `Declined` counts zones ENTSO-E explicitly has no data for. That split is why a day
  where Italy is genuinely empty completes in one pass instead of burning five attempts with 10s sleeps.
- **Idempotent & re-runnable**: `HasDayAsync` counts stored slots in the window and skips the zone at **≥ 12**
  (`MinSlotsForDay` — below a full hourly day of 24 and a full 15-minute day of 96, but above the handful a
  wrong/edge window could contain). So a re-run refills zones that failed *and* zones that stored a partial day.
- **Resilient**: each zone is try/catch'd; one failure (e.g. ENTSO-E gateway `ReadTimeoutException`, which comes
  from *their* Netty server, not us) is logged and collected in `failures[]`, the loop continues.

### Classification (`ClassifyDayAsync`)
After a zone's day is stored, its prices for the trailing `QuantileWindowDays` (7, this day included) go to the
calc-service `POST /price-zones`, which returns a lower/upper cut-off in EUR/MWh. `SetQuantilesAsync` then
stamps every slot of *that day*: below lower ⇒ Green, above upper ⇒ Red, else Yellow. One country's prices form
one distribution, so this is per zone.

- Skipped (leaving `Quantile` null) when fewer than `MinQuantileSamples` (12) prices exist — early days have no
  history, and that must not fail the populate run.
- **A skipped zone is not reclassified.** `ClassifyDayAsync` only runs after an actual fetch, so if the
  calc-service was down when a day landed, that day stays unclassified until it ages out of the window.
- The calc-service must be running or every zone fails here — `Connection refused (localhost:8000)` means it
  isn't. That is *not* ENTSO-E rate limiting. `docker compose up -d calc-service` is the fix.

### History backfill (`BackfillHistoryAsync`)
Fetches a whole date range in **one** ENTSO-E call per zone and stores it **without classifying** — it exists
only so the quantile window has depth. Best-effort: not retried, per-zone failures are logged and swallowed.
`HasEveryDayAsync` checks each day in the range first (one cheap `COUNT` per day) and skips the zone if all are
present, so a restart doesn't re-fetch data it already has. Per-day rather than "oldest day present" precisely
because holes happen in the middle — the Italian zones had exactly that shape.

### Read (`SpotPriceService.GetPricesAsync` → `SpotPriceRepository.GetAsync`)
- The **service** converts the `from`/`to` dates into the UTC window `[MarketDay(from).FromUtc, MarketDay(to).ToUtcExclusive)`
  — the same CET market day as populate uses, so a day written is exactly the day read back. The repository
  filters rows with `>= fromUtc && < toUtcExclusive` (half-open interval, inclusive `to`).
- Idempotent `SaveAsync` skips slots already stored (checks the unique index first) — no duplicate-key crashes.

---

## Conventions & decisions (the "why")

- **Bidding-zone ids are a stable public contract** — seeded with fixed ids, never renumbered. Frontend sends ids.
- **Everything is UTC** — columns are `timestamptz`, providers stamp `DateTimeKind.Utc`, date ranges use UTC bounds.
- **A "day" always means the CET market day**, via `MarketDay.WindowUtc` — never a UTC day, never the zone's
  local day. One definition, shared by fetch / read / skip-check, so a day written is the day read back.
- **Windows are half-open `[from, to)`** everywhere — ranges, slot matching, `HasDayAsync`. A timestamp on a
  boundary belongs to exactly one interval.
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
- **The calc-service must be up or every populate fails at classification.** Easiest is
  `docker compose up -d --build calc-service` — it has no `depends_on`, maps `8000:8000`, and carries
  `restart: unless-stopped`, so after one command it comes back on its own like the Postgres does. If you're
  actively editing the Python, run it from the venv instead (`fastapi dev main.py`) for hot reload.

---

## Known gaps / TODOs / gotchas for the next AI

1. **The quantile algorithm is a placeholder.** `calc-service/price_zones.py` sorts the prices and cuts at the
   1/3 and 2/3 index — no interpolation, no outlier handling, no recency weighting. The .NET side is fully
   wired; only the maths is provisional. **This is the highest-value thing to replace.**
2. **The SDAC/EXAA series pick is probably wrong for Austria** — see the ENTSO-E section above. Needs one
   confirmation against a published AT price, then a one-line fix.
3. **Weather is scaffolded but inert** — no endpoint, not in populate, and Open-Meteo is still `forecast_days=1`.
   Next: add from/to support to `OpenMeteoWeatherClient`, a weather populate loop, and a read endpoint (symmetric
   to prices — the repository already supports the range).
4. **No caching / fetch-if-missing** — the read endpoint returns only stored data. Deliberate; add later.
5. **Populate takes one date at a time.** The scheduler works around it by calling it two or three times at
   startup. Letting it take a range and work out for itself which days are missing would fold the backfill and
   populate paths into one — `HasDayAsync` already makes that cheap per (zone, day).
6. **A day stored while the calc-service was down stays unclassified forever** — see Classification above. A
   `HasUnclassifiedAsync` check on the skip path would make it self-heal; deliberately not built yet.
7. **Security token hardcoded** in `appsettings.Development.json` — move to user-secrets / env. Still true, and
   the file is committed.
8. **Minor layering leak** — `SpotPricesController` references `Infrastructure.Persistence.BiddingZoneSeedData`
   for id validation. Fine for now; move the zone catalog into a service if you want controllers off Infrastructure.
9. **A failed populate leaves zones missing until the next day.** `Declined` is not retried, by design — asking
   again cannot change the answer — so a day that ran before ENTSO-E had the data stays partial. Observed:
   yesterday complete at 45/45 while today had 15 zones (all 7 Italian, plus BE/BG/GR/HR/HU/NL/RO/SK) at
   **zero** slots. A restart re-runs the startup populate, which fills them and skips the rest. A "retry
   declined zones later in the day" pass would close it.
10. **The Shelly script prints nothing.** Every string literal is resident in its ~8 KB heap and logging was
    enough to push it over, so failures are silent — a failed fetch keeps the previous plan and retries on the
    next tick. Add one temporary `print()` when debugging and check `mem_peak` afterwards.
