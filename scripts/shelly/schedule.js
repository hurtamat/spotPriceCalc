// spot-price schedule client — Shelly Gen2+ script (mJS)
//
// Runs ON the Shelly device. Periodically POSTs the device's tasks to our backend
// (POST /api/schedule), reads back a single `relay_state` boolean, and drives the
// switch from it. All the optimization happens server-side — this stays a thin client.
//
// Target: Gen2+ devices only (Plus / Pro). Gen1 can't run scripts.
// Language: mJS (restricted JS — no fetch/async/await/template-literals). See:
//   https://shelly-api-docs.shelly.cloud/gen2/Scripts/ShellyScriptLanguageFeatures/
//   https://shelly-api-docs.shelly.cloud/gen2/ComponentsAndServices/HTTP  (HTTP.POST)
//   https://shelly-api-docs.shelly.cloud/gen2/ComponentsAndServices/Switch (Switch.Set)
//
// STATUS: SCAFFOLD / TODO. Wiring is stubbed; see the TODOs before running on a device.

// ---------------------------------------------------------------------------
// Config — edit these for the device.
// ---------------------------------------------------------------------------
let CONFIG = {
  // Backend base URL. Must be reachable from the device's LAN/WAN.
  // TODO: point at the real deployment (e.g. "https://api.example.com"). Localhost
  //       here won't work — it's the device's own loopback, not your dev machine.
  backendUrl: "http://192.168.1.100:5262",

  deviceId: "shelly-1",       // matches ScheduleRequest.device_id

  // GPS — resolved to a bidding zone server-side. TODO: set real coordinates.
  lat: 50.08,
  lon: 14.44,

  // Which switch/relay this script drives (Switch component id, usually 0).
  switchId: 0,

  // How often to poll the backend, in seconds.
  // TODO(commit-model): once the backend commits a frozen daily plan (see
  //   smartHomeIntegration.md "commit vs. track"), ~15 min is the intended cadence.
  pollIntervalSec: 900,

  // The jobs this device needs. Shape mirrors Dtos/Schedule/ScheduleRequest.TaskRequest.
  // TODO: make these user-configurable (Shelly KVS or the Virtual Components UI)
  //       instead of hardcoding.
  tasks: [
    {
      task_id: 1,
      duration_hours: 3,
      ready_by: null,          // null => backend defaults to now + 24h
      continuous_block: false, // false => cheapest split hours; true => back-to-back
    },
  ],

  // Optional device-level fields (omit / leave null if unused).
  availableFrom: null,         // ISO-8601 string or null
  unavailable: null,           // e.g. { from: "07:00:00", to: "09:00:00" }
};

// ---------------------------------------------------------------------------
// Build the request body (ScheduleRequest).
// ---------------------------------------------------------------------------
function buildRequestBody() {
  let body = {
    device_id: CONFIG.deviceId,
    lat: CONFIG.lat,
    lon: CONFIG.lon,
    tasks: CONFIG.tasks,
  };
  if (CONFIG.availableFrom !== null) body.available_from = CONFIG.availableFrom;
  if (CONFIG.unavailable !== null) body.unavailable = CONFIG.unavailable;
  return body;
}

// ---------------------------------------------------------------------------
// Apply the backend decision: flip the relay to match relay_state.
// ---------------------------------------------------------------------------
function applyRelayState(on) {
  Shelly.call(
    "Switch.Set",
    { id: CONFIG.switchId, on: on },
    function (result, errCode, errMsg) {
      if (errCode !== 0) {
        print("Switch.Set failed: " + errMsg);
        return;
      }
      print("Relay set to " + (on ? "ON" : "OFF"));
    }
  );
  // TODO(next_toggle): the response also carries next_toggle_utc. A smarter version
  //   could schedule a one-shot Timer at that instant and poll less often.
}

// ---------------------------------------------------------------------------
// Poll: POST /api/schedule, parse the response, drive the relay.
// ---------------------------------------------------------------------------
function poll() {
  let url = CONFIG.backendUrl + "/api/schedule";
  let body = buildRequestBody();

  Shelly.call(
    "HTTP.POST",
    {
      url: url,
      body: JSON.stringify(body),
      content_type: "application/json",
      timeout: 10,
    },
    function (result, errCode, errMsg) {
      if (errCode !== 0) {
        print("schedule POST failed: " + errMsg);
        return; // leave the relay as-is on a failed poll (fail-safe).
      }

      // result.code is the HTTP status; result.body is the raw response string.
      if (result.code !== 200) {
        print("schedule POST HTTP " + result.code + ": " + result.body);
        return;
      }

      let resp = JSON.parse(result.body); // ScheduleResponse
      // TODO: guard against malformed JSON — JSON.parse throws in mJS; wrap or validate.

      print("zone=" + resp.zone_name + " relay_state=" + resp.relay_state);
      applyRelayState(resp.relay_state === true);
    }
  );
}

// ---------------------------------------------------------------------------
// Kick off: poll once now, then on the configured interval.
// ---------------------------------------------------------------------------
poll();
Timer.set(CONFIG.pollIntervalSec * 1000, true, poll);
