let CONFIG = {
  backendUrl: "https://spotbuddy-backend.yellowsea-e9574071.westeurope.azurecontainerapps.io",
  endpoint: "/api/schedule",

  switchId: 0,

  tickSec: 300,
  fetchHourUtc: 13,
  
  lat: 50.08,
  lon: 14.44,
  deviceId: "shelly-1",
};

let KVS_VC = "sched_vc";
let KVS_PLAN = "sched_plan";

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

let VC = {};
let PLAN = null;
function typeForRole(role) {
  for (let i = 0; i < COMPONENTS.length; i++) if (COMPONENTS[i].role === role) return COMPONENTS[i].type;
  return null;
}
function normalizeKey(role, raw) {
  if (typeof raw === "string") return raw;
  if (typeof raw === "number") { 
    let t = typeForRole(role);
    return t ? (t + ":" + raw) : null;
  }
  return null;
}
function normalizeVc(map) {
  let out = {};
  for (let role in map) out[role] = normalizeKey(role, map[role]);
  return out;
}

function createAllComponents(cb) {
  let ids = {};
  let i = 0;
  function next() {
    if (i >= COMPONENTS.length) { cb(ids); return; }
    let spec = COMPONENTS[i];
    Shelly.call("Virtual.Add", /** @type {*} */ ({ type: spec.type, config: spec.config }), function (res, ec, em) {
      if (ec !== 0) print("Virtual.Add failed for " + spec.role + ": " + em);
      else ids[spec.role] = normalizeKey(spec.role, res.id);
      i++;
      next();
    });
  }
  next();
}
function anyComponentExists(ids) {
  for (let i = 0; i < COMPONENTS.length; i++) {
    let key = ids[COMPONENTS[i].role];
    if (key && Shelly.getComponentStatus(key)) return true;
  }
  return false;
}
function createAndStore(done) {
  createAllComponents(function (newIds) {
    VC = newIds;
    Shelly.call("KVS.Set", { key: KVS_VC, value: JSON.stringify(newIds) }, function () { done(); });
  });
}
function loadOrCreateComponents(done) {
  Shelly.call("KVS.Get", { key: KVS_VC }, function (res, ec) {
    let ids = null;
    if (ec === 0 && res && res.value) {
      try { ids = normalizeVc(JSON.parse(/** @type {string} */ (res.value))); } catch (e) { ids = null; }
    }
    if (ids && anyComponentExists(ids)) { VC = ids; done(); return; }
    createAndStore(done);
  });
}

// Read the user's settings off the Virtual Components.
function getNum(key, dflt) {
  let s = key ? Shelly.getComponentStatus(key) : null;
  let v = s ? /** @type {*} */ (s).value : null;
  return (typeof v === "number") ? v : dflt;
}
function getBool(key, dflt) {
  let s = key ? Shelly.getComponentStatus(key) : null;
  let v = s ? /** @type {*} */ (s).value : null;
  return (typeof v === "boolean") ? v : dflt;
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

// Build the ScheduleRequest.
function pad2(n) { return (n < 10 ? "0" : "") + n; }
function nowIso() { return new Date().toISOString().slice(0, 19) + "Z"; }
function todayStr() { return nowIso().slice(0, 10); }
function tomorrowStr() { return new Date(Date.now() + 86400000).toISOString().slice(0, 10); }
function nowHourUtc() { return Number(nowIso().slice(11, 13)); }
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

// Fetch + store the plan.
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

// Drive the relay + displays from the stored plan.
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

// Daily fetch decision + tick.
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

// Boot: ensure components, load the stored plan, then run.
print("spot-price scheduler starting");
loadOrCreateComponents(function () {
  Shelly.call("KVS.Get", { key: KVS_PLAN }, function (res, ec) {
    if (ec === 0 && res && res.value) {
      try { PLAN = JSON.parse(/** @type {string} */ (res.value)); } catch (e) { PLAN = null; }
    }
    applyRelay();
    maybeDailyFetch();
    Timer.set(CONFIG.tickSec * 1000, true, tick);
  });
});
