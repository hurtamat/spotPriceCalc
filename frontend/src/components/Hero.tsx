import { SavingsCalculator } from './SavingsCalculator';

const STATS = [
  { num: 'All', label: 'EU zones covered' },
  { num: '0€', label: 'new hardware' },
  { num: '24/7', label: 'hands-off automation' },
];

export function Hero() {
  return (
    <section className="sb-hero">
      <div>
        <h1>
          Cut your power bill <span className="sb-accent">up to 35%</span> — without lifting a
          finger.
        </h1>
        <p className="sb-hero-sub">
          Electricity prices change every hour. SpotBuddy watches the spot market and tells your
          Shelly, Tuya &amp; Aqara devices to run when power is cheapest — the boiler, the EV
          charger, the heat pump, the pool.
        </p>
        <div className="sb-hero-actions">
          <button className="sb-btn sb-primary" style={{ fontSize: 15, padding: '14px 28px' }}>
            Join the waitlist →
          </button>
          <a className="sb-link" href="#how" style={{ color: 'var(--color-neutral-600)' }}>
            See how it works
          </a>
        </div>
        <div className="sb-hero-stats">
          {STATS.map((s) => (
            <div key={s.label}>
              <div className="sb-stat-num">{s.num}</div>
              <div className="sb-stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <SavingsCalculator />
    </section>
  );
}
