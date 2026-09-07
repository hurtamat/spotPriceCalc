// Fills the wizard's answers into the minified Shelly scripts.
//
// The templates are the committed output of scripts/shelly/minify.sh, imported as raw text. They must be
// the minified ones: an mJS script lives in about 8 KB of per-script heap and the readable sources do not
// fit. Minification mangles identifiers, so the placeholders are string literals — the only thing a
// minifier leaves alone. minify.sh fails the build if any of them stops surviving.

import scheduleTemplate from '../../../scripts/shelly/dist/schedule.js?raw';
import priceColorTemplate from '../../../scripts/shelly/dist/priceColor.js?raw';

// Read by the device, not the browser: during local testing this is the machine's LAN address, because
// a Shelly's "localhost" is itself. Falls back to the browser's base URL, which is right once deployed.
const DEVICE_API_BASE =
  import.meta.env.VITE_DEVICE_API_BASE_URL ??
  import.meta.env.VITE_API_BASE_URL ??
  'http://localhost:5262';

export interface WizardAnswers {
  /** ENTSO-E area code. It also tells the backend which timezone the hours are in — the zone catalog
   *  carries that, so no timezone is baked into the script or sent on the wire. */
  zoneCode: string;
  hours: number;
  /** Hour the job must finish by, in the zone's local time. */
  deadline: number;
  continuous: boolean;
  /** Do-not-run window, local hours. Equal values mean no window. */
  unavailFrom: number;
  unavailTo: number;
}

// A loopback address means the device would call itself, and the script fails with nothing to explain
// why. It is what the fallback above produces when VITE_DEVICE_API_BASE_URL is unset during local
// development, so refuse it here rather than let a dead script reach someone's plug.
function deviceBaseUrl(): string {
  const url = DEVICE_API_BASE.replace(/\/+$/, '');
  if (/^https?:\/\/(localhost|127\.\d+\.\d+\.\d+|\[::1\])(:|\/|$)/i.test(url)) {
    throw new Error(
      `The device address is ${url}, which points a Shelly at itself. Set VITE_DEVICE_API_BASE_URL ` +
        `to this machine's address on the network (see frontend/.env.example) and reload.`,
    );
  }
  return url;
}

/** Every placeholder must be listed, or `fill` throws rather than shipping a half-filled script. */
function tokensFor(a: WizardAnswers): Record<string, string> {
  return {
    __BACKEND_URL__: deviceBaseUrl(),
    __ZONE_CODE__: a.zoneCode,
    __HOURS__: String(a.hours),
    __DEADLINE__: String(a.deadline),
    __CONTINUOUS__: a.continuous ? '1' : '0',
    __UNAVAIL_FROM__: String(a.unavailFrom),
    __UNAVAIL_TO__: String(a.unavailTo),
  };
}

function fill(template: string, tokens: Record<string, string>): string {
  let out = template;
  for (const [token, value] of Object.entries(tokens)) {
    // A value containing a quote or a backslash would break out of the string literal it lands in.
    if (/["\\]/.test(value)) throw new Error(`Unsafe value for ${token}: ${value}`);
    out = out.split(token).join(value);
  }
  const left = out.match(/__[A-Z_]+__/);
  if (left) throw new Error(`Template still has ${left[0]} — no answer was supplied for it`);
  return out;
}

/** The relay script: fetches the plan and drives the switch. */
export function generateScheduleScript(answers: WizardAnswers): string {
  return fill(scheduleTemplate, tokensFor(answers));
}

/** The LED-ring script. Only the backend URL and zone apply to it. */
export function generatePriceColorScript(answers: WizardAnswers): string {
  const { __BACKEND_URL__, __ZONE_CODE__ } = tokensFor(answers);
  return fill(priceColorTemplate, { __BACKEND_URL__, __ZONE_CODE__ });
}
