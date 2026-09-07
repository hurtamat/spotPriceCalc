import { useEffect, useMemo, useState } from 'react';
import { Nav } from './Nav';
import { Footer } from './Footer';
import { fetchZones, resolveZone, type ZoneOption } from '../api/zones';
import {
  generatePriceColorScript,
  generateScheduleScript,
  type WizardAnswers,
} from '../shelly/generate';

type ScriptKey = 'schedule' | 'color';

// The two scripts are independent and need very different amounts of setup — the colour one needs
// nothing but a zone — so which one you want is the first question, not the last.
const SCRIPTS: { key: ScriptKey; label: string; blurb: string }[] = [
  {
    key: 'schedule',
    label: 'Cheap-hours relay',
    blurb:
      'Switches the plug on during the cheapest hours of the day. This is what SpotBuddy is for; pick this one unless you only want the light.',
  },
  {
    key: 'color',
    label: 'Price colour',
    blurb:
      'Colours the LED ring green, amber or red for the current price, and switches nothing. Plug S Gen3 only.',
  },
];

/** `<input type="time">` speaks "HH:MM"; the script wants a whole hour number. */
const toTimeValue = (hour: number) => `${String(hour).padStart(2, '0')}:00`;
const fromTimeValue = (value: string) => {
  const hour = Number(value.slice(0, 2));
  return Number.isFinite(hour) ? hour : 0;
};

// step=3600 makes the picker step in whole hours. Prices are quarter-hourly, but a deadline finer than
// an hour buys nothing and the device only stores one number.
function HourField({
  id,
  label,
  hour,
  onChange,
}: {
  id: string;
  label: string;
  hour: number;
  onChange: (hour: number) => void;
}) {
  return (
    <div>
      <label className="sb-field-label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className="sb-wz-input"
        type="time"
        step={3600}
        value={toTimeValue(hour)}
        onChange={(e) => onChange(fromTimeValue(e.target.value))}
      />
    </div>
  );
}

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

function Step({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="sb-card sb-wz-step">
      <span className="sb-ha-step-n">{n}</span>
      <div className="sb-ha-step-body">
        <h3>{title}</h3>
        {children}
      </div>
    </div>
  );
}

export function ShellyWizard() {
  const zoneState = useDetectedZone();
  const [zones, setZones] = useState<ZoneOption[]>([]);
  const [zoneCode, setZoneCode] = useState('');
  const [touchedZone, setTouchedZone] = useState(false);

  const [script, setScript] = useState<ScriptKey>('schedule');
  const [hours, setHours] = useState(3);
  const [deadline, setDeadline] = useState(6);
  const [continuous, setContinuous] = useState(false);
  const [useUnavailable, setUseUnavailable] = useState(false);
  const [unavailFrom, setUnavailFrom] = useState(7);
  const [unavailTo, setUnavailTo] = useState(9);
  const [copied, setCopied] = useState(false);

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

  // The zone's own name, for labelling the hours — they are its local time, not the browser's.
  const zoneName = zones.find((z) => z.code === zoneCode)?.name;
  const isRelay = script === 'schedule';

  const answers: WizardAnswers = {
    zoneCode,
    hours,
    deadline,
    continuous,
    // Equal values are the script's own "no window" signal, so an unticked box collapses to that.
    unavailFrom: useUnavailable ? unavailFrom : 0,
    unavailTo: useUnavailable ? unavailTo : 0,
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
  }, [isRelay, zoneCode, hours, deadline, continuous, useUnavailable, unavailFrom, unavailTo]);

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

  const pickScript = (key: ScriptKey) => {
    setScript(key);
    setCopied(false);
  };

  // Numbered as rendered: the job settings step only exists for the relay script.
  const pasteStep = isRelay ? 4 : 3;

  return (
    <div className="sb-shell">
      <Nav />

      <section className="sb-section sb-wz-head">
        <a className="sb-ha-back" href="/#devices">
          ← Back to supported systems
        </a>
        <h1 className="sb-wz-title">Configure your Shelly</h1>
        <p className="sb-ha-lede">
          Answer a few questions and we generate a script with your settings already in it. Paste it into
          the device once; it does the rest on its own.
        </p>
        <div className="sb-ha-meta">
          <span>~3 minutes</span>
          <span className="sb-ha-sep">·</span>
          <span>Shelly Gen2 or newer</span>
          <span className="sb-ha-sep">·</span>
          <span>No account needed</span>
        </div>
      </section>

      <section className="sb-section sb-ha-tight">
        <Step n={1} title="What should it do?">
          <p>Two independent scripts. You can come back and set up the other one afterwards.</p>
          <div className="sb-day-tabs sb-wz-tabs">
            {SCRIPTS.map((s) => (
              <button
                key={s.key}
                type="button"
                className="sb-day-tab"
                data-active={script === s.key}
                onClick={() => pickScript(s.key)}
              >
                {s.label}
              </button>
            ))}
          </div>
          <div className="sb-wz-hint">{SCRIPTS.find((s) => s.key === script)!.blurb}</div>
        </Step>

        <Step n={2} title="Where you are">
          <p>
            Your location decides which country's prices we use. We ask your browser and pick the zone for
            you — change it below if it guessed wrong.
          </p>

          <label className="sb-field-label" htmlFor="sb-wz-zone">
            Price zone
          </label>
          <select
            id="sb-wz-zone"
            className="sb-wz-input"
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

          <div className="sb-wz-hint">
            {zoneState.status === 'locating' && 'Checking your location…'}
            {zoneState.status === 'ready' &&
              zoneState.detected &&
              `Detected ${zoneState.detected.name} from your location.`}
            {zoneState.status === 'ready' &&
              !zoneState.detected &&
              'No zone covers your location — pick one above.'}
            {zoneState.status === 'failed' && `${zoneState.reason} Pick your zone above.`}
          </div>
        </Step>

        {isRelay && (
          <Step n={3} title="When it should run">
            <p>
              Starting values only. Every one of them stays adjustable on the device afterwards, so you
              never have to come back here to change your mind.
            </p>

            <div className="sb-wz-grid">
              <div>
                <label className="sb-field-label" htmlFor="sb-wz-hours">
                  Hours of power needed
                </label>
                <input
                  id="sb-wz-hours"
                  className="sb-wz-input"
                  type="number"
                  min={1}
                  max={24}
                  value={hours}
                  onChange={(e) => setHours(Number(e.target.value))}
                />
              </div>

              <HourField id="sb-wz-deadline" label="Ready by" hour={deadline} onChange={setDeadline} />
            </div>

            <div className="sb-wz-hint">
              Times are local time in {zoneName ?? 'your price zone'}. The device sends them as written and
              we do the converting, so they stay right when the clocks change.
            </div>

            <label className="sb-wz-check">
              <input
                type="checkbox"
                checked={continuous}
                onChange={(e) => setContinuous(e.target.checked)}
              />
              <span>
                <strong>Run in one unbroken block</strong>
                <br />
                For a boiler or a washing machine. Leave off for an EV, which can charge in whichever hours
                are cheapest.
              </span>
            </label>

            <label className="sb-wz-check">
              <input
                type="checkbox"
                checked={useUnavailable}
                onChange={(e) => setUseUnavailable(e.target.checked)}
              />
              <span>
                <strong>Never run during certain hours</strong>
                <br />
                A quiet period, or hours the appliance is in use.
              </span>
            </label>

            {useUnavailable && (
              <div className="sb-wz-grid">
                <HourField
                  id="sb-wz-unav-from"
                  label="Do not run from"
                  hour={unavailFrom}
                  onChange={setUnavailFrom}
                />
                <HourField id="sb-wz-unav-to" label="until" hour={unavailTo} onChange={setUnavailTo} />
              </div>
            )}
          </Step>
        )}

        <Step n={pasteStep} title="Paste it into the device">
          <ol className="sb-wz-steps">
            <li>
              Open the Shelly's web page and go to <strong>Scripts</strong>.
            </li>
            <li>
              Press <strong>Add script</strong>, then paste over anything already in the editor.
            </li>
            <li>
              <strong>Save</strong>, then <strong>Start</strong>, and turn on{' '}
              <strong>Run on startup</strong> so it survives a reboot.
            </li>
          </ol>
          {isRelay && (
            <p className="sb-wz-hint">
              Multi-channel device? Change <code>switchId: 0</code> near the top of the script to the
              channel you want, numbered as the Shelly app shows them.
            </p>
          )}
        </Step>

        {!zoneCode && (
          <p className="sb-wz-hint sb-wz-blocked">Pick your price zone to generate the script.</p>
        )}

        {generated && 'error' in generated && (
          <div className="sb-card sb-wz-out sb-wz-error">
            <strong>The script could not be generated.</strong>
            <p>{generated.error}</p>
          </div>
        )}

        {generated && !('error' in generated) && (
          <div className="sb-card sb-wz-out">
            <div className="sb-wz-out-head">
              <div className="sb-wz-out-note">
                {SCRIPTS.find((s) => s.key === script)!.label}, ready to paste.
              </div>
              <button type="button" className="sb-btn sb-primary" onClick={copy}>
                {copied ? 'Copied' : 'Copy script'}
              </button>
            </div>
            <pre className="sb-wz-code">
              <code>{generated.code}</code>
            </pre>
          </div>
        )}
      </section>

      <Footer />
    </div>
  );
}
