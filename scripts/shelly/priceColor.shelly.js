// price-color client — show the current price colour (green/yellow/red) on the device.

let COLOR_CONFIG = {
  backendUrl: "https://spotbuddy-backend.yellowsea-e9574071.westeurope.azurecontainerapps.io",
  endpoint: "/api/schedule/status",
  timeoutSec: 15,
  lat: 50.08,   // fallback if the device has no configured location
  lon: 14.44,
};

let KVS_SCHED = "pc_sched_id";
let CRON = "0 1,16,31,46 * * * *";   // :01/:16/:31/:46 every hour

function nowIso() { return new Date().toISOString().slice(0, 19) + "Z"; }

function deviceLocation() {
  let sys = Shelly.getComponentConfig("sys");
  if (sys && sys.location && typeof sys.location.lat === "number") return sys.location;
  return null;
}

// Enum comes back as a number (0=Green,1=Yellow,2=Red); tolerate strings too.
function parseColor(body) {
  let v;
  try { v = JSON.parse(/** @type {string} */ (body)); } catch (e) { return null; }
  if (v === 0 || v === "Green")  return "green";
  if (v === 1 || v === "Yellow") return "yellow";
  if (v === 2 || v === "Red")    return "red";
  return null;
}

// TODO: wire to the actual LED per device.
function setColor(color) { print("TODO setColor -> " + color); }
function clearColor() { print("TODO clearColor"); }

function fetchColor() {
  let loc = deviceLocation();
  let url = COLOR_CONFIG.backendUrl + COLOR_CONFIG.endpoint +
    "?lat=" + (loc ? loc.lat : COLOR_CONFIG.lat) +
    "&lon=" + (loc ? loc.lon : COLOR_CONFIG.lon) +
    "&time=" + nowIso();

  Shelly.call("HTTP.GET", /** @type {*} */ ({ url: url, timeout: COLOR_CONFIG.timeoutSec }), function (res, ec, em) {
    if (ec !== 0) { print("status GET failed: " + em); clearColor(); return; }
    if (res.code !== 200) { print("status HTTP " + res.code); clearColor(); return; }
    let color = parseColor(res.body);
    if (color === null) { print("bad colour body: " + res.body); clearColor(); return; }
    print("price colour: " + color);
    setColor(color);
  });
}

// One Schedule job that evals fetchColor() in this script; delete any previous one first so we never duplicate.
function ensureSchedule(done) {
  let sid = Shelly.getCurrentScriptId();

  function create() {
    Shelly.call("Schedule.Create", /** @type {*} */ ({
      enable: true,
      timespec: CRON,
      calls: [{ method: "Script.Eval", params: { id: sid, code: "fetchColor()" } }],
    }), function (cr, cec, cem) {
      if (cec !== 0) { print("Schedule.Create failed: " + cem); done(); return; }
      Shelly.call("KVS.Set", { key: KVS_SCHED, value: JSON.stringify(cr.id) }, function () { done(); });
    });
  }

  Shelly.call("KVS.Get", { key: KVS_SCHED }, function (r, ec) {
    let oldId = (ec === 0 && r && r.value) ? Number(r.value) : null;
    if (oldId !== null) Shelly.call("Schedule.Delete", { id: oldId }, function () { create(); });
    else create();
  });
}

print("price-color starting");
ensureSchedule(function () {
  fetchColor();
});
