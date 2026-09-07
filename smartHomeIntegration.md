# Smart-home integration — schedule API

How the smart-home control endpoint works today, the reasoning behind its shape, and one open design
problem left to solve. For the broader product vision see [IDEA.md](./IDEA.md); for the price-data layer this
sits on top of see [DESIGN.md](./DESIGN.md).
 
> **Status in one line:** a stateless `POST /api/schedule` takes one job ("I need N hours of power by
> deadline X"), ranks the stored spot-price curve, and returns the **merged run blocks**;
> `GET /api/schedule/status` returns the current price colour for a location, and `GET /api/zones`
> lists the zones a client can pick from. Coordinate→zone resolution works (nearest zone centre).
> The daily commit model (see the end) is not built yet.

---

## What it's for

This is **layer 3** of the product (the control layer). A Shelly device — or any thin client — is the
"dumb" end: it knows what appliance it drives and what the user wants ("3 cheap hours of boiler by 06:00"),
but it does no optimization itself. It asks the backend, and the backend decides.

The design goal throughout is a **thin client**: the device should read one boolean and flip a relay. All the
real thinking (price ranking, windowing, exclusions) happens server-side, once, and is reusable across every
integration (Shelly first, Home Assistant and others later).

### Device onboarding (planned, not built)

The end-user onboarding is a **separate frontend screen — a step-by-step wizard**. It collects the user's
parameters (location/zone, hours needed, ready-by time, continuous vs. split, unavailable window,
switch/channel) and then **outputs a ready-to-paste device script with those values pre-filled**; the user
copies it into the Shelly Scripts UI. No hand-editing of config, no on-device settings screen. Values are
**baked in at generation time**, so changing a setting later means re-running the wizard and re-pasting —
acceptable for set-and-forget appliances. Decided, but not implemented yet. See
[`scripts/shelly/README.md`](./scripts/shelly/README.md).

---

## The endpoint

```
POST /api/schedule
```

POST (not GET) so the device can send a structured JSON body instead of a long query string. The device polls
this periodically, reads the result, and sets its relay.

### Request

```json
{
  "device_id": "shelly-1",
  "zone_code": "10YCZ-CEPS-----N",
  "duration_hours": 3,
  "ready_by_utc": "2026-08-13T04:00:00Z",
  "continuous_block": false,
  "unavailable": { "from": "07:00:00", "to": "09:00:00" }
}
```

| Field | Meaning |
| --- | --- |
| `device_id` | Identifies the device (logging, later rate-limiting / state). |
| `zone_code` | **Required.** ENTSO-E area code, e.g. `10YCZ-CEPS-----N`. A string, so no client depends on our own zone ids. `GET /api/zones` lists them, and `GET /api/zones/resolve?lat=&lon=` names the one covering a location so a client can preselect it. |
| `duration_hours` | The one field that's always required — total hours of power the job needs. |
| `ready_by_utc` | *Optional.* **The anchor** — the **instant (UTC)** the job must finish by; the window is the 24h before it. One instant rather than a date plus a wall clock, because only the client knows which timezone the user's clock belongs to. Null ⇒ 24h from now (`ResolveDeadlineUtc`), so "no deadline" means the cheapest hours in the coming day. Not a midnight: that cuts the window at a fixed hour, and a plan made in the evening could not reach the cheap night hours past it. |
| `continuous_block` | `true` ⇒ hours must run back-to-back (boiler, washer). `false` (default) ⇒ split for the absolute cheapest hours (EV charging, the "don't care" case). |
| `unavailable` | *Optional.* A "do not run" window, **time-of-day only** (no date). May wrap past midnight (`from > to`, e.g. `22:00–06:00`). |

**One request is one job.** The body was a `tasks[]` array; both clients only ever sent one entry, so it is
flat. Reintroducing the array later is additive.

The minimal valid request is a device id, a zone code, and `duration_hours`.

### Response

```json
{
  "device_id": "shelly-1",
  "zone_name": "Czech Republic",
  "scheduled": true,
  "blocks": [
    { "start_utc": "2026-08-13T23:00:00Z", "end_utc": "2026-08-14T02:00:00Z", "eur_per_mwh": 42.1 }
  ]
}
```

| Field | Meaning |
| --- | --- |
| `zone_name` | The zone `zone_code` named — the only human-readable field, for sanity-checking. |
| `scheduled` | `false` ⇒ the job couldn't be placed (e.g. window too short, or no prices stored). |
| `blocks` | The chosen run-time as **merged contiguous blocks** (UTC, sorted), not individual slots. `eur_per_mwh` is the duration-weighted average across the block. |

**There is no `relay_state` / `now_utc` / `next_toggle_utc`.** The model changed: the device is handed the
blocks and runs its relay locally against them, rather than asking "on or off right now?" on every poll. That
means one call per day instead of one per polling interval — and it sidesteps the recompute-drift problem
described at the end of this doc, at the cost of the device needing a clock.

The response is **deliberately lean** — it's consumed by a device script, not a human. No display strings, no
labels, no reasons. Everything is UTC.

### `POST /api/homeassistant/schedule`

The same request, the same `ScheduleService`, a wider response: the committed plan **plus** the price
curve and the current price level in one payload. Home Assistant publishes price sensors as well as a
run-block sensor, so folding them together turns three calls per refresh into one. This is what the
abstract base controller's virtual `BuildScheduleAsync` step was for — the concrete controller
overrides only the mapping. See [homeAssistantIntegration.md](./homeAssistantIntegration.md).

### `GET /api/schedule/status?lat=&lon=&time=`

A second, much simpler endpoint for ambient display: what colour is the price at this instant?

| Response | Meaning |
| --- | --- |
| `200` + `0` / `1` / `2` | Green / Yellow / Red, read straight off the slot's stored `Quantile`. |
| `204 No Content` | No colour applies — no slot for that instant, or it isn't classified yet. |

The quantile is stamped during populate (see [DESIGN.md](./DESIGN.md)), so this is a lookup, not a computation.
The 204 is deliberate: `scripts/shelly/priceColor.shelly.js` calls `clearColor()` on anything that isn't a 200,
so an unclassified slot leaves the LED ring **dark** rather than showing a guessed colour. Better honest than
wrong — a wrong colour would have the device acting on a price signal we don't have.

---

## Architecture — where the logic lives

The key decision: **the decision logic is device-agnostic, so it lives in a service, not a controller.** The
computation (window → rank by price → pick cheapest N → is-now-on → next toggle) is identical for Shelly, Home
Assistant, or a web UI. What differs per integration is only the request/response *shaping* — that's what the
controller layer is for.

```
Controllers/
├─ SmartHomeIntegrationController.cs   abstract base: the shared HTTP adapter.
│                                       Holds the scheduler, exposes one virtual step (BuildScheduleAsync).
├─ SmartHomeShellyController.cs        concrete: POST /api/schedule + GET /api/schedule/status. Inherits
│                                       the base; a vendor controller overrides only the mapping.
├─ SmartHomeHomeAssistantController.cs concrete: POST /api/homeassistant/schedule. Same plan, plus the
│                                       price curve, so the integration needs one call per refresh.
└─ BiddingZonesController.cs           GET /api/zones and /api/zones/resolve, so a client can offer a
                                        zone picker without shipping its own copy of the list.
Services/SmartHome/
├─ IZoneLocatorService.cs             coordinates → bidding zone (own responsibility).
├─ ZoneLocatorService.cs             nearest zone centre (Haversine). Works; wrong right at internal borders.
├─ IScheduleService.cs               the decision engine's contract.
└─ ScheduleService.cs                the brain. Regions: Schedule building / Slot selection / Price colour.
Dtos/Schedule/
├─ ScheduleRequest.cs                request + UnavailableWindow, and ResolveDeadlineUtc.
├─ ScheduleResponse.cs               response + ScheduledBlock.
└─ HomeAssistantScheduleResponse.cs  the HA response + PriceCurvePoint.
StatusSchedule.cs                 the colour query (lat, lon, dateTime).
```

**Why an abstract base controller *and* a service?** The service is the reusable brain — testable with no HTTP.
The abstract controller is the reusable *adapter*: it owns the shared "hand a request to the scheduler" step as
a `virtual` method, so a new integration is a thin subclass that overrides only what's genuinely different. If
we'd put the logic in the base controller, the first new integration would fight ASP.NET routing to reshape an
inherited action. Logic in the service, glue in the controller.

**Why a separate zone-locator service (and why an instance, not a static)?** Resolution will grow real
dependencies later (polygon data, maybe a geo API, caching). An injected interface means `ScheduleService` can
be unit-tested today with a two-line fake, and the real implementation can be swapped/decorated via one line in
`Program.cs`. Static classes can't take injected dependencies or be mocked — reserved here for pure, fixed
things (`BiddingZoneSeedData`, the private math helpers).

---

## The scheduling logic (`ScheduleService`)

1. **Anchor on the deadline.** The eligible window is always the 24h *before* it:
   ```
   anchor      = ready_by_utc, or now + 24h when it is null
   windowStart = anchor − 24h
   eligible    = price slots fully inside [windowStart, anchor]  minus  the unavailable window
   ```
   This is deliberately **not** a calendar day: anchoring on the deadline and looking back keeps the cheap
   overnight block (e.g. 23:00→05:00) whole instead of slicing it at midnight. `LoadSlotsAsync` reads a day
   either side of the deadline so the look-back can reach into the previous day.

2. **Exclude the unavailable window** — any slot whose UTC time-of-day falls inside it is dropped (wrap-around
   past midnight supported).

3. **Select the hours:**
   - `continuous_block = false` → greedily take the cheapest slots until `duration_hours` is covered.
   - `continuous_block = true` → slide a back-to-back block of the required length over the eligible slots and
     pick the cheapest valid position.

The evaluation is factored into its own static `Evaluate` helper (self-contained, testable).

### Everything is UTC

UTC in / UTC out. The deadline arrives as an **instant**, so nothing here has to guess what a wall clock
meant — a client whose user picks a local time converts at its own edge, where the timezone is known. The
one wall-clock value left is the unavailable window, a UTC time-of-day pair. Slot granularity follows the
stored price curve (hourly today, 15-minute handled if the data has it).

---

## Current limitations

- **Coordinate→zone resolution is nearest-centre, not polygons.** `ZoneLocatorService` picks the closest zone
  centre by Haversine distance. Good enough away from borders, **wrong right at internal ones** (and inside
  multi-zone countries like Italy, Sweden and Norway it's essentially a guess). `TODO(geojson)`: point-in-polygon,
  keeping nearest-centre as the no-match fallback.
- **Timezones are the client's job** — the deadline arrives as an instant, so the API never guesses. Note the
  *market* day is CET (see DESIGN.md), so for the 9 non-CET zones a "day" of prices doesn't start at the
  user's local midnight.
- **The read depends on populated prices** — the scheduler only sees what's in the DB. `PriceDataScheduler`
  handles that automatically now (startup catch-up + a daily run), so this is only a problem on a fresh DB.
- **`/status` returns 204 until prices are classified**, which needs the calc-service running during populate.

---

## Open problem: stateless recompute drifts — commit vs. track

The endpoint today is **stateless**: it recomputes the plan from scratch on every call. That's simple, but it's
**wrong across a day** if the device polls repeatedly, because the optimization *moves* as time advances.

Example — EV needs 4h by 07:00:

- **23:00 poll** → cheapest 4h are 01,02,03,04. Relay on 01–04.
- Car charges 01:00, 02:00 (2h done).
- **02:30 poll** → the window is now `[02:30, 07:00]`; 01 and 02 are in the past and gone. We again pick "4
  cheapest hours" from what remains → 03,04,05,06.
- Net: the car charges **6 hours, not 4.** Overcharged.

So per-poll recompute needs to know *how much each task has already run* to schedule only the remaining hours —
which means tracking delivered hours, trusting the device to report them, and reconciling offline gaps. A lot.

**The cleaner fix is to commit, not track.** Compute the plan **once** (when tomorrow's prices land) and freeze
it. Nobody re-optimizes, so there's no drift and nothing to reconcile — "how much has it charged" stops
mattering because the frozen plan already says exactly which hours are ON.

That leaves one choice — **where the frozen plan lives:**

- **Server-stores (recommended):** compute once, persist the committed slots per device/task in a small table,
  and let the device keep polling every ~15 min — each poll just reads `relay_state` from the stored plan
  rather than re-optimizing. The device stays trivially thin, reboots re-poll to the same plan, and a config
  change can invalidate-and-recommit cleanly. Needs one new `committed_schedule` table plus a "compute & commit
  for tomorrow" step in the daily job.
- **Device-stores:** hand the device the full ON-hours list once per day; its local timer toggles the relay.
  Simplest server-side, but pushes storage + a reliable clock + DST + re-fetch-on-reboot onto the device — and
  a reboot re-fetch should still return the *same* committed plan, so we'd likely persist it server-side
  anyway.

**Progress-tracking** ("how many hours done") only returns if we want the system to be **adaptive** — e.g. the
device was offline during a committed ON-hour and missed charge, so it should make it up. That's a v2 robustness
feature, not part of the first commit model.

**Next step:** decide server-stores vs. device-stores, then add the committed-schedule persistence and switch
the endpoint from "optimize live" to "read the committed plan."
