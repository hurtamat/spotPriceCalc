import { useState } from 'react';
import { Nav } from './Nav';
import { Footer } from './Footer';

// One-click links into the visitor's own Home Assistant. my.home-assistant.io resolves to
// whatever instance they have configured, so these work without knowing their address.
const HACS_URL =
  'https://my.home-assistant.io/redirect/hacs_repository/?owner=hurtamat&repository=spotprice-ha&category=integration';
const CONFIG_URL = 'https://my.home-assistant.io/redirect/config_flow_start/?domain=spotsteer';
const BLUEPRINT_URL =
  'https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=' +
  encodeURIComponent(
    'https://github.com/hurtamat/spotprice-ha/blob/main/blueprints/automation/spotsteer/cheap_hours_switch.yaml',
  );

const RUN_ENTITY = 'binary_sensor.spotsteer_running';

const PREREQS = [
  { title: 'A running Home Assistant', note: 'Version 2024.4 or newer.' },
  { title: 'HACS installed', note: 'For the one-click install route.' },
  { title: 'A smart plug or switch', note: 'The device you want controlled.' },
];

// Mirrors the config flow in custom_components/spotsteer/config_flow.py. Keep in step.
const CONFIG_FIELDS = [
  {
    label: 'Latitude and longitude',
    note: 'Already filled in from your Home Assistant location. They decide which price zone you get, so leave them alone unless you are setting up for another address.',
    required: true,
  },
  {
    label: 'Controlled switch',
    note: 'The device to run in the cheap hours. Pick it and setup is finished: SpotSteer switches it on and off from then on, with no automation to write.',
    required: false,
  },
];

const READ_ENTITIES = [
  { name: 'Running', desc: 'On during the cheap hours it picked.', id: RUN_ENTITY },
  { name: 'Status', desc: 'What it is currently doing.', id: 'sensor.spotsteer_status' },
  {
    name: 'Current price',
    desc: 'The spot price right now in EUR per MWh.',
    id: 'sensor.spotsteer_current_price',
  },
  {
    name: 'Price level',
    desc: 'Cheap, average or expensive for this hour.',
    id: 'sensor.spotsteer_price_level',
  },
];

const SET_ENTITIES = [
  { name: 'Duration', desc: 'How many hours of power the device needs.' },
  { name: 'Ready by', desc: 'The deadline it must finish by.' },
  { name: 'Continuous block', desc: 'One unbroken run, or split for the cheapest hours.' },
  { name: 'Unavailable from / to', desc: 'A do-not-run window.' },
  { name: 'Enabled', desc: 'Master off switch.' },
];

const TROUBLES = [
  {
    q: 'The device never switches on',
    a: 'Check Enabled is on, then check that Duration and Ready by leave a window that is actually reachable. A four hour duration with a 02:00 deadline and a do-not-run window across the night has nowhere to fit. Also confirm a plan exists on the status entity: if it says waiting for plan, there is nothing to run against yet.',
  },
  {
    q: 'Status says "backend unavailable"',
    a: 'Home Assistant cannot reach our API. Verify the Backend URL has no trailing slash, then check outbound network access from the Home Assistant host. The integration retries on its own, so the plan reappears once the connection is back without a restart.',
  },
  {
    q: 'The price shows but there is no level',
    a: 'The level needs a full day of prices to compare against, so right after setup or in the gap before the next publication it stays unknown until the curve arrives. If it is still empty the next day, reload the integration from Settings, Devices and services.',
  },
  {
    q: 'I want to control a second appliance',
    a: 'Add the integration a second time. Each entry gets its own entities, its own duration and its own deadline, so your boiler and your EV charger can each have their own plan and their own controlled switch.',
  },
  {
    q: 'The device switches at the wrong time',
    a: 'Check the latitude and longitude in the integration options, since those decide which bidding zone your prices come from. The plan itself is computed and delivered in UTC, so a wrong zone, not a wrong clock, is the usual cause.',
  },
];

function PlusIcon({ open }: { open: boolean }) {
  return (
    <span className="sb-ha-plus" data-open={open}>
      +
    </span>
  );
}

export function HomeAssistantPage() {
  const [manualOpen, setManualOpen] = useState(false);
  const [refOpen, setRefOpen] = useState(false);
  const [openTrouble, setOpenTrouble] = useState(-1);
  const [copied, setCopied] = useState(false);

  const copyEntity = async () => {
    try {
      await navigator.clipboard.writeText(RUN_ENTITY);
    } catch {
      // Clipboard is unavailable over plain http and in some embedded browsers; the entity id
      // is visible next to the button, so selecting it by hand still works.
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="sb-shell">
      <Nav />

      <section className="sb-section sb-ha-head">
        <a className="sb-ha-back" href="/#devices">
          ← Back to supported systems
        </a>
        <div className="sb-ha-title-row">
          {/* The logo artwork already reads "Home Assistant", so there is no heading beside it. */}
          <img src="/assets/logo-homeassistant.png" alt="Home Assistant" height={40} />
          <span className="sb-ha-pill">
            <span className="sb-ha-dot" />
            Setup guide
          </span>
        </div>
        <p className="sb-ha-lede">
          SpotSteer works out your cheapest hours and switches your device on and off for you.
        </p>
        <div className="sb-ha-meta">
          <span>~5 minutes</span>
          <span className="sb-ha-sep">·</span>
          <span>Requires HACS</span>
          <span className="sb-ha-sep">·</span>
          <span>Home Assistant 2024.4+</span>
        </div>
      </section>

      <section className="sb-section sb-ha-tight">
        <div className="sb-card sb-ha-prereq">
          <h2>Before you start</h2>
          <div className="sb-ha-prereq-grid">
            {PREREQS.map((p) => (
              <div key={p.title} className="sb-ha-prereq-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3" y="3" width="18" height="18" rx="5" />
                  <path d="M8.5 12.5 11 15l4.5-5" />
                </svg>
                <div>
                  <div className="sb-ha-prereq-title">{p.title}</div>
                  <div className="sb-ha-prereq-note">{p.note}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="sb-section sb-ha-tight">
        <h2 className="sb-ha-h2">Setup is two steps</h2>
        <p className="sb-ha-sub">
          Install, then configure. Both buttons open your own Home Assistant with everything
          pre-filled.
        </p>

        <div className="sb-card sb-ha-step">
          <span className="sb-ha-step-n">1</span>
          <div className="sb-ha-step-body">
            <h3>Install</h3>
            <p>
              The button opens HACS in your Home Assistant with the SpotSteer repository already
              filled in. Press <strong>Download</strong>, then restart Home Assistant.
            </p>
            <div className="sb-ha-actions">
              <a className="sb-btn sb-primary sb-ha-cta" href={HACS_URL} target="_blank" rel="noopener noreferrer">
                Open in HACS
              </a>
              <button type="button" className="sb-ha-textbtn" onClick={() => setManualOpen((o) => !o)}>
                {manualOpen ? 'Hide manual install' : 'Install manually instead'}
              </button>
            </div>
            {manualOpen && (
              <div className="sb-ha-manual">
                <div className="sb-ha-manual-title">Manual install, without HACS</div>
                <ol>
                  <li>Download the latest release archive from our repository.</li>
                  <li>
                    Copy the <code>spotsteer</code> folder into <code>config/custom_components</code>.
                  </li>
                  <li>
                    Check the result is <code>custom_components/spotsteer/</code>, then restart Home
                    Assistant.
                  </li>
                </ol>
              </div>
            )}
          </div>
        </div>

        <div className="sb-card sb-ha-step">
          <span className="sb-ha-step-n">2</span>
          <div className="sb-ha-step-body">
            <h3>Configure</h3>
            <p>
              The button opens the SpotSteer dialog inside Home Assistant. Fill it in and press
              Submit.
            </p>
            <div className="sb-ha-actions">
              <a className="sb-btn sb-primary sb-ha-cta" href={CONFIG_URL} target="_blank" rel="noopener noreferrer">
                Add the integration
              </a>
            </div>
            <div className="sb-ha-fields">
              {CONFIG_FIELDS.map((f) => (
                <div key={f.label} className="sb-ha-field">
                  <div className="sb-ha-field-head">
                    <span className="sb-ha-field-label">{f.label}</span>
                    {!f.required && <span className="sb-ha-optional">optional</span>}
                  </div>
                  <p className="sb-ha-field-note">{f.note}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="sb-section sb-ha-tight">
        <div className="sb-ha-done">
          <div className="sb-ha-done-glow" aria-hidden="true" />
          <div className="sb-ha-done-inner">
            <div className="sb-ha-done-head">
              <span className="sb-ha-done-check">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </span>
              <h2>That&rsquo;s it</h2>
            </div>
            <p>
              Your device now runs in the cheapest hours of the day, automatically. In Home Assistant
              you get a SpotSteer device showing whether it is running right now, the current price
              and whether this hour counts as cheap, average or expensive, alongside the settings you
              can change at any time.
            </p>
          </div>
        </div>
      </section>

      <section className="sb-section sb-ha-tight">
        <div className="sb-ha-more">
          <div className="sb-ha-more-head">
            <h2>Want more control?</h2>
            <span>Optional, only if you want to drive other devices yourself</span>
          </div>
          <p className="sb-ha-more-lede">
            Setup above is already complete. These two routes exist if you would rather orchestrate
            things in your own automations instead of letting us switch the device directly.
          </p>
          <div className="sb-ha-more-grid">
            <div className="sb-card sb-ha-more-card">
              <div className="sb-ha-more-title">Import our blueprint</div>
              <p>One button, then pick your entities from dropdowns. No YAML.</p>
              <a className="sb-btn sb-ha-ghost" href={BLUEPRINT_URL} target="_blank" rel="noopener noreferrer">
                Import blueprint
              </a>
            </div>
            <div className="sb-card sb-ha-more-card">
              <div className="sb-ha-more-title">Write your own automation</div>
              <p>Trigger on this entity turning on and off, and act on whatever you like.</p>
              <div className="sb-ha-copyrow">
                <code>{RUN_ENTITY}</code>
                <button type="button" className="sb-btn sb-primary sb-ha-copybtn" onClick={copyEntity}>
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="sb-section sb-ha-tight">
        <button type="button" className="sb-ha-disclosure" onClick={() => setRefOpen((o) => !o)}>
          Entity reference
          <PlusIcon open={refOpen} />
        </button>
        <div className="sb-ha-panel" data-open={refOpen}>
          <div>
            <div className="sb-ha-ref-grid">
              <div className="sb-card sb-ha-ref">
                <div className="sb-ha-ref-tag">What SpotSteer tells you</div>
                {READ_ENTITIES.map((e) => (
                  <div key={e.id} className="sb-ha-ref-row">
                    <div className="sb-ha-ref-name">{e.name}</div>
                    <div className="sb-ha-ref-desc">{e.desc}</div>
                    <code>{e.id}</code>
                  </div>
                ))}
              </div>
              <div className="sb-card sb-ha-ref">
                <div className="sb-ha-ref-tag sb-ha-ref-tag-muted">What you tell SpotSteer</div>
                <p className="sb-ha-ref-lede">All editable in the Home Assistant UI.</p>
                {SET_ENTITIES.map((e) => (
                  <div key={e.name} className="sb-ha-ref-row">
                    <div className="sb-ha-ref-name">{e.name}</div>
                    <div className="sb-ha-ref-desc">{e.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="troubleshooting" className="sb-section sb-ha-tight">
        <h2 className="sb-ha-h2">Troubleshooting</h2>
        <div className="sb-ha-troubles">
          {TROUBLES.map((t, i) => (
            <div key={t.q} className="sb-card sb-ha-trouble">
              <button
                type="button"
                onClick={() => setOpenTrouble((cur) => (cur === i ? -1 : i))}
                aria-expanded={openTrouble === i}
              >
                {t.q}
                <PlusIcon open={openTrouble === i} />
              </button>
              <div className="sb-ha-panel" data-open={openTrouble === i}>
                <div>
                  <p className="sb-ha-trouble-a">{t.a}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
      <Footer />
    </div>
  );
}
