const LOGOS = [
  { src: '/assets/logo-shelly.png', alt: 'Shelly', height: 30 },
  { src: '/assets/logo-tuya.png', alt: 'Tuya', height: 40 },
  { src: '/assets/logo-aqara.png', alt: 'Aqara', height: 28 },
  { src: '/assets/logo-homeassistant.png', alt: 'Home Assistant', height: 34 },
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
          <div key={l.alt} className="sb-logo-card">
            <img src={l.src} alt={l.alt} style={{ height: l.height }} />
          </div>
        ))}
      </div>

      <div className="sb-devices-cta">
        <button className="sb-btn sb-primary" style={{ fontSize: 15, padding: '14px 34px' }}>
          Join the waitlist
        </button>
        <span style={{ fontSize: 13, color: 'var(--color-neutral-600)' }}>
          Got the device but no dynamic tariff yet? <a href="#how">Here&apos;s why you need one →</a>
        </span>
      </div>
    </section>
  );
}
