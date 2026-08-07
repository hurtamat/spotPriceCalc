// spot-price schedule client — Shelly Gen2+ script (mJS)
//
// Model: fetch the day's plan ONCE, store it, run the relay locally off the stored plan.
//   - User settings live in Virtual Components (sliders / toggle) the user edits in the Shelly app.
//   - Once a day we read those, POST /api/schedule, and store the returned ON-hours in KVS.
//   - A local tick drives the relay from the stored plan — no per-minute backend calls.
//   - Two read-only text components show the hours chosen for today and tomorrow.
//
// One task only: the /api/schedule API accepts a list of tasks, but a Shelly drives a single relay,
// so this client always sends exactly one task (task_id 1) and reads back tasks[0]. Multi-task is a
// backend capability other integrations can use; it is intentionally not exposed here.
//
// One time format only. The backend sends plain UTC ISO ("YYYY-MM-DDTHH:MM:SSZ", no offset), and we
// normalise the device clock into that exact same form (see nowIso). Every time value in this script is
// then the same fixed-width UTC string, so we compare them with a plain string compare — lexicographic
// order is chronological order — and never parse dates (which mJS doesn't reliably support). Local time
// is ignored for now; the hour sliders are UTC hours.

let CONFIG = {
  backendUrl: "https://spotbuddy-backend.yellowsea-e9574071.westeurope.azurecontainerapps.io",
  endpoint: "/api/schedule",

  switchId: 0,           // which Switch component the relay is

  tickSec: 300,           // how often the local tick re-evaluates the relay
  fetchHourUtc: 13,

  // Fallbacks for location
  lat: 50.08,
  lon: 14.44,
  deviceId: "shelly-1",
};

// KVS keys (persist across reboots).
let KVS_VC = "sched_vc";      // role -> component key ("number:200", ...)
let KVS_PLAN = "sched_plan";  // the committed plan for the day
let KVS_INIT = "sched_init";  // "1" once the virtual components have been created (guards re-creation)

// The Virtual Components we manage, in display order.
let COMPONENTS = [
  { role: "continuous", type: "boolean",
    config: { name: "Continuous block", default_value: false, meta: { ui: { view: "toggle" } } } },
  { role: "hours", type: "number",
    config: { name: "Hours needed", default_value: 3, min: 0, max: 24,
              meta: { ui: { view: "slider", unit: "h", step: 1 } } } },
  { role: "deadline", type: "number",
    config: { name: "Charged by (hour UTC)", default_value: 6, min: 0, max: 23,
              meta: { ui: { view: "slider", unit: "h", step: 1 } } } },
  { role: "unavailFrom", type: "number",
    config: { name: "Unavailable from (hour UTC)", default_value: 0, min: 0, max: 23,
              meta: { ui: { view: "slider", unit: "h", step: 1 } } } },
  { role: "unavailTo", type: "number",
    config: { name: "Unavailable to (hour UTC)", default_value: 0, min: 0, max: 23,
              meta: { ui: { view: "slider", unit: "h", step: 1 } } } },
  { role: "today", type: "text",
    config: { name: "Charging today", default_value: "—", meta: { ui: { view: "label" } } } },
  { role: "tomorrow", type: "text",
    config: { name: "Charging tomorrow", default_value: "—", meta: { ui: { view: "label" } } } },
];

let VC = {};        // role -> component key, filled by setup
let PLAN = null;    // in-memory mirror of the stored plan { day, afterPublish, slots: [[startIso,endIso],...] }

function createAllComponents(cb) {
  let ids = {};
  let i = 0;
  function next() {
    if (i >= COMPONENTS.length) { cb(ids); return; }
    let spec = COMPONENTS[i];
    Shelly.call("Virtual.Add", { type: spec.type, config: spec.config }, function (res, ec, em) {
      if (ec !== 0) print("Virtual.Add failed for " + spec.role + ": " + em);
      else ids[spec.role] = res.id;
      i++;
      next();
    });
  }
  next();
}

// Create the Virtual Components exactly once
function loadOrCreateComponents(done) {
  Shelly.call("KVS.Get", { key: KVS_INIT }, function (res, ec) {
    let initialized = (ec === 0 && res && res.value === "1");

    if (initialized) {
      Shelly.call("KVS.Get", { key: KVS_VC }, function (r2, e2) {
        if (e2 === 0 && r2 && r2.value) {
          try { VC = JSON.parse(r2.value); } catch (e) { VC = {}; }
        }
        done();
      });
      return;
    }

    createAllComponents(function (newIds) {
      VC = newIds;
      Shelly.call("KVS.Set", { key: KVS_VC, value: JSON.stringify(newIds) }, function () {
        Shelly.call("KVS.Set", { key: KVS_INIT, value: "1" }, function () { done(); });
      });
    });
  });
}

// ---------------------------------------------------------------------------
// Read the user's settings off the Virtual Components.
// ---------------------------------------------------------------------------
function getNum(key, dflt) {
  let s = key ? Shelly.getComponentStatus(key) : null;
  return (s && typeof s.value === "number") ? s.value : dflt;
}
function getBool(key, dflt) {
  let s = key ? Shelly.getComponentStatus(key) : null;
  return (s && typeof s.value === "boolean") ? s.value : dflt;
}
function readInputs() {
  return {
    continuous: getBool(VC.continuous, false),
    hours: getNum(VC.hours, 0),
    deadline: getNum(VC.deadline, 0),
    unavailFrom: getNum(VC.unavailFrom, 0),
    unavailTo: getNum(VC.unavailTo, 0),
  };
}

function setText(role, str) {
  let key = VC[role];
  if (!key) return;
  let id = Number(key.slice(key.indexOf(":") + 1));
  Shelly.call("Text.Set", { id: id, value: str }, null);
}

// ---------------------------------------------------------------------------
// Build the ScheduleRequest.
// ---------------------------------------------------------------------------
function pad2(n) { return (n < 10 ? "0" : "") + n; }                                  // 7 -> "07"
function nowIso() { return new Date().toISOString().slice(0, 19) + "Z"; }             // now -> "2026-07-25T23:00:00Z"
function todayStr() { return nowIso().slice(0, 10); }                                 // now -> "2026-07-25"
function tomorrowStr() { return new Date(Date.now() + 86400000).toISOString().slice(0, 10); }  // now -> "2026-07-26"
function nowHourUtc() { return Number(nowIso().slice(11, 13)); }                      // now -> 23

// Next future UTC datetime at the given whole hour, canonical form (today if still ahead, else tomorrow).
function nextDeadlineIso(hour) {
  let cand = todayStr() + "T" + pad2(hour) + ":00:00Z";
  if (cand <= nowIso()) cand = tomorrowStr() + "T" + pad2(hour) + ":00:00Z";
  return cand;
}

function deviceLocation() {
  let sys = Shelly.getComponentConfig("sys");
  if (sys && sys.location && typeof sys.location.lat === "number") return sys.location;
  return null;
}

function buildBody(inputs) {
  let info = Shelly.getDeviceInfo();
  let loc = deviceLocation();
  let body = {
    device_id: info ? info.id : CONFIG.deviceId,
    lat: loc ? loc.lat : CONFIG.lat,
    lon: loc ? loc.lon : CONFIG.lon,
    tasks: [{
      task_id: 1,
      duration_hours: inputs.hours,
      ready_by: nextDeadlineIso(inputs.deadline),
      continuous_block: inputs.continuous,
    }],
  };
  // from == to means "no unavailable window".
  if (inputs.unavailFrom !== inputs.unavailTo) {
    body.unavailable = { from: pad2(inputs.unavailFrom) + ":00:00", to: pad2(inputs.unavailTo) + ":00:00" };
  }
  return body;
}

// ---------------------------------------------------------------------------
// Fetch + store the plan.
// ---------------------------------------------------------------------------
function fetchPlan() {
  let inputs = readInputs();
  if (inputs.hours <= 0) { print("hours needed = 0 — nothing to schedule"); return; }

  Shelly.call("HTTP.POST", {
    url: CONFIG.backendUrl + CONFIG.endpoint,
    body: JSON.stringify(buildBody(inputs)),
    content_type: "application/json",
    timeout: 15,
  }, function (res, ec, em) {
    if (ec !== 0) { print("schedule POST failed: " + em); return; }
    if (res.code !== 200) { print("schedule HTTP " + res.code + ": " + res.body); return; }
    let resp;
    try { resp = JSON.parse(res.body); } catch (e) { print("Failed to parse response"); return; }
    onPlan(resp);
  });
}

function onPlan(resp) {
  // Single task: read its blocks directly (backend returns them sorted by time, as canonical UTC ISO).
  let task = (resp.tasks && resp.tasks.length > 0) ? resp.tasks[0] : null;
  let slots = [];
  if (task && task.blocks) {
    for (let i = 0; i < task.blocks.length; i++) slots.push([task.blocks[i].start_utc, task.blocks[i].end_utc]);
  }

  PLAN = { day: todayStr(), afterPublish: nowHourUtc() >= CONFIG.fetchHourUtc, slots: slots };
  Shelly.call("KVS.Set", { key: KVS_PLAN, value: JSON.stringify(PLAN) }, null);

  updateDisplays();
  applyRelay();
  print("plan stored: " + slots.length + " on-slot(s), zone=" + (resp.zone_name || "?"));
}

// ---------------------------------------------------------------------------
// Drive the relay + displays from the stored plan.
// ---------------------------------------------------------------------------
// Both bounds and "now" are the same canonical UTC string, so a plain string compare is chronological.
function isNowWithin(slot) {
  let now = nowIso();
  return slot[0] <= now && now < slot[1];
}

function applyRelay() {
  let on = false;
  if (PLAN && PLAN.slots) {
    for (let i = 0; i < PLAN.slots.length; i++) {
      if (isNowWithin(PLAN.slots[i])) { on = true; break; }
    }
  }
  Shelly.call("Switch.Set", { id: CONFIG.switchId, on: on }, function (res, ec, em) {
    if (ec !== 0) print("Switch.Set failed: " + em);
  });
}

function formatDay(dayStr) {
  let s = "";
  if (PLAN && PLAN.slots) {
    for (let i = 0; i < PLAN.slots.length; i++) {
      if (PLAN.slots[i][0].slice(0, 10) === dayStr) {
        s += (s === "" ? "" : ", ") + PLAN.slots[i][0].slice(11, 16) + "-" + PLAN.slots[i][1].slice(11, 16);
      }
    }
  }
  return s === "" ? "—" : s;
}

function updateDisplays() {
  setText("today", formatDay(todayStr()));
  setText("tomorrow", formatDay(tomorrowStr()));
}

// ---------------------------------------------------------------------------
// Daily fetch decision + tick.
// ---------------------------------------------------------------------------
function maybeDailyFetch() {
  let today = todayStr();
  let hourUtc = nowHourUtc();

  let stale = (PLAN === null) || (PLAN.day !== today);
  let needTomorrow = PLAN && PLAN.day === today && !PLAN.afterPublish && hourUtc >= CONFIG.fetchHourUtc;

  if (stale || needTomorrow) fetchPlan();
}

function tick() {
  maybeDailyFetch();
  updateDisplays();
  applyRelay();
}

// ---------------------------------------------------------------------------
// Boot: ensure components, load the stored plan, then run.
// ---------------------------------------------------------------------------
print("spot-price scheduler starting");
loadOrCreateComponents(function () {
  Shelly.call("KVS.Get", { key: KVS_PLAN }, function (res, ec) {
    if (ec === 0 && res && res.value) {
      try { PLAN = JSON.parse(res.value); } catch (e) { PLAN = null; }
    }
    applyRelay();
    maybeDailyFetch();
    Timer.set(CONFIG.tickSec * 1000, true, tick);
  });
});
