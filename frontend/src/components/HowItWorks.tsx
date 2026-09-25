import { TariffComparison } from './TariffComparison';

// A sequence, not a set: the three steps sit on one rail, and the step where
// something physically happens is the one the mark's amber node lands on.
const STEPS = [
  {
    title: 'We read the market',
    body: 'Every day we pull the day-ahead spot prices for your geographic location.',
  },
  {
    title: 'We find the cheap hours',
    body: 'Our engine ranks the hours and plans when each flexible load should run, based on what you need.',
  },
  {
    title: 'Your devices act',
    body: 'SpotSteer integrates with your smart home devices and switches on when it saves the most.',
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="sb-section">
      <div className="sb-section-head">
        <h2 className="sb-h1">What are spot prices</h2>
        <p className="sb-lede-sm">
          On the wholesale market, electricity is priced <strong>every single hour</strong>. That
          hourly wholesale price is the <em>spot price</em>, and it swings through the day.
        </p>
      </div>

      <div className="sb-steps">
        {STEPS.map((s) => (
          <div key={s.title} className="sb-step">
            <span className="sb-step-node" aria-hidden="true" />
            <h3 className="sb-h4">{s.title}</h3>
            <p>{s.body}</p>
          </div>
        ))}
      </div>

      <TariffComparison />
    </section>
  );
}
