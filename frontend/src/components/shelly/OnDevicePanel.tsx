import { useState } from 'react';
import type { Mode } from './form';

// Mirrors ROLES in schedule.shelly.js; keep in sync.
const RELAY_COMPONENTS = [
  { id: 'boolean:200', name: 'Continuous block', desc: 'One unbroken run, or the cheapest hours wherever they fall.' },
  { id: 'number:200', name: 'Hours needed', desc: 'How long the appliance needs power. Drag it up before a big load.' },
  { id: 'number:201', name: 'Ready by (hour)', desc: 'The deadline the run has to finish by.' },
  { id: 'number:202', name: 'Unavailable from (hour)', desc: 'Start of a window it must never run in.' },
  { id: 'number:203', name: 'Unavailable to (hour)', desc: 'End of that window.' },
  { id: 'text:200', name: 'Running today', desc: 'The hours it picked for today, in your local time.' },
  { id: 'text:201', name: 'Running tomorrow', desc: 'The same for tomorrow, once prices publish.' },
];

export function OnDevicePanel({ mode }: { mode: Mode }) {
  const [hasPhoneShot, setHasPhoneShot] = useState(true);
  const isRelay = mode === 'relay';

  return (
    <section id="on-device" className="sb-guide-section">
      <div className="sb-guide-dark sb-sw-device">
        <div className="sb-guide-glow" />
        <div className="sb-sw-device-grid">
          <div style={{ minWidth: 0 }}>
            <span className="sb-sw-eyebrow">After the script starts</span>
            <h2 className="sb-h2">Your settings turn into sliders in the Shelly app</h2>
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
                  src="/assets/shelly-virtual-components.webp"
                  alt="Shelly app showing the virtual components SpotSteer created"
                  onError={() => setHasPhoneShot(false)}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
