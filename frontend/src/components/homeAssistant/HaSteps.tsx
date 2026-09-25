import { useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from '../../lib/media';
import { CopyRow } from './CopyRow';

// my.home-assistant.io forwards to the visitor's own instance.
const REPO_URL = 'https://github.com/hurtamat/spotprice-ha';
const HACS_URL =
  'https://my.home-assistant.io/redirect/hacs_repository/?owner=hurtamat&repository=spotprice-ha&category=integration';
const CONFIG_URL = 'https://my.home-assistant.io/redirect/config_flow_start/?domain=spotsteer';
const BLUEPRINT_URL =
  'https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=' +
  encodeURIComponent(
    `${REPO_URL}/blob/main/blueprints/automation/spotsteer/cheap_hours_switch.yaml`,
  );

export const RUN_ENTITY = 'binary_sensor.spotsteer_running';

// Matches the drawer transition in guide-ha.css.
const DRAWER_MS = 280;

type Drawer = 'manual' | 'more';

function PlusIcon({ open }: { open: boolean }) {
  return (
    <span className="sb-ha-plus" data-open={open}>
      +
    </span>
  );
}

function MyHaBadge({ href, src, alt }: { href: string; src: string; alt: string }) {
  return (
    <a className="sb-ha-badge" href={href} target="_blank" rel="noopener noreferrer">
      <img src={src} alt={alt} loading="lazy" />
    </a>
  );
}

export function HaSteps() {
  const [panel, setPanel] = useState<Drawer | null>(null);
  const swapTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(swapTimer.current), []);

  const togglePanel = (which: Drawer) => {
    window.clearTimeout(swapTimer.current);
    if (panel === which) return setPanel(null);
    if (panel === null) return setPanel(which);
    // Both would otherwise animate at once and the section would jump.
    setPanel(null);
    swapTimer.current = window.setTimeout(() => setPanel(which), prefersReducedMotion() ? 0 : DRAWER_MS);
  };

  return (
    <section className="sb-guide-section">
      <h2 className="sb-h2 sb-guide-h2">Two steps</h2>
      <p className="sb-guide-sub">Both buttons open your own Home Assistant.</p>

      <div className="sb-ha-rail">
        <div className="sb-card sb-ha-step">
          <div className="sb-ha-step-head">
            <span className="sb-guide-n">1</span>
            <h3 className="sb-h4">Install</h3>
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
            <span className="sb-guide-n">2</span>
            <h3 className="sb-h4">Configure</h3>
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
                  <CopyRow text={RUN_ENTITY} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
