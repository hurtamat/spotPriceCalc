# Shelly schedule client

The **layer-3 control** script that lives on a Shelly device. It polls our backend
(`POST /api/schedule`), reads the single `relay_state` boolean, and drives the switch.
All optimization is server-side — this is the thin client described in
[`../../smartHomeIntegration.md`](../../smartHomeIntegration.md).

> **Status:** scaffold / TODO. See the `TODO`s in [`schedule.js`](./schedule.js) before
> running on real hardware. This will move to its own repo later.

## Requirements

- A **Gen2+ Shelly** (Plus / Pro line). Gen1 devices can't run scripts.
- The device must reach the backend over the network (LAN or WAN). `localhost` in the
  config points at the device's own loopback, not your dev machine.

## How to run it on a device

1. Open the device web UI → **Scripts** → **Add script**.
2. Paste the contents of `schedule.js`.
3. Edit the `CONFIG` block (backend URL, device id, coordinates, tasks, switch id).
4. **Save** → **Start**. Use the console output (`print(...)`) to watch polls.

You can also push it over RPC with `Script.PutCode` — see the docs below.

## Planned onboarding: the config wizard (not yet implemented)

Editing the `CONFIG` block by hand is the developer path, not the end-user one. The intended
onboarding is a **separate frontend screen — a step-by-step wizard** that walks the user through
their parameters (location/zone, hours needed, ready-by time, continuous vs. split, unavailable
window, switch/channel) and then **outputs a ready-to-paste `schedule.js` with those values
pre-filled**. The user just copies it into the device's Scripts UI — no code editing, no manual
JSON, no on-device settings screen.

This means the values are **baked into the script at generation time**. Changing a setting later =
re-run the wizard and re-paste (fine for set-and-forget configs; see the discussion in
[`../../smartHomeIntegration.md`](../../smartHomeIntegration.md)). It also lets us drop the fiddly
on-device Virtual Component inputs for v1 — only the read-only "charging today/tomorrow" displays
stay.

> **Status:** decided, **not built yet.** No wizard screen exists; today you still paste and edit
> `CONFIG` by hand.

## Documentation

- Scripting tutorial — https://shelly-api-docs.shelly.cloud/gen2/Scripts/Tutorial/
- Language features (mJS subset) — https://shelly-api-docs.shelly.cloud/gen2/Scripts/ShellyScriptLanguageFeatures/
- Script API reference — https://shelly-api-docs.shelly.cloud/gen2/Scripts/ShellyScriptReferences/
- HTTP RPC (`HTTP.POST`) — https://shelly-api-docs.shelly.cloud/gen2/ComponentsAndServices/HTTP
- Switch component (`Switch.Set`) — https://shelly-api-docs.shelly.cloud/gen2/ComponentsAndServices/Switch

## The contract

Request/response shapes mirror the backend DTOs in
`spotPriceCalc/Dtos/Schedule/`. Keep them in sync:

- `ScheduleRequest.cs` — what we POST.
- `ScheduleResponse.cs` — what we read.

**Single task by design.** The API's `tasks` array can carry several jobs, but a Shelly switches one
relay, so this client always sends exactly one task (`task_id` 1) and reads `tasks[0]` back. Multi-task
is left to integrations that drive multiple outputs (e.g. Home Assistant); it is deliberately not
surfaced in the device's Virtual Components.
