// 2×2 grid: the two live integrations get full cards with bullets and a Configure link, the
// two planned ones keep the blurred-logo + "Coming soon" treatment from the old logo wall.
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

// Heights are deliberately well above the design's 64/52 so these read at roughly two thirds
// of the Home Assistant card's visual weight rather than as small afterthoughts.
const SOON = [
  { key: 'google-home', name: 'Google Home', logo: '/assets/logo-google-home.png', logoHeight: 96 },
  { key: 'alexa', name: 'Amazon Alexa', logo: '/assets/logo-alexa.png', logoHeight: 78 },
];

function Check({ dark }: { dark: boolean }) {
  return (
    <svg
      className="sb-int-check"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ color: dark ? 'var(--color-accent-300)' : 'var(--color-accent)' }}
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export function Devices() {
  return (
    <section id="devices" className="sb-section" style={{ padding: 'clamp(40px,6vw,80px) 0' }}>
      <div className="sb-section-head">
        <h2 style={{ fontSize: 'clamp(28px,4vw,42px)', margin: '14px 0' }}>
          The smart-home systems SpotBuddy controls
        </h2>
        <p style={{ color: 'var(--color-neutral-700)', fontSize: 'clamp(15px,1.5vw,18px)' }}>
          Already run one of these? You&apos;re ready. SpotBuddy speaks to your existing hub,
          switches and plugs and runs them on the cheap hours. No new hardware, no rewiring.
        </p>
      </div>

      <div className="sb-int-grid">
        {LIVE.map((i) => (
          <div key={i.key} className="sb-int-card" data-dark={i.dark || undefined}>
            <div className="sb-int-head">
              <img
                src={i.logo}
                alt={i.name}
                style={{ height: i.logoHeight }}
                className={i.dark ? 'sb-logo-white' : undefined}
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
              {i.cta} →
            </a>
          </div>
        ))}

        {SOON.map((i) => (
          <div key={i.key} className="sb-int-card sb-int-soon" data-soon="true">
            <span className="sb-logo-soon">Coming soon</span>
            <img src={i.logo} alt={i.name} style={{ height: i.logoHeight }} />
          </div>
        ))}
      </div>

      <p className="sb-int-note">
        More integrations on the way, every one goes live over time. Brand names and logos belong to
        their respective owners.
      </p>
    </section>
  );
}
