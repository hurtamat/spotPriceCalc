# Shelly clients

The **layer-3 control** scripts that live on a Shelly device. They talk to our backend and let the device
act on spot prices with all the optimization done server-side — thin clients, as described in
[`../../smartHomeIntegration.md`](../../smartHomeIntegration.md).

Two independent scripts (run either or both):

| File | Endpoint | What it does |
| --- | --- | --- |
| [`schedule.shelly.js`](./schedule.shelly.js) | `POST /api/schedule` | Fetches the day's cheap-hours plan and drives the **relay**. |
| [`priceColor.shelly.js`](./priceColor.shelly.js) | `GET /api/schedule/status` | Shows the current price as a **colour** on the LED ring. |

> The `.shelly.js` extension turns on the Shelly VS Code extension's type-checking. Types are handled via
> JSDoc; `/** @type {*} */` casts silence a few over-strict RPC typings without changing runtime behaviour.

## Requirements

- A **Gen2+ Shelly** (Plus / Pro / Gen3). Gen1 devices can't run scripts.
- The device must reach the backend over the network (LAN or WAN).
- **Run on startup** must be enabled per script (`Script.SetConfig {id, config:{enable:true}}`, or the toggle
  in the Scripts UI) — otherwise timers stop after a reboot and the script won't come back.
- `priceColor.shelly.js`'s colour output currently targets the **Plug S Gen3 LED ring** (`PLUGS_UI`). Other
  RGB devices use a different call (`RGB.Set` / `Light.Set`) — see the colour section below.

## How to run

1. Device web UI → **Scripts** → **Add script**.
2. Paste the script contents.
3. Edit the `CONFIG` / `COLOR_CONFIG` block at the top (backend URL, coordinates, switch id…).
4. **Save** → **Start**, enable **Run on startup**, and watch `print(...)` in the console.

The console only streams while it's open, and boot lines fire once — restart with the console open to see them.

---

## `schedule.shelly.js` — the relay planner

**Model (commit, not live):** fetch the plan **once** and run the relay locally off it — no per-minute backend
calls.

- On boot it ensures the user's **Virtual Components** exist (created only if none are present, so a user can
  delete ones they don't want): `continuous` toggle, `hours`, `deadline`, `unavailFrom`, `unavailTo` sliders,
  plus two read-only text labels (`today` / `tomorrow`).
- It `POST`s the inputs to `/api/schedule` and stores the returned ON-blocks in KVS (`sched_plan`).
- A local **tick (5 min)** drives the relay from the stored plan and refreshes the displays.
- It re-fetches when: a new day starts, after the day-ahead prices publish (~13:00 UTC), or when the user
  **edits a Virtual Component** (debounced status handler → overwrites the plan).
- **Single task by design:** the API accepts many tasks, but a Shelly drives one relay, so it always sends
  one task (`task_id` 1) and reads `tasks[0]`.
- **All UTC**, one canonical form (`YYYY-MM-DDTHH:MM:SSZ`); times compared as plain strings.

## `priceColor.shelly.js` — the price-colour indicator

- Every **5 min** (repeating `Timer`) plus once on boot, it `GET`s `/api/schedule/status?lat&lon&time`.
- The backend returns the `PriceColor` enum as a **number**: `0`=green, `1`=yellow, `2`=red.
- It maps the code to an RGB value and sets the **Plug S Gen3 LED ring** via `PLUGS_UI.SetConfig`
  (rgb is a **0–100** scale, not 0–255; both on/off states are set the same so the colour shows regardless of
  relay state).
- **On any error** (transport / non-200 / bad body) it clears the LED rather than showing a stale colour.

### Colour tuning

On these LEDs the green die is brighter than red, so `[100,100,0]` reads greenish. Yellow is tuned to
`[100,55,0]` (full red, ~half green). Adjust the middle value in `rgbFor` if needed — lower for less green,
higher for more orange. Colours use the 0–100 scale per the
[Plug S Gen3 docs](https://shelly-api-docs.shelly.cloud/gen2/Devices/Gen3/ShellyPlugSG3/).

---

## Memory (mJS is tight — a few KB of heap, shared)

Some devices sit right at the edge, so:

- **Keep the scripts lean.** Resident code + string literals cost RAM. Component configs are built lazily
  (only during creation) so they aren't held the rest of the time.
- **HTTPS is the big spike.** The TLS handshake needs a large transient buffer; if free RAM is low the fetch
  fails with "out of memory" *before* any response. Don't stack two fetches at once, and don't run heavy
  scripts alongside.
- **Don't call `Shelly.GetComponents` on-device** — the full dump is large enough to OOM. Use targeted calls.
- To inspect free RAM: `Shelly.getComponentStatus("sys").ram_free`.

## The contract

Request/response shapes mirror the backend DTOs in `spotPriceCalc/Dtos/Schedule/` — keep them in sync:

- `ScheduleRequest.cs` / `ScheduleResponse.cs` — the schedule POST (`date` + `ready_by` time-of-day in; per-task
  `blocks` of `start_utc`/`end_utc` out, all UTC `...Z`).
- `StatusSchedule.cs` / `PriceColor.cs` — the status GET (lat/lon/time in; a `PriceColor` number out).

## Planned onboarding: the config wizard (not built yet)

Editing `CONFIG` by hand is the developer path. The intended end-user onboarding is a **frontend wizard** that
collects the user's parameters and **outputs a ready-to-paste script with values pre-filled** — no code
editing, no on-device settings. Values are baked in at generation time (changing a setting = re-run the wizard
and re-paste). Decided, not implemented.

## Documentation

- Scripting tutorial — https://shelly-api-docs.shelly.cloud/gen2/Scripts/Tutorial/
- Language features (mJS subset) — https://shelly-api-docs.shelly.cloud/gen2/Scripts/ShellyScriptLanguageFeatures/
- Script API reference — https://shelly-api-docs.shelly.cloud/gen2/Scripts/ShellyScriptReferences/
- HTTP RPC — https://shelly-api-docs.shelly.cloud/gen2/ComponentsAndServices/HTTP
- Switch component — https://shelly-api-docs.shelly.cloud/gen2/ComponentsAndServices/Switch
- Plug S Gen3 (`PLUGS_UI` LED ring) — https://shelly-api-docs.shelly.cloud/gen2/Devices/Gen3/ShellyPlugSG3/
