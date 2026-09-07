// Plain http:// on purpose: the TLS handshake needs a transient buffer this device cannot spare and
// fails with "out of memory" before any response. So this points at the dev machine on the LAN, not
// at the deployed backend (whose ingress redirects http:// to https://). Run the `http` profile —
// it binds 0.0.0.0:5262 — and put your machine's LAN address here.
// The placeholder values below are filled in by the setup wizard (frontend ConfigurePage) before the
// user pastes this. They are all strings: the minifier mangles identifiers and folds literal
// expressions, but never touches the contents of a string. See minify.sh, which enforces it.
let CONFIG = {
  backendUrl: "__BACKEND_URL__",
  endpoint: "/api/shelly/schedule",

  switchId: 0,   // 0 on a single-channel plug; multi-channel devices number theirs 0, 1, 2

  tickSec: 300,
  fetchHourUtc: 13,

  // ENTSO-E area code, resolved from the user's coordinates at wizard time. It also tells the backend
  // which timezone the hours below are in — the zone catalog carries that, so we never send one.
  zoneCode: "__ZONE_CODE__",
  deviceId: "shelly-1",

  // Starting values for the Virtual Components below. The user changes them on the device afterwards;
  // these only decide what the sliders read on first run.
  hours: "__HOURS__",
  deadline: "__DEADLINE__",
  continuous: "__CONTINUOUS__",   // "1" or "0"
  unavailFrom: "__UNAVAIL_FROM__",
  unavailTo: "__UNAVAIL_TO__",
};

// Every token is a string because the minifier folds Number("literal") straight to NaN, which would
// erase the placeholder before the wizard ever saw it. Coerce here instead, once.
CONFIG.hours = Number(CONFIG.hours);
CONFIG.deadline = Number(CONFIG.deadline);
CONFIG.unavailFrom = Number(CONFIG.unavailFrom);
CONFIG.unavailTo = Number(CONFIG.unavailTo);
CONFIG.continuous = CONFIG.continuous === "1";

let KVS_VC = "sched_vc";
let KVS_PLAN = "sched_plan";

let ROLES = [
  ["continuous", "boolean"],
  ["hours", "number"],
  ["deadline", "number"],
  ["unavailFrom", "number"],
  ["unavailTo", "number"],
  ["today", "text"],
  ["tomorrow", "text"],
];

let VC = {};
let PLAN = null;

function typeForRole(role) {
  for (let i = 0; i < ROLES.length; i++) if (ROLES[i][0] === role) return ROLES[i][1];
  return null;
}

// Built on demand only during creation, so these strings/objects aren't held in RAM the rest of the time.
function configFor(role) {
  // Hours are the user's own local clock — the backend converts them using CONFIG.timeZone.
  if (role === "continuous")  return { name: "Continuous block", default_value: CONFIG.continuous, meta: { ui: { view: "toggle" } } };
  if (role === "hours")       return { name: "Hours needed", default_value: CONFIG.hours, min: 0, max: 24, meta: { ui: { view: "slider", unit: "h", step: 1 } } };
  if (role === "deadline")    return { name: "Ready by (hour)", default_value: CONFIG.deadline, min: 0, max: 23, meta: { ui: { view: "slider", unit: "h", step: 1 } } };
  if (role === "unavailFrom") return { name: "Unavailable from (hour)", default_value: CONFIG.unavailFrom, min: 0, max: 23, meta: { ui: { view: "slider", unit: "h", step: 1 } } };
  if (role === "unavailTo")   return { name: "Unavailable to (hour)", default_value: CONFIG.unavailTo, min: 0, max: 23, meta: { ui: { view: "slider", unit: "h", step: 1 } } };
  if (role === "today")       return { name: "Running today", default_value: "—", meta: { ui: { view: "label" } } };
  if (role === "tomorrow")    return { name: "Running tomorrow", default_value: "—", meta: { ui: { view: "label" } } };
  return null;
}

function normalizeKey(role, raw) {
  if (typeof raw === "string") return raw;
  if (typeof raw === "number") { let t = typeForRole(role); return t ? (t + ":" + raw) : null; }
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
    if (i >= ROLES.length) { cb(ids); return; }
    let role = ROLES[i][0];
    Shelly.call("Virtual.Add", /** @type {*} */ ({ type: ROLES[i][1], config: configFor(role) }), function (res, ec, em) {
      if (ec !== 0) print("Virtual.Add failed for " + role + ": " + em);
      else ids[role] = normalizeKey(role, res.id);
      i++;
      next();
    });
  }
  next();
}
function anyComponentExists(ids) {
  for (let i = 0; i < ROLES.length; i++) {
    let key = ids[ROLES[i][0]];
    if (key && Shelly.getComponentStatus(key)) return true;
  }
  return false;
}
function createAndStore(done) {
  createAllComponents(function (newIds) {
    print("Added the SpotBuddy settings to this device. Change them on the device's own page.");
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
    continuous: getBool(VC.continuous, CONFIG.continuous),
    hours: getNum(VC.hours, CONFIG.hours),
    deadline: getNum(VC.deadline, CONFIG.deadline),
    unavailFrom: getNum(VC.unavailFrom, CONFIG.unavailFrom),
    unavailTo: getNum(VC.unavailTo, CONFIG.unavailTo),
  };
}

function setText(role, str) {
  let key = VC[role];
  if (!key) return;
  let id = Number(key.slice(key.indexOf(":") + 1));
  Shelly.call("Text.Set", { id: id, value: str }, null);
}

// The backend sends these already formatted in local time — the device has no timezone database, so it
// could not build them itself, and this way it carries no formatting code either.
function updateDisplays() {
  if (!PLAN) return;
  // A plan stored by an older version of this script has no strings; show a dash until the next fetch.
  setText("today", PLAN.today || "—");
  setText("tomorrow", PLAN.tomorrow || "—");
}

function pad2(n) { return (n < 10 ? "0" : "") + n; }
function nowIso() { return new Date().toISOString().slice(0, 19) + "Z"; }
function todayStr() { return nowIso().slice(0, 10); }
function nowHourUtc() { return Number(nowIso().slice(11, 13)); }
// One request is one job, so the body is flat. The zone is the baked-in code, never coordinates.
//
// Hours go out as the zone's local wall clock and the backend turns them into instants. The device
// cannot: mJS has no timezone database, and a UTC hour baked in at wizard time would drift an hour at
// every DST switch.
function buildBody(inputs) {
  let info = Shelly.getDeviceInfo();
  let body = {
    device_id: info ? info.id : CONFIG.deviceId,
    zone_code: CONFIG.zoneCode,
    duration_hours: inputs.hours,
    ready_by_local: pad2(inputs.deadline) + ":00:00",
    continuous_block: inputs.continuous,
  };
  // from == to means "no unavailable window".
  if (inputs.unavailFrom !== inputs.unavailTo) {
    body.unavailable = { from: pad2(inputs.unavailFrom) + ":00:00", to: pad2(inputs.unavailTo) + ":00:00" };
  }
  return body;
}

function fetchPlan() {
  let inputs = readInputs();
  if (inputs.hours <= 0) { print("Hours needed is 0, so there is nothing to schedule."); return; }

  let body = JSON.stringify(buildBody(inputs));

  Shelly.call("HTTP.POST", {
    url: CONFIG.backendUrl + CONFIG.endpoint,
    body: body,
    content_type: "application/json",
    timeout: 15,
  }, function (res, ec, em) {
    if (ec !== 0) { print("Could not reach SpotBuddy: " + em); return; }
    if (res.code !== 200) { print("SpotBuddy replied with an error (" + res.code + "): " + res.body); return; }
    let resp;
    try { resp = JSON.parse(res.body); } catch (e) { print("SpotBuddy's reply could not be read."); return; }
    onPlan(resp);
  });
}

function onPlan(resp) {
  let slots = [];
  if (resp.blocks) {
    for (let i = 0; i < resp.blocks.length; i++) slots.push([resp.blocks[i].start_utc, resp.blocks[i].end_utc]);
  }

  PLAN = {
    day: todayStr(),
    afterPublish: nowHourUtc() >= CONFIG.fetchHourUtc,
    slots: slots,
    today: resp.today_local || "—",
    tomorrow: resp.tomorrow_local || "—",
  };
  Shelly.call("KVS.Set", { key: KVS_PLAN, value: JSON.stringify(PLAN) }, null);

  if (resp.scheduled === false) {
    print("No cheap hours found for those settings. Check the hours and the ready-by time.");
  } else {
    print("Today: " + PLAN.today + " | Tomorrow: " + PLAN.tomorrow);
  }

  updateDisplays();
  applyRelay();
}

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
    if (ec !== 0) print("Could not switch the relay: " + em);
  });
}

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
loadOrCreateComponents(function () {
  Shelly.call("KVS.Get", { key: KVS_PLAN }, function (res, ec) {
    if (ec === 0 && res && res.value) {
      try { PLAN = JSON.parse(/** @type {string} */ (res.value)); } catch (e) { PLAN = null; }
    }
    applyRelay();
    maybeDailyFetch();
    // Edits to the Virtual Components apply on the next tick, not instantly — the status handler
    // that made them immediate cost more heap than the 5-minute wait is worth.
    Timer.set(CONFIG.tickSec * 1000, true, tick);
  });
});
