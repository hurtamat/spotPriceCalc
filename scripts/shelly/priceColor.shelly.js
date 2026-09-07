// price-color client: shows the current price colour (green/yellow/red) on the device.

// Plain http:// to the dev machine on the LAN — the TLS handshake OOMs this device. See README.md.
let COLOR_CONFIG = {
  backendUrl: "http://10.12.2.133:5262",
  endpoint: "/api/shelly/schedule/status",
  timeoutSec: 15,
  fetchSec: 300,
  // ENTSO-E area code, baked in when the script is generated — same contract as schedule.shelly.js,
  // so the device never resolves geography. GET /api/zones/resolve?lat=&lon= names it once at setup.
  zoneCode: "10YCZ-CEPS-----N",
};

function nowIso() { return new Date().toISOString().slice(0, 19) + "Z"; }

// 0=green, 1=yellow, 2=red.
function parseCode(body) {
  let v;
  try { v = JSON.parse(/** @type {string} */ (body)); } catch (e) { return null; }
  return (v === 0 || v === 1 || v === 2) ? v : null;
}

// Plug S Gen3 LED ring via PLUGS_UI (rgb 0–100). Both on/off states set the same colour so it shows
// regardless of relay state.
function rgbFor(code) {
  if (code === 0) return [0, 100, 0];    // green
  if (code === 1) return [100, 55, 0];   // yellow/amber, green pulled down so it isn't greenish
  if (code === 2) return [100, 0, 0];    // red
  return null;
}

function setLeds(rgb, brightness) {
  let colors = { "switch:0": {
    on:  { rgb: rgb, brightness: brightness },
    off: { rgb: rgb, brightness: brightness },
  } };
  Shelly.call("PLUGS_UI.SetConfig", /** @type {*} */ ({ config: { leds: { mode: "switch", colors: colors } } }),
    function (r, ec, em) { if (ec !== 0) print("PLUGS_UI.SetConfig failed: " + em); });
}

function setColor(code) {
  let rgb = rgbFor(code);
  if (rgb === null) { clearColor(); return; }
  setLeds(rgb, 100);
}

function clearColor() {
  setLeds([0, 0, 0], 0);
}

function fetchColor() {
  let url = COLOR_CONFIG.backendUrl + COLOR_CONFIG.endpoint +
    "?zoneCode=" + COLOR_CONFIG.zoneCode +
    "&time=" + nowIso();

  print("fetching colour @ " + nowIso());
  Shelly.call("HTTP.GET", /** @type {*} */ ({ url: url, timeout: COLOR_CONFIG.timeoutSec }), function (res, ec, em) {
    if (ec !== 0) { print("status GET failed: " + em); clearColor(); return; }
    if (res.code !== 200) { print("status HTTP " + res.code); clearColor(); return; }
    let code = parseCode(res.body);
    if (code === null) { print("bad colour body: " + res.body); clearColor(); return; }
    print("price colour code: " + code);
    setColor(code);
  });
}

print("price-color starting");
fetchColor();
Timer.set(COLOR_CONFIG.fetchSec * 1000, true, fetchColor);