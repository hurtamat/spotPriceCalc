// Plain http:// on purpose: the TLS handshake needs a transient buffer this device cannot spare and
// fails with "out of memory" before any response. So this points at the dev machine on the LAN, not
// at the deployed backend (whose ingress redirects http:// to https://). Run the `http` profile —
// it binds 0.0.0.0:5262 — and put your machine's LAN address here.
let CONFIG = {
  backendUrl: "http://10.12.2.133:5262",
  endpoint: "/api/shelly/schedule",

  switchId: 0,

  tickSec: 300,
  fetchHourUtc: 13,

  // ENTSO-E area code, baked in when the script is generated. GET /api/zones lists them and
  // GET /api/zones/resolve?lat=&lon= names the one covering a location.
  zoneCode: "10YCZ-CEPS-----N",
  deviceId: "shelly-1",
};

let KVS_VC = "sched_vc";
let KVS_PLAN = "sched_plan";

let ROLES = [
  ["continuous", "boolean"],
  ["hours", "number"],
  ["deadline", "number"],
  ["unavailFrom", "number"],
  ["unavailTo", "number"],
];

let VC = {};
let PLAN = null;

function typeForRole(role) {
  for (let i = 0; i < ROLES.length; i++) if (ROLES[i][0] === role) return ROLES[i][1];
  return null;
}

// Built on demand only during creation, so these strings/objects aren't held in RAM the rest of the time.
function configFor(role) {
  if (role === "continuous")  return { name: "Continuous block", default_value: false, meta: { ui: { view: "toggle" } } };
  if (role === "hours")       return { name: "Hours needed", default_value: 3, min: 0, max: 24, meta: { ui: { view: "slider", unit: "h", step: 1 } } };
  if (role === "deadline")    return { name: "Charged by (hour UTC)", default_value: 6, min: 0, max: 23, meta: { ui: { view: "slider", unit: "h", step: 1 } } };
  if (role === "unavailFrom") return { name: "Unavailable from (hour UTC)", default_value: 0, min: 0, max: 23, meta: { ui: { view: "slider", unit: "h", step: 1 } } };
  if (role === "unavailTo")   return { name: "Unavailable to (hour UTC)", default_value: 0, min: 0, max: 23, meta: { ui: { view: "slider", unit: "h", step: 1 } } };
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
    continuous: getBool(VC.continuous, false),
    hours: getNum(VC.hours, 0),
    deadline: getNum(VC.deadline, 0),
    unavailFrom: getNum(VC.unavailFrom, 0),
    unavailTo: getNum(VC.unavailTo, 0),
  };
}

function pad2(n) { return (n < 10 ? "0" : "") + n; }
function nowIso() { return new Date().toISOString().slice(0, 19) + "Z"; }
function todayStr() { return nowIso().slice(0, 10); }
function tomorrowStr() { return new Date(Date.now() + 86400000).toISOString().slice(0, 10); }
function nowHourUtc() { return Number(nowIso().slice(11, 13)); }
// Next future deadline as canonical UTC ISO (today if the hour is still ahead, else tomorrow).
function nextDeadlineIso(hour) {
  let cand = todayStr() + "T" + pad2(hour) + ":00:00Z";
  if (cand <= nowIso()) cand = tomorrowStr() + "T" + pad2(hour) + ":00:00Z";
  return cand;
}

// One request is one job, so the body is flat. The zone is the baked-in code, never coordinates —
// the backend resolves nothing on our behalf.
function buildBody(inputs) {
  let info = Shelly.getDeviceInfo();
  let body = {
    device_id: info ? info.id : CONFIG.deviceId,
    zone_code: CONFIG.zoneCode,
    duration_hours: inputs.hours,
    ready_by_utc: nextDeadlineIso(inputs.deadline),   // an instant, e.g. "2026-08-09T06:00:00Z"
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
  if (inputs.hours <= 0) { print("hours needed = 0 — nothing to schedule"); return; }

  let body = JSON.stringify(buildBody(inputs));

  Shelly.call("HTTP.POST", {
    url: CONFIG.backendUrl + CONFIG.endpoint,
    body: body,
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
  let slots = [];
  if (resp.blocks) {
    for (let i = 0; i < resp.blocks.length; i++) slots.push([resp.blocks[i].start_utc, resp.blocks[i].end_utc]);
  }
  if (resp.scheduled === false) print("backend could not place the job");

  PLAN = { day: todayStr(), afterPublish: nowHourUtc() >= CONFIG.fetchHourUtc, slots: slots };
  Shelly.call("KVS.Set", { key: KVS_PLAN, value: JSON.stringify(PLAN) }, null);

  applyRelay();
  print("plan stored: " + slots.length + " block(s)");
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
    if (ec !== 0) print("Switch.Set failed: " + em);
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
    // Edits to the Virtual Components apply on the next tick, not instantly — the status handler
    // that made them immediate cost more heap than the 5-minute wait is worth.
    Timer.set(CONFIG.tickSec * 1000, true, tick);
  });
});
