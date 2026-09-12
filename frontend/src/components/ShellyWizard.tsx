import { useEffect, useMemo, useState } from 'react';
import { Nav } from './Nav';
import { Footer } from './Footer';
import { fetchZones, resolveZone, type ZoneOption } from '../api/zones';
import {
  generatePriceColorScript,
  generateScheduleScript,
  type WizardAnswers,
} from '../shelly/generate';

// Layout and copy come from the "Shelly.dc.html" Claude Design canvas. The script itself is still
// generated locally from the minified device templates — the design's sample script is a mock-up.

type Mode = 'relay' | 'colour';

const MODES: { key: Mode; title: string; body: string }[] = [
  {
    key: 'relay',
    title: 'Cheap-hours relay',
    body: 'Switches the plug on during the cheapest hours of the day. This is what SpotSteer is for. Pick this unless you only want the light.',
  },
  {
    key: 'colour',
    title: 'Price colour',
    body: 'Colours the LED ring green, amber or red for the current price, and switches nothing. Plug S Gen3 only.',
  },
];

const COLOUR_LEGEND = [
  // These three are the LED colours the device itself is set to by priceColor.js
  // ([0,100,0] / [100,55,0] / [100,0,0]), not site palette. The legend has to match the
  // plug on the wall, so it does not follow the brand's teal-and-amber price scale.
  { title: 'Cheap', body: 'Bottom third of today’s prices.', color: '#22c55e', glow: 'rgba(34,197,94,.22)' },
  { title: 'Average', body: 'Middle of the day’s range.', color: '#f59e0b', glow: 'rgba(245,158,11,.22)' },
  { title: 'Expensive', body: 'Top third, wait if you can.', color: '#ef4444', glow: 'rgba(239,68,68,.22)' },
];

const INSTALL_STEPS = [
  {
    n: '1',
    title: 'Copy the script',
    body: 'Press Copy script above. Everything you answered is already baked into it, so there is nothing to edit by hand.',
  },
  {
    n: '2',
    title: 'Open the Scripts tab',
    body: "In the Shelly app, select your device and open the { } tab in the left rail. Press Create new script, paste the script in, then Save and Start.",
  },
  {
    n: '3',
    title: 'Let it run on its own',
    body: 'Turn on Run on startup so the script survives a reboot. That is the last thing you do here.',
  },
];

// Mirrors the components schedule.shelly.js creates in ROLES. Keep the two in step.
const RELAY_COMPONENTS = [
  { id: 'boolean:200', name: 'Continuous block', desc: 'One unbroken run, or the cheapest hours wherever they fall.' },
  { id: 'number:200', name: 'Hours needed', desc: 'How long the appliance needs power. Drag it up before a big load.' },
  { id: 'number:201', name: 'Ready by (hour)', desc: 'The deadline the run has to finish by.' },
  { id: 'number:202', name: 'Unavailable from (hour)', desc: 'Start of a window it must never run in.' },
  { id: 'number:203', name: 'Unavailable to (hour)', desc: 'End of that window.' },
  { id: 'text:200', name: 'Running today', desc: 'The hours it picked for today, in your local time.' },
  { id: 'text:201', name: 'Running tomorrow', desc: 'The same for tomorrow, once prices publish.' },
];

const DAY_FLOW = [
  { n: '1', title: 'Prices publish', body: 'Each afternoon the exchange publishes tomorrow’s prices for your zone.' },
  { n: '2', title: 'The device asks us', body: 'The script calls SpotSteer with your current slider values and gets a plan back.' },
  { n: '3', title: 'The plan is frozen', body: 'Your hours are chosen once for the day, so nothing flips on and off as prices wobble.' },
  { n: '4', title: 'The relay follows it', body: 'On inside those hours, off outside them, until you change a slider.' },
];

const TROUBLES = [
  {
    q: 'Virtual components did not appear',
    a: 'Virtual components need firmware 1.4 or newer and a Gen2 or Gen3 device. Update the Shelly, then Stop and Start the script once so it can create them again. If the app still shows nothing, pull to refresh the device page, since the app caches the component list.',
  },
  {
    q: 'The script stops after a reboot',
    a: 'Run on startup was not enabled. Open Scripts, press the pencil next to the script and switch it on, then Start it again.',
  },
  {
    q: 'The relay never switches on',
    a: 'Check that Hours needed and Ready by leave a window that is actually reachable: four hours with a 02:00 deadline and a do-not-run window across the night has nowhere to fit. Also check the Shelly has internet, and open the script console. It prints the hours it picked, or says why it could not.',
  },
  {
    q: 'I want to control two channels',
    a: 'Add the script twice, changing switchId to the second channel in the second copy. Each copy then keeps its own plan.',
  },
  {
    q: 'Can I stop it without deleting anything?',
    a: 'Yes. Stop the script in the Shelly web page, or set Hours needed to zero in the app. The relay stays wherever it was and nothing is removed.',
  },
];

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, h) => ({
  v: h,
  label: `${String(h).padStart(2, '0')}:00`,
}));

const pad = (n: number) => String(n).padStart(2, '0');

type ZoneState =
  | { status: 'locating' }
  | { status: 'ready'; detected: ZoneOption | null }
  | { status: 'failed'; reason: string };

/** Ask the browser for coordinates, then let the backend name the zone covering them. */
function useDetectedZone(): ZoneState {
  const [state, setState] = useState<ZoneState>({ status: 'locating' });

  useEffect(() => {
    const ctl = new AbortController();

    if (!navigator.geolocation) {
      setState({ status: 'failed', reason: 'This browser cannot share a location.' });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const zone = await resolveZone(pos.coords.latitude, pos.coords.longitude, ctl.signal);
          setState({ status: 'ready', detected: zone });
        } catch {
          if (!ctl.signal.aborted) {
            setState({ status: 'failed', reason: 'Could not reach the zone service.' });
          }
        }
      },
      // Denying location is a normal choice, not an error — the dropdown still works.
      () => setState({ status: 'failed', reason: 'Location was not shared.' }),
      { timeout: 10000, maximumAge: 600000 },
    );

    return () => ctl.abort();
  }, []);

  return state;
}

function Question({ n, title, sub, children }: {
  n: number;
  title: string;
  sub: string;
  children: React.ReactNode;
}) {
  return (
    <div className="sb-card sb-sw-q">
      <span className="sb-sw-n">{n}</span>
      <div className="sb-sw-qbody">
        <h3>{title}</h3>
        <p className="sb-sw-qsub">{sub}</p>
        {children}
      </div>
    </div>
  );
}

function HourSelect({ id, label, value, onChange }: {
  id: string;
  label: string;
  value: number;
  onChange: (hour: number) => void;
}) {
  return (
    <div>
      <label className="sb-sw-label" htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        className="sb-sw-input"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      >
        {HOUR_OPTIONS.map((h) => (
          <option key={h.v} value={h.v}>
            {h.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function ShellyWizard() {
  const zoneState = useDetectedZone();
  const [zones, setZones] = useState<ZoneOption[]>([]);
  const [zoneCode, setZoneCode] = useState('');
  const [touchedZone, setTouchedZone] = useState(false);

  const [mode, setMode] = useState<Mode>('relay');
  const [hours, setHours] = useState(3);
  const [deadline, setDeadline] = useState(6);
  const [continuous, setContinuous] = useState(false);
  const [quiet, setQuiet] = useState(false);
  const [quietFrom, setQuietFrom] = useState(8);
  const [quietTo, setQuietTo] = useState(17);
  const [copied, setCopied] = useState(false);
  const [openTrouble, setOpenTrouble] = useState(-1);
  // The Shelly app screenshot is optional artwork; hide its frame rather than show a broken image.
  const [hasPhoneShot, setHasPhoneShot] = useState(true);

  useEffect(() => {
    const ctl = new AbortController();
    fetchZones(ctl.signal)
      .then(setZones)
      .catch(() => undefined);
    return () => ctl.abort();
  }, []);

  // Prefill from the detected zone, but never overwrite a choice the user has already made.
  useEffect(() => {
    if (zoneState.status === 'ready' && zoneState.detected && !touchedZone) {
      setZoneCode(zoneState.detected.code);
    }
  }, [zoneState, touchedZone]);

  const zone = zones.find((z) => z.code === zoneCode);
  const isRelay = mode === 'relay';

  const answers: WizardAnswers = {
    zoneCode,
    hours,
    deadline,
    continuous,
    // Equal values are the script's own "no window" signal, so an unticked box collapses to that.
    unavailFrom: quiet ? quietFrom : 0,
    unavailTo: quiet ? quietTo : 0,
  };

  const generated = useMemo(() => {
    if (!zoneCode) return null;
    try {
      return { code: isRelay ? generateScheduleScript(answers) : generatePriceColorScript(answers) };
      // A template that lost a placeholder is a build problem, not something the user can fix.
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Could not generate the script.' };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRelay, zoneCode, hours, deadline, continuous, quiet, quietFrom, quietTo]);

  const copy = async () => {
    if (!generated || 'error' in generated) return;
    try {
      await navigator.clipboard.writeText(generated.code);
    } catch {
      // Clipboard needs https or localhost; the script is on screen, so selecting it by hand works.
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const pickMode = (key: Mode) => {
    setMode(key);
    setCopied(false);
  };

  const summary =
    `${hours} ${hours === 1 ? 'hour' : 'hours'} of power, finished by ${pad(deadline)}:00` +
    (continuous ? ', in one block' : ', split across the cheapest hours') +
    (quiet ? `, never between ${pad(quietFrom)}:00 and ${pad(quietTo)}:00` : '') +
    '.';

  const chips = isRelay
    ? [zone?.code ?? 'no zone', `${hours}h`, `by ${pad(deadline)}:00`, continuous ? 'one block' : 'split']
    : [zone?.code ?? 'no zone', 'LED ring', 'read-only'];

  return (
    <div className="sb-shell">
      <Nav />

      <div className="sb-sw">
        <section className="sb-sw-hero">
          <a className="sb-ha-back" href="/#devices">
            ← Back to supported systems
          </a>
          <img className="sb-sw-logo" src="/assets/logo-shelly.png" alt="Shelly" />
          <h1 className="sb-sw-h1">Configure your Shelly</h1>
          <p className="sb-sw-lede">
            Answer three questions. We write the script with your settings already inside it, you paste it
            into the device once, and from then on the Shelly runs on its own, cloud or no cloud.
          </p>
          <div className="sb-sw-meta">
            <span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3.5 2" />
              </svg>
              ~3 minutes
            </span>
            <span className="sb-sw-dot">·</span>
            <span>Shelly Gen2 or newer</span>
            <span className="sb-sw-dot">·</span>
            <span>Nothing to install</span>
          </div>
        </section>

        <section id="configure" className="sb-sw-form">
          <Question
            n={1}
            title="What should it do?"
            sub="Two independent scripts. Set up one now and come back for the other whenever you like."
          >
            <div className="sb-sw-options">
              {MODES.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  className="sb-sw-opt"
                  data-on={mode === m.key}
                  onClick={() => pickMode(m.key)}
                >
                  <span className="sb-sw-radio" />
                  <span style={{ display: 'block', minWidth: 0 }}>
                    <span className="sb-sw-opt-title">{m.title}</span>
                    <span className="sb-sw-opt-body">{m.body}</span>
                  </span>
                </button>
              ))}
            </div>
          </Question>

          <Question
            n={2}
            title="Where you are"
            sub="Your country decides which market prices the script follows. We ask your browser and preselect it, so change it if it guessed wrong."
          >
            <div className="sb-sw-zonefield">
              <label className="sb-sw-label" htmlFor="sb-sw-zone">
                Price zone
              </label>
              <select
                id="sb-sw-zone"
                className="sb-sw-input"
                value={zoneCode}
                onChange={(e) => {
                  setTouchedZone(true);
                  setZoneCode(e.target.value);
                }}
              >
                <option value="">Select your country…</option>
                {zones.map((z) => (
                  <option key={z.code} value={z.code}>
                    {z.name}
                  </option>
                ))}
              </select>
              <div className="sb-sw-note">
                {zone ? (
                  <>
                    Zone code <code>{zone.code}</code>, times in {zone.time_zone_id}.
                  </>
                ) : zoneState.status === 'locating' ? (
                  'Checking your location…'
                ) : zoneState.status === 'failed' ? (
                  `${zoneState.reason} Pick your zone above.`
                ) : (
                  'No zone covers your location, pick one above.'
                )}
              </div>
            </div>
          </Question>

          <div key={mode} className="sb-sw-swap">
          {isRelay ? (
            <Question
              n={3}
              title="When it should run"
              sub="Starting values only. Every one of these becomes a slider on the device afterwards, so you never have to come back here to change your mind."
            >
              <div className="sb-sw-fields">
                <div>
                  <label className="sb-sw-label" htmlFor="sb-sw-hours">
                    Hours of power needed
                  </label>
                  <input
                    id="sb-sw-hours"
                    className="sb-sw-input"
                    type="number"
                    min={1}
                    max={24}
                    value={hours}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      setHours(Number.isNaN(v) ? 1 : Math.max(1, Math.min(24, v)));
                    }}
                  />
                </div>
                <HourSelect
                  id="sb-sw-deadline"
                  label="Ready by"
                  value={deadline}
                  onChange={setDeadline}
                />
              </div>

              <div className="sb-sw-options">
                <button
                  type="button"
                  className="sb-sw-opt sb-sw-check"
                  data-on={continuous}
                  onClick={() => setContinuous((v) => !v)}
                >
                  <span className="sb-sw-box">✓</span>
                  <span style={{ display: 'block', minWidth: 0 }}>
                    <span className="sb-sw-opt-title">Run in one unbroken block</span>
                    <span className="sb-sw-opt-body">
                      For a boiler or a washing machine. Leave off for an EV, which can charge in whichever
                      hours are cheapest.
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  className="sb-sw-opt sb-sw-check"
                  data-on={quiet}
                  onClick={() => setQuiet((v) => !v)}
                >
                  <span className="sb-sw-box">✓</span>
                  <span style={{ display: 'block', minWidth: 0 }}>
                    <span className="sb-sw-opt-title">Never run during certain hours</span>
                    <span className="sb-sw-opt-body">A quiet period, or hours the appliance is in use.</span>
                  </span>
                </button>
              </div>

              {quiet && (
                <div className="sb-sw-quiet">
                  <HourSelect
                    id="sb-sw-quiet-from"
                    label="Unavailable from"
                    value={quietFrom}
                    onChange={setQuietFrom}
                  />
                  <HourSelect
                    id="sb-sw-quiet-to"
                    label="Unavailable to"
                    value={quietTo}
                    onChange={setQuietTo}
                  />
                </div>
              )}

              <p className="sb-sw-reads">
                Reads as: <strong>{summary}</strong>
              </p>
            </Question>
          ) : (
            <Question
              n={3}
              title="What the ring will show"
              sub="Nothing to set. The LED ring takes the colour of the current price and switches nothing at all."
            >
              <div className="sb-sw-legend">
                {COLOUR_LEGEND.map((c) => (
                  <div key={c.title}>
                    <span
                      className="sb-sw-swatch"
                      style={{ background: c.color, boxShadow: `0 0 0 4px ${c.glow}` }}
                    />
                    <div className="sb-sw-legend-title">{c.title}</div>
                    <div className="sb-sw-legend-body">{c.body}</div>
                  </div>
                ))}
              </div>
              <p className="sb-sw-note">Only the Plug S Gen3 has the ring.</p>
            </Question>
          )}
          </div>
        </section>

        <section id="script" className="sb-sw-script">
          <div className="sb-sw-script-head">
            <div style={{ marginRight: 'auto' }}>
              <span className="sb-sw-eyebrow">Ready to paste</span>
              <h2 key={mode} className="sb-sw-script-name sb-sw-swap">
                {isRelay ? 'spotsteer-relay.js' : 'spotsteer-colour.js'}
              </h2>
            </div>
            <div key={mode} className="sb-sw-chips sb-sw-swap">
              {chips.map((c) => (
                <span key={c} className="sb-sw-chip">
                  {c}
                </span>
              ))}
            </div>
            <button
              type="button"
              className="sb-btn sb-sw-copy"
              onClick={copy}
              disabled={!generated || 'error' in generated}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="9" y="9" width="12" height="12" rx="2" />
                <path d="M5 15V5a2 2 0 0 1 2-2h10" />
              </svg>
              {copied ? 'Copied' : 'Copy script'}
            </button>
          </div>

          {generated && !('error' in generated) ? (
            <>
              <div key={mode} className="sb-sw-code sb-sw-swap">
                <code>{generated.code}</code>
              </div>
              <p className="sb-sw-script-note">One minified line. Nothing to read, just copy it.</p>
            </>
          ) : (
            <p className="sb-sw-blocked">
              {generated && 'error' in generated
                ? generated.error
                : 'Pick your price zone above and the script appears here.'}
            </p>
          )}

          {isRelay && (
            <p className="sb-sw-script-hint">
              Multi-channel device? Change <code>switchId:0</code> near the top to the channel you want,
              numbered as the Shelly app shows them.
            </p>
          )}
        </section>

        <section id="install" className="sb-sw-section">
          <h2 className="sb-sw-h2">Then put it on the device</h2>
          <p className="sb-sw-sub">Three taps in the Shelly app. You only ever do this once per device.</p>
          <div className="sb-card sb-sw-install">
            <div className="sb-sw-steps">
              {INSTALL_STEPS.map((s) => (
                <div key={s.n} className="sb-sw-step">
                  <span className="sb-sw-step-n">{s.n}</span>
                  <div style={{ minWidth: 0 }}>
                    <div className="sb-sw-step-title">{s.title}</div>
                    <p className="sb-sw-step-body">{s.body}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="sb-sw-shot">
              <div className="sb-sw-frame">
                <img src="/assets/shelly-scripts-tab.png" alt="The Scripts tab in the Shelly app" />
              </div>
              <div className="sb-sw-shot-cap">
                <code>{'{ }'}</code>The Scripts tab, in the app's left rail
              </div>
            </div>
          </div>
        </section>

        <section id="on-device" className="sb-sw-section">
          <div className="sb-sw-device">
            <div className="sb-sw-device-glow" />
            <div className="sb-sw-device-grid">
              <div style={{ minWidth: 0 }}>
                <span className="sb-sw-eyebrow">After the script starts</span>
                <h2>Your settings turn into sliders in the Shelly app</h2>
                <p className="sb-sw-device-lede">
                  The script creates virtual components on the device. Open the Shelly app, go to{' '}
                  <strong>Virtual components → Components</strong>, and everything you answered above is
                  there as a control you can drag. No web page, no account, no coming back here.
                </p>
                <div key={mode} className="sb-sw-swap" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {(isRelay ? RELAY_COMPONENTS : []).map((v) => (
                    <div key={v.id} className="sb-sw-vc">
                      <code>{v.id}</code>
                      <div style={{ minWidth: 0 }}>
                        <div className="sb-sw-vc-name">{v.name}</div>
                        <div className="sb-sw-vc-desc">{v.desc}</div>
                      </div>
                    </div>
                  ))}
                  {!isRelay && (
                    <p className="sb-sw-device-lede" style={{ marginBottom: 0 }}>
                      The colour script creates none. It only reads prices and sets the ring, so there is
                      nothing on the device to adjust.
                    </p>
                  )}
                </div>
              </div>
              {hasPhoneShot && (
                <div style={{ display: 'flex', justifyContent: 'center', minWidth: 0 }}>
                  <div className="sb-sw-phone">
                    <img
                      src="/assets/shelly-virtual-components.png"
                      alt="Shelly app showing the virtual components SpotSteer created"
                      onError={() => setHasPhoneShot(false)}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="sb-sw-section">
          <h2 className="sb-sw-h2" style={{ marginBottom: 18 }}>
            What it does each day
          </h2>
          <div className="sb-sw-flow">
            {DAY_FLOW.map((s) => (
              <div key={s.n} className="sb-card sb-sw-flow-card">
                <div className="sb-sw-flow-n">{s.n}</div>
                <div className="sb-sw-flow-title">{s.title}</div>
                <p className="sb-sw-flow-body">{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="troubleshooting" className="sb-sw-section">
          <h2 className="sb-sw-h2" style={{ marginBottom: 18 }}>
            Troubleshooting
          </h2>
          <div className="sb-sw-faq">
            {TROUBLES.map((t, i) => (
              <div key={t.q} className="sb-card sb-sw-faq-item">
                <button
                  type="button"
                  className="sb-sw-faq-q"
                  onClick={() => setOpenTrouble((o) => (o === i ? -1 : i))}
                  aria-expanded={openTrouble === i}
                >
                  {t.q}
                  <span className="sb-sw-faq-icon" data-open={openTrouble === i}>
                    +
                  </span>
                </button>
                {/* Same grid-rows 0fr->1fr slide as the landing page's FAQ, rather than a hard
                    mount/unmount, see .sb-faq-panel. */}
                <div className="sb-faq-panel" data-open={openTrouble === i}>
                  <div>
                    <p className="sb-sw-faq-a">{t.a}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="sb-sw-section">
          <div className="sb-sw-close">
            <a className="sb-card" href="/">
              <span className="sb-sw-close-kicker">Back to</span>
              <span className="sb-sw-close-title">SpotSteer home →</span>
              <span className="sb-sw-close-body">Prices, savings and the rest of the picture.</span>
            </a>
            <a className="sb-card" href="/home-assistant">
              <span className="sb-sw-close-kicker">Other path</span>
              <span className="sb-sw-close-title">Home Assistant guide →</span>
              <span className="sb-sw-close-body">
                Already running Home Assistant? Drive any device from there instead.
              </span>
            </a>
          </div>
        </section>
      </div>

      <Footer />
    </div>
  );
}
