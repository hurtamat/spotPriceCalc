// Bento, not a 2x2 of equal squares: Home Assistant leads across two columns, Shelly
// runs full height beside it, and the two planned integrations share the lower row as
// small tiles. Four items, four cells, no filler.
const LIVE = [
  {
    key: 'homeassistant',
    name: 'Home Assistant',
    logo: '/assets/logo-homeassistant.png',
    logoHeight: 34,
    href: '/home-assistant',
    cta: 'Configure in Home Assistant',
    dark: true,
    bullets: [
      'One integration, whole-home orchestration',
      'Everything HA controls becomes price-aware: climate, EV chargers, plugs, relays',
      'We publish the cheap-hour plan, your automations run against it',
      'Local-first and vendor-agnostic, no per-device scripts',
    ],
  },
  {
    key: 'shelly',
    name: 'Shelly',
    logo: '/assets/logo-shelly.png',
    logoHeight: 28,
    href: '/shelly',
    cta: 'Configure your Shelly',
    dark: false,
    bullets: [
      'Five minute setup with one paste-in script',
      'Set and forget, it runs itself from then on',
      'Works with Shelly Plus, Pro and Gen2 relays and plugs',
      'Customizable parameters to fit your needs',
    ],
  },
];

const SOON = [
  { key: 'google-home', name: 'Google Home', logo: '/assets/logo-google-home.png', logoHeight: 46 },
  { key: 'alexa', name: 'Amazon Alexa', logo: '/assets/logo-alexa.png', logoHeight: 38 },
];

// Material Symbols, the icon family the site already loads (see index.html), rather
// than a hand-drawn path.
function Check({ dark }: { dark: boolean }) {
  return (
    <span
      className="material-symbols-outlined sb-int-check"
      style={{ color: dark ? 'var(--color-text)' : 'var(--color-accent)' }}
      aria-hidden="true"
    >
      check
    </span>
  );
}

export function Devices() {
  return (
    <section id="devices" className="sb-section">
      <div className="sb-section-head">
        <h2>The smart-home systems SpotSteer controls</h2>
        <p>
          Already run one of these? You&apos;re ready. SpotSteer speaks to your existing hub,
          switches and plugs and runs them on the cheap hours. No new hardware, no rewiring.
        </p>
      </div>

      <div className="sb-int-grid">
        {LIVE.map((i) => (
          <div
            key={i.key}
            className="sb-int-card"
            data-key={i.key}
            data-dark={i.dark || undefined}
          >
            <div className="sb-int-head">
              <img
                src={i.logo}
                alt={i.name}
                style={{ height: i.logoHeight }}
                // Every partner wordmark ships dark-on-light; on this site they all
                // need flattening to the page's off-white.
                className="sb-logo-white"
              />
              <span className="sb-int-badge">
                <i className="sb-int-dot" />
                Live today
              </span>
            </div>

            <div className="sb-int-rule" />

            <div className="sb-int-bullets">
              {i.bullets.map((b) => (
                <div key={b} className="sb-int-bullet">
                  <Check dark={i.dark} />
                  {b}
                </div>
              ))}
            </div>

            <a className="sb-btn sb-int-cta" href={i.href}>
              {i.cta}
            </a>
          </div>
        ))}

        {SOON.map((i) => (
          <div key={i.key} className="sb-int-card sb-int-soon" data-soon="true">
            <img src={i.logo} alt={i.name} style={{ height: i.logoHeight }} />
            <span className="sb-logo-soon">Coming soon</span>
          </div>
        ))}
      </div>
    </section>
  );
}
