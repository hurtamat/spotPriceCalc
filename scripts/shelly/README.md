# Shelly clients

The **layer-3 control** scripts that live on a Shelly device. They talk to our backend and let the device
act on spot prices with all the optimization done server-side — thin clients, as described in
[`../../smartHomeIntegration.md`](../../smartHomeIntegration.md).

Two independent scripts (run either or both):

| File | Endpoint | What it does |
| --- | --- | --- |
| [`schedule.shelly.js`](./schedule.shelly.js) | `POST /api/shelly/schedule` | Fetches the day's cheap-hours plan and drives the **relay**. |
| [`priceColor.shelly.js`](./priceColor.shelly.js) | `GET /api/shelly/schedule/status` | Shows the current price as a **colour** on the LED ring. |

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
3. Edit the `CONFIG` / `COLOR_CONFIG` block at the top (backend URL, zone code, switch id…).
4. **Save** → **Start**, enable **Run on startup**, and watch `print(...)` in the console.

The console only streams while it's open, and boot lines fire once — restart with the console open to see them.

---

## `schedule.shelly.js` — the relay planner

**Model (commit, not live):** fetch the plan **once** and run the relay locally off it — no per-minute backend
calls.

- On boot it ensures the user's **Virtual Components** exist (created only if none are present, so a user can
  delete ones they don't want): `continuous` toggle, `hours`, `deadline`, `unavailFrom`, `unavailTo` sliders,
  plus two read-only labels (`today` / `tomorrow`) showing when it will run.
- **The response has its own shape.** `ShellyScheduleResponse` sends `slots` as bare `[start, end]` pairs
  rather than `ScheduleResponse`'s per-block objects with a price the device never reads. Every byte costs
  twice on-device — once in the response buffer, again in the parsed graph — and the script used to build
  and immediately discard those objects. Home Assistant keeps the richer shape.
- **The labels' text comes from the backend**, as `today_local` / `tomorrow_local` on the response. The
  device has no timezone database, so it cannot render UTC blocks in local time — and formatting them
  server-side means it carries no formatting code either. The blocks stay UTC, because that is what the
  relay compares against.
- **It prints nothing.** Every string literal stays resident in the ~8 KB script heap, and logging was
  enough to push it over. The two labels report the same thing where the user can actually see it, so the
  console output was paying twice. Add a `print()` back temporarily if you need to debug, and check
  `mem_peak` afterwards.
- It `POST`s the inputs to `/api/shelly/schedule` and stores the returned ON-blocks in KVS (`sched_plan`).
- A local **tick (5 min)** drives the relay from the stored plan and refreshes the displays.
- It re-fetches when a new day starts, after the day-ahead prices publish (~13:00 UTC), or when the
  sliders no longer match what the stored plan was built from — a fingerprint of the settings stored on
  the plan as `PLAN.sig`.
- **An edit applies about two seconds later.** A status handler wakes a debounced `maybeDailyFetch`, which
  compares that fingerprint, so an event that changed nothing relevant costs one string compare and stops.
  The two mechanisms compose: the handler gives the speed, the tick's own check is the safety net if an
  event is ever missed. Components the script did not create are ignored — a metering plug emits
  `switch:0` status constantly, and each one would reset the debounce so it never fired.
- **One job per device:** the request is flat — one `duration_hours`, one deadline — which is all a relay needs.
- **The zone is baked in as `CONFIG.zoneCode`**, an ENTSO-E area code, and the script never sends coordinates.
  Resolution is a setup-time question, not a per-request one, so the wizard answers it once with
  `GET /api/zones/resolve?lat=&lon=` and writes the code into the generated script. Same contract Home
  Assistant uses; the device stays out of the geography business.
- **Hours are the zone's local time, converted server-side.** The sliders are plain hours and go out as
  `ready_by_local`; `SmartHomeShellyController` resolves them against the zone's own IANA timezone, which
  the zone catalog already carries — so no timezone travels on the wire either. mJS has no timezone
  database, and a UTC hour baked in at wizard time would drift an hour at every DST switch.
- **Everything from the backend is UTC**, one canonical form (`YYYY-MM-DDTHH:MM:SSZ`); block times are
  compared as plain strings, which works only because that form is fixed-width and sorts chronologically.

## `priceColor.shelly.js` — the price-colour indicator

- Every **5 min** (repeating `Timer`) plus once on boot, it `GET`s `/api/shelly/schedule/status?zoneCode&time`.
- **The zone is baked in as `COLOR_CONFIG.zoneCode`**, the same contract `schedule.shelly.js` uses — neither
  script sends coordinates.
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

## Memory (mJS is tight — about 8 KB of heap, per script)

`Shelly.GetStatus` reports it per script; on a Plug S Gen3 `mem_used + mem_free` came to ~8.4 KB, with
`priceColor` peaking at 3206 B against 2627 B of source. **Source size is therefore the binding constraint** —
mJS keeps the whole script text resident and parses as it runs, so comments and long identifiers cost real
memory on the device. An earlier 10.3 KB version of `schedule.shelly.js` could not fit at all: it died at the
HTTP POST, which was simply where the last allocation landed.

Hence [`minify.sh`](./minify.sh) — see below. Some devices sit right at the edge, so also:

- **Keep the scripts lean.** Resident code + string literals cost RAM. Component configs are built lazily
  (only during creation) so they aren't held the rest of the time.
- **HTTPS is the big spike, and it is why both scripts speak plain `http://`.** The TLS handshake needs a
  large transient buffer; if free RAM is low the fetch fails with "out of memory" *before* any response — and
  on a weak device it reliably does. Don't stack two fetches at once, and don't run heavy scripts alongside.
- **Don't call `Shelly.GetComponents` on-device** — the full dump is large enough to OOM. Use targeted calls.
- To inspect free RAM: `Shelly.getComponentStatus("sys").ram_free`.

## Building the paste-ready script

```bash
./minify.sh                    # both scripts
./minify.sh schedule.shelly.js # just one
```

Minifies with the frontend's `rolldown` into `dist/` and **paste that**, not the source. Roughly halves the
bytes with no behaviour change:

| Script | Source | `dist/` |
| --- | --- | --- |
| `schedule` | 11749 B | 4714 B |
| `priceColor` | 2671 B | 1149 B |

Two mJS quirks it handles: template literals are unsupported and the minifier rewrites every string as
one, so they are converted back to quotes; and it fails loudly if the output ever contains an arrow
function or `const`, neither of which mJS accepts.

`dist/` **is committed**, unlike most build output: nothing in CI generates it, the wizard serves it to the
browser and substitutes the `CONFIG` values per user, and at ~8 KB of device heap the byte count in a diff is
worth seeing. So run `minify.sh` and commit the result whenever you change a script — a stale `dist/` ships
the old behaviour to every user.

Keep the readable source in git too — the comments are the documentation, and they cost nothing once stripped.

## Transport: plain HTTP, and where it runs

Both scripts target **`http://<dev machine>:5262`**, not the deployed backend. Two reasons, and only the first
is about convenience:

- **TLS does not fit in the device.** See the memory section — the handshake buffer OOMs the script before a
  response arrives. Dropping to plain HTTP removes the spike entirely.
- **The deployed ingress won't serve plain HTTP.** Azure Container Apps redirects `http://` to `https://`
  unless `allow_insecure_connections` is set, and it isn't. So this is a **local-testing setup** for now.

Run the backend with the **`http` launch profile** — it binds `0.0.0.0:5262`, so the device can reach it
across the LAN — and set `backendUrl` to your machine's LAN address (currently `10.12.2.133`, the `wlo1` Wi-Fi address — DHCP, so re-check it if fetches start failing).

Plain HTTP over a LAN is fine while the request carries no credentials, which today it doesn't. It stops
being fine once device auth exists. The durable answer is **MQTT**: the connection is held by firmware rather
than by mJS, so the handshake cost is paid once at boot instead of on every fetch, and a retained plan topic
suits the commit-not-track model better than polling does. That's the next step, not this one.

## The contract

Request/response shapes mirror the backend DTOs in `spotPriceCalc/Dtos/Schedule/` — keep them in sync:

- `ScheduleRequest.cs` / `ScheduleResponse.cs` — the schedule POST (`zone_code` + `ready_by_utc` instant in;
  `blocks` of `start_utc`/`end_utc` out, all UTC `...Z`).
- `StatusSchedule.cs` / `PriceColor.cs` — the status GET (`zoneCode`/`time` in; a `PriceColor` number out).

## Onboarding: the config wizard

Editing `CONFIG` by hand is the developer path. End users go to **`/shelly`** in the frontend
(`ShellyWizard.tsx`), which asks their browser for coordinates, resolves the zone with
`GET /api/zones/resolve`, and **fills the answers into the minified script** for them to copy.

The wizard bakes in only what cannot change on the device: the backend URL and the zone code. The job
itself — hours, deadline, continuous, unavailable window — stays editable through the Virtual Components,
so changing your mind does not mean re-pasting a script. The wizard's answers are just their starting
values.

**How the filling works.** `frontend/src/shelly/generate.ts` imports `dist/*.js?raw` and replaces
placeholder tokens. They are `__LIKE_THIS__` **strings**, because the minifier mangles identifiers and folds
literal expressions but never touches the contents of a string — `Number("__HOURS__")` gets folded straight
to `NaN`, so every token is a string and coerced afterwards. `minify.sh` fails the build if a token stops
surviving, and `generate.ts` throws rather than emitting a script with an unreplaced token in it.

The backend URL comes from `VITE_DEVICE_API_BASE_URL`, separate from `VITE_API_BASE_URL`: the browser and
the device do not reach the API at the same address during local testing, since a Shelly's `localhost` is
itself.

## Documentation

- Scripting tutorial — https://shelly-api-docs.shelly.cloud/gen2/Scripts/Tutorial/
- Language features (mJS subset) — https://shelly-api-docs.shelly.cloud/gen2/Scripts/ShellyScriptLanguageFeatures/
- Script API reference — https://shelly-api-docs.shelly.cloud/gen2/Scripts/ShellyScriptReferences/
- HTTP RPC — https://shelly-api-docs.shelly.cloud/gen2/ComponentsAndServices/HTTP
- Switch component — https://shelly-api-docs.shelly.cloud/gen2/ComponentsAndServices/Switch
- Plug S Gen3 (`PLUGS_UI` LED ring) — https://shelly-api-docs.shelly.cloud/gen2/Devices/Gen3/ShellyPlugSG3/
