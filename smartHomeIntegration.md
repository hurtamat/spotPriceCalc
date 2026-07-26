# Smart-home integration — schedule API

How the smart-home control endpoint works today, the reasoning behind its shape, and one open design
problem left to solve. For the broader product vision see [IDEA.md](./IDEA.md); for the price-data layer this
sits on top of see [DESIGN.md](./DESIGN.md).
 
> **Status in one line:** a stateless `POST /api/schedule` endpoint takes a thin device's tasks (each: "I need
> N hours of power by deadline X"), ranks the stored spot-price curve, and returns which hours to run plus a
> single `relay_state` boolean for right now. Coordinate→zone resolution is stubbed; the daily commit model
> (see the end) is not built yet.

---

## What it's for

This is **layer 3** of the product (the control layer). A Shelly device — or any thin client — is the
"dumb" end: it knows what appliance it drives and what the user wants ("3 cheap hours of boiler by 06:00"),
but it does no optimization itself. It asks the backend, and the backend decides.

The design goal throughout is a **thin client**: the device should read one boolean and flip a relay. All the
real thinking (price ranking, windowing, exclusions) happens server-side, once, and is reusable across every
integration (Shelly first, Home Assistant and others later).

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
  "available_from": "2026-07-25T22:00:00Z",
  "unavailable": { "from": "07:00:00", "to": "09:00:00" },
  "tasks": [
    { "task_id": 1, "duration_hours": 3, "ready_by": "2026-07-26T06:00:00Z", "continuous_block": false }
  ]
}
```

**Global (device context):**

| Field | Meaning |
| --- | --- |
| `device_id` | Identifies the device (logging, later rate-limiting / state). |
| `lat` / `lon` | GPS. Resolved server-side to a bidding zone. **`decimal`**, matching the exact-value lat/lng convention used everywhere else. |
| `available_from` | *Optional.* Earliest the appliance may draw power (e.g. when it was plugged in) — the lower bound of the eligible window. Null ⇒ default to the task's deadline minus 24h. |
| `unavailable` | *Optional.* A single "do not run" window, **time-of-day only** (no date). Applies to every task. May wrap past midnight (`from > to`, e.g. `22:00–06:00`). |

**Tasks (the jobs):** an array so a user can express several needs at once ("1h wash by 14:00" *and* "4h EV
charge by 07:00").

| Field | Meaning |
| --- | --- |
| `task_id` | **`int`**, always supplied by the device script. |
| `duration_hours` | The one field that's always required — total hours of power the task needs. |
| `ready_by` | *Optional.* **The anchor** — strict deadline the task must finish by. Null ⇒ default `now + 24h`. |
| `continuous_block` | `true` ⇒ hours must run back-to-back (boiler, washer). `false` (default) ⇒ split for the absolute cheapest hours (EV charging, the "don't care" case). |

The minimal valid request is just a device id, coordinates, and one task with a `duration_hours`.

### Response

```json
{
  "device_id": "shelly-1",
  "bidding_zone_id": 5,
  "zone_name": "Czech Republic",
  "relay_state": true,
  "now_utc": "2026-07-25T23:15:00+00:00",
  "next_toggle_utc": "2026-07-26T00:00:00+00:00",
  "tasks": [
    {
      "task_id": 1,
      "scheduled": true,
      "hours": [
        { "start_utc": "2026-07-25T23:00:00+00:00", "end_utc": "2026-07-26T00:00:00+00:00", "eur_per_mwh": 42.1 }
      ]
    }
  ]
}
```

| Field | Meaning |
| --- | --- |
| `relay_state` | **The one actionable field** — should the relay be ON right now? `true` if *any* task is scheduled for the current instant (OR across tasks, because one relay = one on/off). |
| `now_utc` | The evaluation instant. |
| `next_toggle_utc` | When the relay is next expected to flip, or null. Lets a smarter device poll less and set a local wake. |
| `tasks[].scheduled` | `false` ⇒ the task couldn't be placed (e.g. window too short). |
| `tasks[].hours` | The chosen slots, so a client can see *why*, or drive its own logic. |

The response is **deliberately lean** — it's consumed by a device script, not a human. No display strings, no
labels, no reasons. Everything is UTC.

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
└─ SmartHomeShellyController.cs        concrete: POST /api/schedule. Inherits the base; a vendor-specific
                                        controller would inherit the same base and override only the mapping.
Services/SmartHome/
├─ IZoneLocatorService.cs             coordinates → bidding zone (own responsibility).
├─ ZoneLocatorService.cs             STUBBED — throws NotImplementedException (no zone polygons yet).
├─ IScheduleService.cs               the decision engine's contract.
└─ ScheduleService.cs                the brain: resolves zone, loads prices, evaluates each task.
Dtos/Schedule/
├─ ScheduleRequest.cs                request + UnavailableWindow + TaskRequest.
└─ ScheduleResponse.cs               response + TaskResult + ScheduledHour.
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

1. **Anchor on the deadline.** The eligible window is the 24h *before* `ready_by` (or from `available_from` if
   given), clamped so we never schedule in the past:
   ```
   anchor         = ready_by ?? now + 24h
   windowStart    = available_from ?? anchor − 24h
   effectiveStart = max(now, windowStart)
   eligible       = price slots in [effectiveStart, anchor]  minus  the unavailable window
   ```
   This is deliberately **not** a calendar day (00:00–23:59). Anchoring on the deadline and looking back means
   the cheap overnight block (e.g. 23:00→05:00) stays whole instead of being sliced at midnight.

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

- **Coordinate→zone resolution is stubbed** (`ZoneLocatorService` throws). The endpoint won't run end-to-end
  until it's implemented (options: ship bidding-zone polygons for point-in-polygon; nearest-centre as a rough
  first cut; or an external API). Everything downstream is already written against the interface.
- **Timezone handling is deferred** — UTC assumed end to end.
- **The read depends on populated prices** — the scheduler only sees what's in the DB. The daily populate job
  (README's planned Azure Function, ~13:00 CET after the day-ahead auction) must run first.

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
