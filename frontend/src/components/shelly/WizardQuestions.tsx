import type { ReactNode } from 'react';
import type { ZonePicker } from '../../hooks/useZonePicker';
import { pad2 } from '../../lib/format';
import { Check } from '../icons';
import { ZoneSelect } from '../ZoneSelect';
import type { Mode, WizardForm } from './form';

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
  { title: 'Cheap', body: 'Bottom third of today’s prices.', color: '#22c55e', glow: 'rgba(34,197,94,.22)' },
  { title: 'Average', body: 'Middle of the day’s range.', color: '#f59e0b', glow: 'rgba(245,158,11,.22)' },
  { title: 'Expensive', body: 'Top third, wait if you can.', color: '#ef4444', glow: 'rgba(239,68,68,.22)' },
];

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, h) => ({ v: h, label: `${pad2(h)}:00` }));

function Question({ n, title, sub, children }: {
  n: number;
  title: string;
  sub: string;
  children: ReactNode;
}) {
  return (
    <div className="sb-card sb-sw-q">
      <span className="sb-guide-n">{n}</span>
      <div className="sb-sw-qbody">
        <h3 className="sb-h4">{title}</h3>
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
      <label className="sb-field-label" htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        className="sb-field-input"
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

type Props = {
  mode: Mode;
  onMode: (mode: Mode) => void;
  picker: ZonePicker;
  form: WizardForm;
  update: (patch: Partial<WizardForm>) => void;
};

export function WizardQuestions({ mode, onMode, picker, form, update }: Props) {
  const { hours, deadline, continuous, quiet, quietFrom, quietTo } = form;

  const summary =
    `${hours} ${hours === 1 ? 'hour' : 'hours'} of power, finished by ${pad2(deadline)}:00` +
    (continuous ? ', in one block' : ', split across the cheapest hours') +
    (quiet ? `, never between ${pad2(quietFrom)}:00 and ${pad2(quietTo)}:00` : '') +
    '.';

  return (
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
              onClick={() => onMode(m.key)}
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
        <ZoneSelect
          id="sb-sw-zone"
          picker={picker}
          className="sb-sw-zonefield"
          describe={(z) => (
            <>
              Zone code <code>{z.code}</code>, times in {z.time_zone_id}.
            </>
          )}
        />
      </Question>

      <div key={mode} className="sb-sw-swap">
        {mode === 'relay' ? (
          <Question
            n={3}
            title="When it should run"
            sub="Starting values only. Every one of these becomes a slider on the device afterwards, so you never have to come back here to change your mind."
          >
            <div className="sb-sw-fields">
              <div>
                <label className="sb-field-label" htmlFor="sb-sw-hours">
                  Hours of power needed
                </label>
                <input
                  id="sb-sw-hours"
                  className="sb-field-input"
                  type="number"
                  min={1}
                  max={24}
                  value={hours}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    update({ hours: Number.isNaN(v) ? 1 : Math.max(1, Math.min(24, v)) });
                  }}
                />
              </div>
              <HourSelect
                id="sb-sw-deadline"
                label="Ready by"
                value={deadline}
                onChange={(v) => update({ deadline: v })}
              />
            </div>

            <div className="sb-sw-options">
              <button
                type="button"
                className="sb-sw-opt sb-sw-check"
                data-on={continuous}
                onClick={() => update({ continuous: !continuous })}
              >
                <span className="sb-sw-box">
                  <Check size={13} strokeWidth={2.6} />
                </span>
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
                onClick={() => update({ quiet: !quiet })}
              >
                <span className="sb-sw-box">
                  <Check size={13} strokeWidth={2.6} />
                </span>
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
                  onChange={(v) => update({ quietFrom: v })}
                />
                <HourSelect
                  id="sb-sw-quiet-to"
                  label="Unavailable to"
                  value={quietTo}
                  onChange={(v) => update({ quietTo: v })}
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
            <p className="sb-field-note">Only the Plug S Gen3 has the ring.</p>
          </Question>
        )}
      </div>
    </section>
  );
}
