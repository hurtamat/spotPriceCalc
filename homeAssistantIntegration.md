# Home Assistant integration

The **layer-3 control** path for Home Assistant, alongside the Shelly scripts in
[`scripts/shelly/`](./scripts/shelly/README.md). Same model — the backend decides, the client acts —
but where a Shelly drives one relay, this publishes state that *any* device HA controls can act on.
For the endpoint it consumes see [`smartHomeIntegration.md`](./smartHomeIntegration.md).

> **The integration lives in its own repository**, `spotprice-ha`, because HACS installs
> from a repository root and its validation assumes the repo *is* the integration. This document
> stays here: the endpoint it consumes is defined in this repo, and the two have to move together.
> Everything below describes code in that repository.

> **Status in one line:** working against a live backend. The integration calls
> `POST /api/homeassistant/schedule`, stores the committed blocks, drives
> `binary_sensor.spotbuddy_running` and the price sensors off them, and ships its own Lovelace card.
> Verified end to end with the backend running locally; not yet against the deployed one.

---

## Why an integration and not an add-on

An *add-on* is a Docker container the Supervisor runs next to HA, and only exists on HA OS and
Supervised installs — it would exclude everyone running HA Container or Core. A *custom integration*
is Python in `custom_components/`, works on every install type, and is what HACS distributes. That is
what this is.

## The model: publish state, don't control devices

The integration never touches a device. It publishes `binary_sensor.spotbuddy_running`, which is
**on** while the current time falls inside a committed run block, and the user wires that to whatever
they already own via an automation. One integration, any hardware — which is the whole
supplier/hardware-agnostic pitch in [IDEA.md](./IDEA.md).

## Entities

| Entity | Platform | Role |
| --- | --- | --- |
| `binary_sensor.spotbuddy_running` | binary_sensor | **The contract.** On inside a run block. Attributes carry `zone_name`, `scheduled`, the full `blocks` list, and `schedule` (the same blocks as an on/off step series, for charting cards). |
| `sensor.spotbuddy_current_price` | sensor | EUR/MWh for the current slot, read off the curve at each tick. `state_class: measurement`, so Home Assistant's built-in history graph plots it with no card. |
| `sensor.spotbuddy_price_level` | sensor (enum) | `green` / `yellow` / `red` for the current slot, read off the curve. |
| `sensor.spotbuddy_next_start` | sensor (timestamp) | When the appliance next switches on; the *following* block while one is running. Rendered in the user's timezone by Home Assistant. |
| `sensor.spotbuddy_next_end` | sensor (timestamp) | End of the running block, or of the next one when idle. |
| `switch.spotbuddy_enabled` | switch | Master off switch. |
| `switch.spotbuddy_continuous_block` | switch | Hours back-to-back, or split for the cheapest slots. |
| `number.spotbuddy_duration` | number | Hours of power needed. The one always-required field. |
| `time.spotbuddy_ready_by` | time | The deadline. The eligible window is the 24h before it. |
| `switch.spotbuddy_unavailable_window` | switch | Whether the do-not-run window applies. Off ⇒ the two times below are ignored and no `unavailable` is sent. |
| `time.spotbuddy_unavailable_from` / `_to` | time | The do-not-run window itself. |
| `button.spotbuddy_refresh_plan` | button | Fetch the plan again now. |

The config entities map one-to-one onto the fields of `ScheduleRequest.cs`, which is flat: one
request is one job. As with the Shelly script, **one appliance per config entry** — add a second
entry for a second appliance.

This is the piece that removes the "generate a pre-filled script to paste" wizard for HA users: they
change the hours in the HA UI and the plan re-fetches. No re-pasting.

## Architecture

```
custom_components/spotbuddy/           (in the spotprice-ha repo)
├─ __init__.py        setup/unload/reload lifecycle, device-name sync
├─ api.py             HTTP client for the backend; the only place aiohttp appears
├─ coordinator.py     SpotBuddyCoordinator + the SpotBuddyPlan/ScheduledBlock model
├─ config_flow.py     initial setup + options flow (backend URL, zone, controlled switch)
├─ entity.py          shared identity: unique_id, device_info, translation key
├─ binary_sensor.py   the run-block sensor
├─ sensor.py          price / price level / next start / next end
├─ switch.py          enabled, continuous_block, window   ┐
├─ number.py          duration_hours                     ├ the task parameters
├─ time.py            ready_by, unavailable_from/to      ┘
├─ button.py          manual refresh
├─ www/               the bundled Lovelace card, served by async_setup
└─ helpers/general.py get_parameter, DeviceNameCreator
```

**Read state is coordinator-driven, config state is restored.** The read-only entities subclass
`CoordinatorEntity` and derive everything from `coordinator.data`. The config entities are
`RestoreEntity` / `RestoreNumber`: they restore their value on startup, push it onto the coordinator,
and call `async_config_updated()` on change, which re-plans. `is_running`, `current_price`,
`price_level`, `next_start` and `next_end` are **computed properties** on the coordinator, not stored
fields, so there is no ordering problem between a refresh landing and the entities reading it.

**Refresh cadence mirrors the commit model.** No polling loop (`update_interval=None`). The plan is
fetched at 00:05 and 13:05 UTC — after midnight, and once the day-ahead prices publish — plus whenever
a config entity changes. Both listeners use `async_track_utc_time_change`; the plain variant matches
local time, which had the afternoon refresh firing before the prices existed. A separate quarter-hourly tick only re-evaluates the *stored* plan against the
clock and pushes state out — it never re-optimizes. That is the same "commit, not track" model the
Shelly script uses, and it is why the drift problem at the end of `smartHomeIntegration.md` does not
appear here.

## The backend endpoint

`POST /api/homeassistant/schedule`, served by `SmartHomeHomeAssistantController`. It takes the same
device-agnostic `ScheduleRequest` as the Shelly endpoint and runs the same `ScheduleService` — only
the response differs, which is exactly what the abstract base controller's virtual step exists for.

It is the only call made at runtime. The config flow additionally calls `GET /api/zones` to fill the
zone dropdown — which doubles as the reachability check, so an unreachable backend is reported in the
dialog — and `GET /api/zones/resolve?lat=&lon=` with Home Assistant's own coordinates to preselect the
right zone. The user picks a zone by name; what is stored and sent is its ENTSO-E code.

**Why a second endpoint rather than reusing the Shelly one.** A Shelly drives one relay and needs
nothing but the run windows, so its response has since narrowed to bare `[start, end]` pairs plus two
label strings — it is `ShellyScheduleResponse`, not `ScheduleResponse`, and carries no prices at all.
Home Assistant publishes price sensors as well, so reusing that endpoint would mean three calls per
refresh (plan, colour, curve) and one of them could not be served from it anyway. This endpoint returns
all three in one payload:

```json
{
  "device_id": "01J...", "zone_name": "Czech Republic",
  "generated_at_utc": "2026-09-01T12:00:00Z",
  "scheduled": true, "blocks": [ ... ],
  "curve": [ { "start_utc": ..., "end_utc": ..., "eur_per_mwh": ..., "level": 0 } ]
}
```

Each point's `level` is the `PriceColor` enum **as an int** — 0 green, 1 yellow, 2 red — matching
`GET /api/shelly/schedule/status`, which the Shelly script already depends on. Null means unclassified, and
the integration then shows no level rather than guessing. The curve backs the price sensor's `curve`
attribute, which is marked `_unrecorded_attributes` so ~200 points per state write never reach the
recorder database.

**There is no "current price" field, deliberately.** The curve is the single representation: the
coordinator finds the slot containing its own `utcnow()` on every quarter-hourly tick, so
`sensor.spotbuddy_current_price` and `sensor.spotbuddy_price_level` track the slot. A value computed
server-side at request time would be stale within the hour, since the plan is only fetched twice a
day — and it would be derived from this same curve anyway.

The service-side addition is `IScheduleService.ResolvePriceCurveAsync` — the curve for the instant's
day and the next, returned as a plain list. Logic in the service, glue in the controller, as
elsewhere. `curve` is null when the zone has no stored prices at all.

`_target_local_date` picks which day to ask for: today, unless today's `ready_by` has already passed,
in which case tomorrow. The backend anchors the eligible window on the deadline and looks back 24h,
so after the deadline the only interesting plan is the next one.

## Timezones

**The wire is UTC; the user types local; the integration converts.** Each task carries
`ready_by_utc` as a single **instant**, not a date plus a time-of-day — a wall clock only becomes a
moment once you know the timezone, and the client is the only side that does. Guessing UTC on the
backend is what made "ready by 06:00" mean 08:00 in Prague.

`_deadline_utc` combines the local date and the user's `ready_by` and converts once, which keeps a
deadline near local midnight on the right day: 00:30 in Prague is 22:30 UTC the *previous* day.

Clearing **Ready by** sends `null`, and the backend schedules against the next 24h
(`ScheduleRequest.ResolveDeadlineUtc`). Its `nowUtc` is a parameter rather than a `DateTime.UtcNow`
call inside, so a test pins the clock instead of working around it.

The `unavailable` window stays a time-of-day pair, converted by `_to_utc_time` using the offset **on
the deadline's date** so it does not drift an hour across a DST change.

## The card

The integration ships a Lovelace card, `www/spotbuddy-card.js`, registered in `async_setup` with
`async_register_static_paths` plus `add_extra_js_url` (versioned, so a browser cache does not serve
an old copy). It appears in the card picker, so nobody installs a frontend repository or writes YAML.

It takes the Running binary sensor and finds the price sensor on the **same device**, which is what
keeps two appliances apart. It draws the curve coloured by level, shades each planned block — several
bands when the hours are split — and converts every time to the viewer's timezone. The card is the
only place that conversion happens.

For people who prefer their own chart, `binary_sensor.spotbuddy_running` also carries `schedule`, the
blocks as an on/off step series, which is the shape a stepline chart wants.

## What is not built

- **Auth.** The API key field was removed from the config flow: the plan is rate limiting rather than
  a per-user credential. `api.py` keeps the `X-Api-Key` plumbing and raises `ConfigEntryAuthFailed`
  on a 401/403, so adding one later is a config-flow field and nothing else. The backend checks
  nothing today — see the "No auth" note at the top of [DESIGN.md](./DESIGN.md).
- **Tests.** `requirements_test.txt` pins the HA test harness; there is no `tests/` directory yet.
- **The production backend URL.** `DEFAULT_BASE_URL` in `const.py` is still a local development
  address; it needs the deployed host before release.
- **A config-entry migration.** Entries created before the `zone_code` change store `latitude` /
  `longitude` and must be re-added by hand.

## Development

CI in the integration repo runs hassfest, HACS validation and `black`.

To try it locally, symlink or copy `custom_components/spotbuddy/` into your HA config directory and
restart HA, then add the integration from Settings → Devices & Services.

**Changing the wire format touches both repos.** The response shape is defined by
`HomeAssistantScheduleResponse.cs` here and parsed by `coordinator.py::_parse_plan` there; nothing
enforces that they agree.

## Attribution

The structure — the entity base class, the platform patterns, the setup/unload/reload lifecycle and
the CI workflow — is derived from
[**EV Smart Charging**](https://github.com/jonasbkarlsson/ev_smart_charging) by Jonas Karlsson, MIT
licensed. Its scheduling logic, EV/SOC handling and price-sensor adaptors were **not** carried over:
that integration optimizes locally against another integration's price sensor, whereas ours reads a
plan committed by our own backend.
