import { useEffect, useRef, useState } from 'react';
import { Nav } from './Nav';
import { Footer } from './Footer';
import { ArrowLeft, ArrowRight, Check } from './icons';
import { DayFlow } from './DayFlow';
import { GuideMeta } from './GuideMeta';

// One-click links into the visitor's own Home Assistant. my.home-assistant.io resolves to
// whatever instance they have configured, so these work without knowing their address.
const REPO_URL = 'https://github.com/hurtamat/spotprice-ha';
const HACS_URL =
  'https://my.home-assistant.io/redirect/hacs_repository/?owner=hurtamat&repository=spotprice-ha&category=integration';
const CONFIG_URL = 'https://my.home-assistant.io/redirect/config_flow_start/?domain=spotsteer';
const BLUEPRINT_URL =
  'https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=' +
  encodeURIComponent(
    `${REPO_URL}/blob/main/blueprints/automation/spotsteer/cheap_hours_switch.yaml`,
  );

const RUN_ENTITY = 'binary_sensor.spotsteer_running';

// Matches the drawer's transition in the stylesheet. Swapping drawers waits this
// long so the open one finishes rolling up before the other rolls down.
const DRAWER_MS = 280;

const META = ['~5 minutes', 'Home Assistant 2024.11+', 'Installed through HACS'];

const CONTROLS = [
  {
    name: 'Enabled',
    desc: 'Pause SpotSteer without removing it. Your device goes back to being ordinary.',
  },
  {
    name: 'Refresh plan',
    desc: 'Fetch the newest prices and pick the hours again, right now.',
  },
];

const SETTINGS = [
  {
    name: 'Continuous block',
    desc: 'Run in one go, or in whichever hours are cheapest.',
  },
  { name: 'Duration', desc: 'How many hours the device needs.' },
  { name: 'Ready by', desc: 'When it has to be finished.' },
  {
    name: 'Unavailable from',
    desc: 'The start of a stretch it must never run in.',
  },
  { name: 'Unavailable to', desc: 'The end of that stretch.' },
  {
    name: 'Use unavailable window',
    desc: 'Switch that quiet stretch on and off without losing the times.',
  },
];

const REPORTS = [
  { name: 'Current price', desc: 'What power costs at this moment.' },
  { name: 'Next end', desc: 'When the cheap stretch ends.' },
  { name: 'Next start', desc: 'When the next cheap stretch begins.' },
  { name: 'Price level', desc: 'Cheap, average or expensive today.' },
  { name: 'Running', desc: 'Whether the device is switched on right now.' },
];

const CARD_STEPS = [
  {
    n: 'Step 1',
    title: 'Choose your dashboard',
    body: 'Any will do. Most people use the one they look at every morning.',
  },
  {
    n: 'Step 2',
    title: 'Edit it',
    body: 'Press the pencil at the top right, then the plus inside a section.',
  },
  {
    n: 'Step 3',
    title: 'Search for SpotSteer',
    body: 'Type SpotSteer in the card search, pick it and save.',
  },
];

const TROUBLES = [
  {
    q: 'Setup says it cannot reach SpotSteer',
    a: 'Almost always means Home Assistant cannot get online. Check that, then try again.',
  },
  {
    q: 'The card says it has no prices yet',
    a: 'Press Refresh plan on the SpotSteer device. If it stays empty, tomorrow’s prices have not been published yet. They arrive in the early afternoon and it fills in by itself.',
  },
  {
    q: 'Nothing switches on',
    a: 'Check Enabled is on, and that Controlled switch still points at a device that exists. If both are fine, your settings may not fit together: four hours needed, finished by 02:00, and quiet hours across the whole night leave nowhere to run.',
  },
  {
    q: 'The prices look like somebody else’s',
    a: 'That is the zone, not the clock. Open SpotSteer in Home Assistant, press Configure, and check the electricity zone. Times themselves are always shown in yours.',
  },
];

function PlusIcon({ open }: { open: boolean }) {
  return (
    <span className="sb-ha-plus" data-open={open}>
      +
    </span>
  );
}

// The official my.home-assistant.io badges, so the affordance is the one people already
// know from integration READMEs. Sized here because the remote SVG has no intrinsic box.
function MyHaBadge({ href, src, alt }: { href: string; src: string; alt: string }) {
  return (
    <a className="sb-ha-badge" href={href} target="_blank" rel="noopener noreferrer">
      <img src={src} alt={alt} loading="lazy" />
    </a>
  );
}

function Panel({
  title,
  rows,
  img,
  alt,
  flip,
}: {
  title: string;
  rows: { name: string; desc: string }[];
  img: string;
  alt: string;
  flip?: boolean;
}) {
  return (
    <div className={flip ? 'sb-ha-pair sb-ha-pair-flip' : 'sb-ha-pair'}>
      <h3 className="sb-ha-pair-title">{title}</h3>
      <figure className="sb-ha-shot">
        <div className="sb-ha-frame">
          <img src={img} alt={alt} />
        </div>
      </figure>
      <div className="sb-ha-pair-text">
        {rows.map((r) => (
          <div key={r.name} className="sb-ha-ref-row">
            <div className="sb-ha-ref-name">{r.name}</div>
            <div className="sb-ha-ref-desc">{r.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function HomeAssistantPage() {
  // One drawer open at a time under the two step cards; null means neither.
  const [panel, setPanel] = useState<'manual' | 'more' | null>(null);
  const swapTimer = useRef<number | undefined>(undefined);
  const [openTrouble, setOpenTrouble] = useState(-1);
  const [copied, setCopied] = useState(false);

  useEffect(() => () => window.clearTimeout(swapTimer.current), []);

  const togglePanel = (which: 'manual' | 'more') => {
    window.clearTimeout(swapTimer.current);
    if (panel === which) return setPanel(null);
    if (panel === null) return setPanel(which);
    // Both would otherwise animate at once and the section would jump.
    setPanel(null);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    swapTimer.current = window.setTimeout(() => setPanel(which), reduced ? 0 : DRAWER_MS);
  };

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

      <section className="sb-section sb-ha-hero">
        <a className="sb-ha-back" href="/#devices">
          <ArrowLeft size={14} />
          Back to supported systems
        </a>
        <div className="sb-ha-title-row">
          <img src="/assets/logo-homeassistant.png" alt="Home Assistant" height={34} />
          <span className="sb-ha-pill">Setup guide</span>
        </div>
        <h1 className="sb-ha-h1">Configure your Home Assistant</h1>
        <p className="sb-ha-lede">
          SpotSteer watches tomorrow&rsquo;s electricity prices and switches your boiler, car
          charger or washing machine on when power is cheap.
        </p>
        <GuideMeta items={META} />
      </section>

      <section className="sb-section sb-ha-tight sb-ha-steps-sec">
        <h2 className="sb-ha-h2">Two steps</h2>
        <p className="sb-ha-sub">Both buttons open your own Home Assistant.</p>

        <div className="sb-ha-rail">
          <div className="sb-card sb-ha-step">
            <div className="sb-ha-step-head">
              <span className="sb-ha-step-n">1</span>
              <h3>Install</h3>
            </div>
            <p>
              The button opens HACS with SpotSteer already filled in. Press{' '}
              <strong>Download</strong>, then restart Home Assistant.
            </p>
            <div className="sb-ha-actions">
              <MyHaBadge
                href={HACS_URL}
                src="https://my.home-assistant.io/badges/hacs_repository.svg"
                alt="Open SpotSteer in the Home Assistant Community Store"
              />
            </div>
            <button
              type="button"
              className="sb-ha-textbtn sb-ha-step-foot"
              onClick={() => togglePanel('manual')}
              aria-expanded={panel === 'manual'}
            >
              Install manually instead
              <PlusIcon open={panel === 'manual'} />
            </button>
          </div>
          <div className="sb-ha-drawer" data-open={panel === 'manual'}>
            <div>
              <div className="sb-ha-drawer-inner">
                <div className="sb-ha-drawer-title">Install manually, without HACS</div>
                <ol className="sb-ha-manual">
                  <li>
                    Download the latest version from{' '}
                    <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
                      our GitHub page
                    </a>
                    .
                  </li>
                  <li>
                    Put the <code>spotsteer</code> folder into <code>config/custom_components</code>
                    .
                  </li>
                  <li>Restart Home Assistant.</li>
                </ol>
              </div>
            </div>
          </div>

          <div className="sb-card sb-ha-step">
            <div className="sb-ha-step-head">
              <span className="sb-ha-step-n">2</span>
              <h3>Configure</h3>
            </div>
            <p>
              Pick the country you are in and the device you want switched, then press Submit. That
              is the whole setup.
            </p>
            <div className="sb-ha-actions">
              <MyHaBadge
                href={CONFIG_URL}
                src="https://my.home-assistant.io/badges/config_flow_start.svg"
                alt="Start setting up the SpotSteer integration"
              />
            </div>
            <button
              type="button"
              className="sb-ha-textbtn sb-ha-step-foot"
              onClick={() => togglePanel('more')}
              aria-expanded={panel === 'more'}
            >
              Or drive it yourself
              <PlusIcon open={panel === 'more'} />
            </button>
          </div>
          <div className="sb-ha-drawer sb-ha-drawer-b" data-open={panel === 'more'}>
            <div>
              <div className="sb-ha-drawer-inner">
                <div className="sb-ha-drawer-title">Drive it from your own automations</div>
                <div className="sb-ha-more-grid">
                  <div className="sb-ha-more-card">
                    <div className="sb-ha-more-title">Import our blueprint</div>
                    <p>One button, then pick your device from a dropdown.</p>
                    <a
                      className="sb-btn sb-ha-ghost"
                      href={BLUEPRINT_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Import blueprint
                    </a>
                  </div>
                  <div className="sb-ha-more-card">
                    <div className="sb-ha-more-title">Use it as a planner only</div>
                    <p>
                      Leave the device empty in step 2 and SpotSteer only tells you the cheap hours.
                      This is the switch it publishes, on while they last. Trigger your own
                      automation on it.
                    </p>
                    <div className="sb-ha-copyrow">
                      <code>{RUN_ENTITY}</code>
                      <button
                        type="button"
                        className="sb-btn sb-primary sb-ha-copybtn"
                        onClick={copyEntity}
                      >
                        {copied ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
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
                <Check size={18} strokeWidth={2.6} />
              </span>
              <h2>That&rsquo;s it</h2>
            </div>
            <p>
              If you picked a device in step 2, you are finished. SpotSteer turns it on when the
              cheap hours start and off when they end. Flip it by hand any time and it stays that
              way until the next quarter hour.
            </p>
          </div>
        </div>
      </section>

      <section className="sb-section sb-ha-tight">
        <h2 className="sb-ha-h2">What it looks like in Home Assistant</h2>
        <p className="sb-ha-sub">
          Three panels appear on your SpotSteer device page. One switch, one set of settings, and
          one that simply tells you what is going on.
        </p>

        <Panel
          title="The on switch"
          rows={CONTROLS}
          img="/assets/ha-controls.png"
          alt="A Home Assistant panel with an Enabled toggle and a Refresh plan button"
        />

        <Panel
          title="What you can change any time"
          rows={SETTINGS}
          img="/assets/ha-configuration.png"
          alt="A Home Assistant panel of sliders and time pickers for duration, deadline and quiet hours"
          flip
        />

        <Panel
          title="What SpotSteer reports back"
          rows={REPORTS}
          img="/assets/ha-sensors.png"
          alt="A Home Assistant panel listing the current price, price level and when the device next runs"
        />
      </section>

      <section id="card" className="sb-section sb-ha-tight">
        <div className="sb-card sb-ha-cardsec">
          <h2 className="sb-ha-h2">Put the price chart on a dashboard</h2>
          <p className="sb-ha-sub">
            SpotSteer comes with a chart of the whole day, and it is the easiest way to see what
            your device is about to do. Three steps to put it on screen.
          </p>
          <div className="sb-ha-cardsteps">
            {CARD_STEPS.map((c) => (
              <div key={c.n} className="sb-ha-cardstep">
                <div className="sb-ha-cardstep-n">{c.n}</div>
                <div className="sb-ha-cardstep-title">{c.title}</div>
                <p className="sb-ha-cardstep-body">{c.body}</p>
              </div>
            ))}
          </div>
          <figure className="sb-ha-cardshot">
            <div className="sb-ha-frame">
              <img
                src="/assets/ha-card.png"
                alt="The SpotSteer card on a dashboard: a day of prices with the hours it picked shaded"
                width={1494}
                height={770}
              />
            </div>
            <figcaption>
              The shaded blocks are the hours your device will run.
            </figcaption>
          </figure>
        </div>
      </section>

      <DayFlow sectionClassName="sb-section sb-ha-tight" headingClassName="sb-ha-h2" />

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

      <section className="sb-section sb-ha-tight">
        <div className="sb-ha-close">
          <a className="sb-card sb-ha-close-card" href="/shelly">
            <span className="sb-ha-close-kicker">No Home Assistant?</span>
            <span className="sb-ha-close-title">
              Set up a Shelly instead <ArrowRight size={17} />
            </span>
            <span className="sb-ha-close-note">
              A Shelly plug runs the same cheap hours on its own.
            </span>
          </a>
        </div>
      </section>
      <Footer />
    </div>
  );
}
