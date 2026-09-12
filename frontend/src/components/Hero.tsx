// The photograph is the hero. It is a real <img> rather than a CSS background so it
// can carry fetchpriority and explicit intrinsic dimensions: it is the LCP element,
// and a background-image can do neither.
const BACKDROP = '/assets/backdrop.png';

export function Hero() {
  return (
    <section className="sb-hero">
      <div className="sb-hero-media">
        <img
          src={BACKDROP}
          width={640}
          height={256}
          fetchPriority="high"
          decoding="async"
          alt="An electric car charging on the driveway of a family home while a child plays basketball beside it."
        />
      </div>
      <div className="sb-hero-scrim" aria-hidden="true" />

      <div className="sb-hero-inner">
        <div className="sb-hero-copy">
          <h1 style={{ '--i': 0 } as React.CSSProperties}>
            Cut your power bill <span className="sb-accent">up to 35%</span> without lifting a
            finger.
          </h1>
          <p className="sb-hero-sub" style={{ '--i': 1 } as React.CSSProperties}>
            Electricity prices change every hour. SpotSteer watches the spot market and runs your
            devices when power is cheapest.
          </p>
        </div>
      </div>
    </section>
  );
}

// The three claims that used to crowd the hero. Trust marks belong under the value
// proposition, not inside it.
const CLAIMS = [
  { num: 'All', label: 'EU zones covered' },
  { num: '0€', label: 'new hardware' },
  { num: '24/7', label: 'hands-off automation' },
];

export function Claims() {
  return (
    <section className="sb-claims">
      {CLAIMS.map((c) => (
        <div key={c.label}>
          <div className="sb-stat-num">{c.num}</div>
          <div className="sb-stat-label">{c.label}</div>
        </div>
      ))}
    </section>
  );
}
