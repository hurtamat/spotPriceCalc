# Home Assistant integration — `custom_components/spotbuddy`

The **layer-3 control** path for Home Assistant, alongside the Shelly scripts in
[`scripts/shelly/`](./scripts/shelly/README.md). Same model — the backend decides, the client acts —
but where a Shelly drives one relay, this publishes state that *any* device HA controls can act on.
For the endpoint it consumes see [`smartHomeIntegration.md`](./smartHomeIntegration.md).

> **Status in one line:** the integration installs, configures and creates every entity, but the
> backend client is **not written yet** — `SpotBuddyCoordinator._async_update_data` returns an empty
> plan. Everything below the API boundary works; the API boundary is the next task.

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
| `binary_sensor.spotbuddy_running` | binary_sensor | **The contract.** On inside a run block. Attributes carry `zone_name` and the full `blocks` list. |
| `sensor.spotbuddy_status` | sensor (enum) | `disabled`, `waiting_for_plan`, `no_plan`, `waiting_to_start`, `running`, `backend_unavailable`. Slugs, so automations are language-independent. |
| `sensor.spotbuddy_current_price` | sensor | EUR/MWh for the current slot. |
| `sensor.spotbuddy_price_level` | sensor (enum) | `green` / `yellow` / `red`, from `GET /api/schedule/status`. |
| `switch.spotbuddy_enabled` | switch | Master off switch. |
| `switch.spotbuddy_continuous_block` | switch | Hours back-to-back, or split for the cheapest slots. |
| `number.spotbuddy_duration` | number | Hours of power needed. The one always-required task field. |
| `time.spotbuddy_ready_by` | time | The deadline. The eligible window is the 24h before it. |
| `time.spotbuddy_unavailable_from` / `_to` | time | The optional do-not-run window. |
| `button.spotbuddy_refresh_plan` | button | Fetch the plan again now. |

The config entities map one-to-one onto a single `TaskRequest` in `ScheduleRequest.cs`. As with the
Shelly script, **one task per config entry** — add a second entry for a second appliance.

This is the piece that removes the "generate a pre-filled script to paste" wizard for HA users: they
change the hours in the HA UI and the plan re-fetches. No re-pasting.

## Architecture

```
custom_components/spotbuddy/
├─ __init__.py        setup/unload/reload lifecycle, device-name sync
├─ coordinator.py     SpotBuddyCoordinator + the SpotBuddyPlan/ScheduledBlock model
├─ config_flow.py     initial setup + options flow (backend URL, API key, coordinates)
├─ entity.py          shared identity: unique_id, device_info, translation key
├─ binary_sensor.py   the run-block sensor
├─ sensor.py          status / price / price level
├─ switch.py          enabled, continuous_block          ┐
├─ number.py          duration_hours                     ├ the task parameters
├─ time.py            ready_by, unavailable_from/to      ┘
├─ button.py          manual refresh
└─ helpers/general.py get_parameter, DeviceNameCreator
```

**Read state is coordinator-driven, config state is restored.** The read-only entities subclass
`CoordinatorEntity` and derive everything from `coordinator.data`. The config entities are
`RestoreEntity` / `RestoreNumber`: they restore their value on startup, push it onto the coordinator,
and call `async_config_updated()` on change, which re-plans. `is_running` and `status` are
**computed properties** on the coordinator, not stored fields, so there is no ordering problem
between a refresh landing and the entities reading it.

**Refresh cadence mirrors the commit model.** No polling loop (`update_interval=None`). The plan is
fetched after midnight and again at 13:05 UTC once the day-ahead prices publish, plus whenever a
config entity changes. A separate quarter-hourly tick only re-evaluates the *stored* plan against the
clock and pushes state out — it never re-optimizes. That is the same "commit, not track" model the
Shelly script uses, and it is why the drift problem at the end of `smartHomeIntegration.md` does not
appear here.

## What is not built

- **The API client.** `_async_update_data` is a stub. It needs to POST the task built from the config
  entities to `/api/schedule` and read `/api/schedule/status` for the colour.
- **Auth.** The config flow collects an API key; the backend does not check one yet. See the auth gap
  noted in [DESIGN.md](./DESIGN.md) — this integration is the reason to close it, since it exposes the
  endpoint to arbitrary clients.
- **A price-curve endpoint keyed by lat/lon**, to fill the price sensor's curve attribute.
  `GET /api/spotprices` currently needs a `biddingZoneId` and one date.
- **Tests.** `requirements_test.txt` pins the HA test harness; there is no `tests/` directory yet.

## Development

CI is [`.github/workflows/ha-integration.yml`](./.github/workflows/ha-integration.yml) — hassfest,
HACS validation and `black`, path-filtered so .NET and frontend changes don't trigger it. The HACS
job is `continue-on-error` on purpose: it also validates repository-level metadata and assumes the
repo *is* the integration, so it only goes green once this is split into its own repository for
distribution. That split is also what HACS needs to install it.

To try it locally, symlink or copy `custom_components/spotbuddy/` into your HA config directory and
restart HA, then add the integration from Settings → Devices & Services.

## Attribution

The structure — the entity base class, the platform patterns, the setup/unload/reload lifecycle and
the CI workflow — is derived from
[**EV Smart Charging**](https://github.com/jonasbkarlsson/ev_smart_charging) by Jonas Karlsson, MIT
licensed. Its scheduling logic, EV/SOC handling and price-sensor adaptors were **not** carried over:
that integration optimizes locally against another integration's price sensor, whereas ours reads a
plan committed by our own backend.
