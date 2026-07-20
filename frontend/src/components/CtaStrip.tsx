export function CtaStrip() {
  return (
    <section className="sb-cta">
      <div className="sb-cta-glow" />
      <div style={{ position: 'relative' }}>
        <h2>Ready to let cheap hours pay your bill?</h2>
        <p className="sb-cta-sub">
          Join the waitlist and we&apos;ll ping you when SpotBuddy opens in your zone.
        </p>
        {/* Waitlist submission is wired up later. */}
        <div className="sb-cta-form">
          <input className="sb-cta-input" placeholder="you@email.com" />
          <button className="sb-btn sb-cta-btn">Join waitlist</button>
        </div>
      </div>
    </section>
  );
}
