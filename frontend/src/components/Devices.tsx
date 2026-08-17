// `comingSoon` greys + blurs the logo and stamps a "Coming soon" badge over it.
// logo-tuya.png / logo-aqara.png are still in public/assets, just not on the wall.
const LOGOS: { src: string; alt: string; height: number; comingSoon?: boolean }[] = [
  { src: '/assets/logo-shelly.png', alt: 'Shelly', height: 30 },
  { src: '/assets/logo-homeassistant.png', alt: 'Home Assistant', height: 34 },
  { src: '/assets/logo-alexa.png', alt: 'Amazon Alexa', height: 42, comingSoon: true },
  { src: '/assets/logo-google-home.png', alt: 'Google Home', height: 54, comingSoon: true },
];

export function Devices() {
  return (
    <section id="devices" className="sb-section" style={{ padding: 'clamp(40px,6vw,80px) 0' }}>
      <div className="sb-section-head">
        <h2 style={{ fontSize: 'clamp(28px,4vw,42px)', margin: '14px 0' }}>
          The smart-home devices SpotBuddy controls
        </h2>
        <p style={{ color: 'var(--color-neutral-700)', fontSize: 'clamp(15px,1.5vw,18px)' }}>
          Already own one of these? You&apos;re ready. SpotBuddy speaks to your existing switches,
          plugs and relays and runs them on the cheap hours. No new hardware, no rewiring.
        </p>
      </div>

      <div className="sb-logo-wall">
        {LOGOS.map((l) => (
          <div key={l.alt} className="sb-logo-card" data-soon={l.comingSoon ? 'true' : undefined}>
            <img src={l.src} alt={l.alt} style={{ height: l.height }} />
            {l.comingSoon && <span className="sb-logo-soon">Coming soon</span>}
          </div>
        ))}
      </div>

      <div className="sb-devices-cta">
        <a className="sb-btn sb-primary" href="#prices" style={{ fontSize: 15, padding: '14px 34px' }}>
          See live prices
        </a>
        <span style={{ fontSize: 13, color: 'var(--color-neutral-600)' }}>
          Got the device but no dynamic tariff yet? <a href="#how">Here&apos;s why you need one →</a>
        </span>
      </div>
    </section>
  );
}
