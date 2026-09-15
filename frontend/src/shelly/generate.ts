// Fills the wizard's answers into the minified Shelly scripts.
//
// Templates are minify.sh's committed output: an mJS script gets ~8 KB of heap, and the readable
// sources do not fit. Placeholders are string literals because a minifier leaves those alone.

import scheduleTemplate from '../../../scripts/shelly/dist/schedule.js?raw';
import priceColorTemplate from '../../../scripts/shelly/dist/priceColor.js?raw';

// Read by the device, not the browser, so local testing needs this machine's LAN address:
// a Shelly's "localhost" is itself.
const DEVICE_API_BASE =
  import.meta.env.VITE_DEVICE_API_BASE_URL ??
  import.meta.env.VITE_API_BASE_URL ??
  'http://localhost:5262';

export interface WizardAnswers {
  /** ENTSO-E area code. Also picks the timezone, via the backend's zone catalog. */
  zoneCode: string;
  hours: number;
  /** Hour the job must finish by, in the zone's local time. */
  deadline: number;
  continuous: boolean;
  /** Do-not-run window, local hours. Equal values mean no window. */
  unavailFrom: number;
  unavailTo: number;
}

// RFC 1918, link-local and CGNAT. Fine in dev, never in a production build.
const PRIVATE_HOST =
  /^https?:\/\/(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.)/i;

// The device trusts whatever host this names: it can rewrite the schedule switching their load.
// Loopback points the Shelly at itself; a LAN or plaintext URL in a public build points every
// user's hardware at whoever answers.
function deviceBaseUrl(): string {
  const url = DEVICE_API_BASE.replace(/\/+$/, '');
  if (/^https?:\/\/(localhost|127\.\d+\.\d+\.\d+|\[::1\])(:|\/|$)/i.test(url)) {
    throw new Error(
      `The device address is ${url}, which points a Shelly at itself. Set VITE_DEVICE_API_BASE_URL ` +
        `to this machine's address on the network (see frontend/.env.example) and reload.`,
    );
  }
  if (import.meta.env.PROD && PRIVATE_HOST.test(url)) {
    throw new Error(
      `The device address is ${url}, a private network address, in a production build. ` +
        `VITE_DEVICE_API_BASE_URL was left at its development value; it must be the public API URL.`,
    );
  }
  if (import.meta.env.PROD && !url.startsWith('https://')) {
    throw new Error(
      `The device address is ${url}. A production build must hand devices an https:// URL, or ` +
        `anyone on the network path can rewrite the schedule that runs someone's appliance.`,
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
  if (left) throw new Error(`Template still has ${left[0]}, no answer was supplied for it`);
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
