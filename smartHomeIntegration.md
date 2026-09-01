# Smart-home integration — schedule API

How the smart-home control endpoint works today, the reasoning behind its shape, and one open design
problem left to solve. For the broader product vision see [IDEA.md](./IDEA.md); for the price-data layer this
sits on top of see [DESIGN.md](./DESIGN.md).
 
> **Status in one line:** a stateless `POST /api/schedule` takes a thin device's tasks (each: "I need N hours of
> power by deadline X"), ranks the stored spot-price curve, and returns the **merged run blocks** per task;
> `GET /api/schedule/status` returns the current price colour for a location. Coordinate→zone resolution works
> (nearest zone centre). The daily commit model (see the end) is not built yet.

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
  "lat": 50.08,
  "lon": 14.44,
  "date": "2026-08-13",
  "unavailable": { "from": "07:00:00", "to": "09:00:00" },
  "tasks": [
    { "task_id": 1, "duration_hours": 3, "ready_by": "06:00:00", "continuous_block": false }
  ]
}
```

**Global (device context):**

| Field | Meaning |
| --- | --- |
| `device_id` | Identifies the device (logging, later rate-limiting / state). |
| `lat` / `lon` | GPS. Resolved server-side to a bidding zone. **`decimal`**, matching the exact-value lat/lng convention used everywhere else. |
| `date` | **Required.** The day to schedule for. The eligible window is this whole day, or the 24h before a task's `ready_by`. |
| `unavailable` | *Optional.* A single "do not run" window, **time-of-day only** (no date). Applies to every task. May wrap past midnight (`from > to`, e.g. `22:00–06:00`). |

**Tasks (the jobs):** an array so a user can express several needs at once ("1h wash by 14:00" *and* "4h EV
charge by 07:00").

| Field | Meaning |
| --- | --- |
| `task_id` | **`int`**, always supplied by the device script. |
| `duration_hours` | The one field that's always required — total hours of power the task needs. |
| `ready_by` | *Optional.* **The anchor** — deadline **time-of-day (UTC)** on `date` that the task must finish by; the window is the 24h before it. Null ⇒ the whole of `date`. |
| `continuous_block` | `true` ⇒ hours must run back-to-back (boiler, washer). `false` (default) ⇒ split for the absolute cheapest hours (EV charging, the "don't care" case). |

The minimal valid request is just a device id, coordinates, and one task with a `duration_hours`.

### Response

```json
{
  "device_id": "shelly-1",
  "zone_name": "Czech Republic",
  "tasks": [
    {
      "task_id": 1,
      "scheduled": true,
      "blocks": [
        { "start_utc": "2026-08-13T23:00:00Z", "end_utc": "2026-08-14T02:00:00Z", "eur_per_mwh": 42.1 }
      ]
    }
  ]
}
```

| Field | Meaning |
| --- | --- |
| `zone_name` | Which bidding zone the coordinates resolved to — the only human-readable field, for sanity-checking. |
| `tasks[].scheduled` | `false` ⇒ the task couldn't be placed (e.g. window too short, or no prices stored). |
| `tasks[].blocks` | The chosen run-time as **merged contiguous blocks** (UTC, sorted), not individual slots. `eur_per_mwh` is the duration-weighted average across the block. |

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
└─ SmartHomeHomeAssistantController.cs concrete: POST /api/homeassistant/schedule. Same plan, plus the
                                        price curve, so the integration needs one call per refresh.
Services/SmartHome/
├─ IZoneLocatorService.cs             coordinates → bidding zone (own responsibility).
├─ ZoneLocatorService.cs             nearest zone centre (Haversine). Works; wrong right at internal borders.
├─ IScheduleService.cs               the decision engine's contract.
└─ ScheduleService.cs                the brain. Regions: Schedule building / Slot selection / Price colour.
Dtos/Schedule/
├─ ScheduleRequest.cs                request + UnavailableWindow + TaskRequest.
├─ ScheduleResponse.cs               response + TaskResult + ScheduledBlock.
└─ HomeAssistantScheduleResponse.cs  the HA response + PriceSnapshot + PriceCurvePoint.
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

For each task, independently:

1. **Anchor on the deadline.** The eligible window is the 24h *before* `ready_by`, or the whole day if there
   isn't one:
   ```
   ready_by given:  anchor = date @ ready_by (UTC);  windowStart = anchor − 24h
   ready_by null:   windowStart = date @ 00:00 UTC;  anchor = windowStart + 24h
   eligible = price slots fully inside [windowStart, anchor]  minus  the unavailable window
   ```
   With a deadline this is deliberately **not** a calendar day: anchoring on it and looking back keeps the cheap
   overnight block (e.g. 23:00→05:00) whole instead of slicing it at midnight. `LoadSlotsAsync` therefore reads
   `date ± 1` so the look-back can reach into the previous day.

2. **Exclude the unavailable window** — any slot whose UTC time-of-day falls inside it is dropped (wrap-around
   past midnight supported).

3. **Select the hours:**
   - `continuous_block = false` → greedily take the cheapest slots until `duration_hours` is covered.
   - `continuous_block = true` → slide a back-to-back block of the required length over the eligible slots and
     pick the cheapest valid position.

The per-task evaluation is factored into its own `EvaluateTask` helper (self-contained, static, testable).
`relay_state` is then the OR of "is now inside any chosen slot" across all tasks.

### Everything is UTC (for now)

The whole computation is UTC in / UTC out; we assume the client sends UTC and we return UTC. Slot granularity
follows the stored price curve (hourly today, but 15-minute is handled if the data has it). There's a
`TODO(timezone)` throughout: the proper design resolves the zone's IANA `TimeZoneId`, keeps the math in UTC,
and converts to the device's local time at the controller edge for display.

---

## Current limitations

- **Coordinate→zone resolution is nearest-centre, not polygons.** `ZoneLocatorService` picks the closest zone
  centre by Haversine distance. Good enough away from borders, **wrong right at internal ones** (and inside
  multi-zone countries like Italy, Sweden and Norway it's essentially a guess). `TODO(geojson)`: point-in-polygon,
  keeping nearest-centre as the no-match fallback.
- **Timezone handling is deferred** — UTC assumed end to end. Note the *market* day is CET (see DESIGN.md), so
  for the 9 non-CET zones a "day" of prices doesn't start at the user's local midnight.
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
