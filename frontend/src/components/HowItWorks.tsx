// A sequence, not a set: the three steps sit on one rail, and the step where
// something physically happens is the one the mark's amber node lands on.
const STEPS = [
  {
    title: 'We read the market',
    body: 'Every day we pull the day-ahead spot prices for your bidding zone.',
  },
  {
    title: 'We find the cheap hours',
    body: 'Our engine ranks the hours and plans when each flexible load should run, based on what you need.',
  },
  {
    title: 'Your devices act',
    body: 'SpotSteer integrates with your smart home and switches devices on when it saves the most.',
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="sb-section">
      <div className="sb-section-head">
        <h2>What are spot prices</h2>
        <p>
          On the wholesale market, electricity is priced <strong>every single hour</strong>. That
          hourly wholesale price is the <em>spot price</em>. Pricing like this used to be reserved
          for large companies and factories, but today an ordinary household can get in on it too,
          and put money back in its own pocket every month.
        </p>
      </div>

      <div className="sb-steps">
        {STEPS.map((s) => (
          <div key={s.title} className="sb-step">
            <span className="sb-step-node" aria-hidden="true" />
            <h3>{s.title}</h3>
            <p>{s.body}</p>
          </div>
        ))}
      </div>

      <div className="sb-tariffs">
        <div className="sb-tariff sb-tariff-fixed">
          <h4>Fixed tariff</h4>
          <p>
            You pay the same rate at 3am and 6pm. Shifting your boiler or EV charging to cheap hours
            saves you <strong>nothing</strong>, because the meter can&apos;t tell the difference.
          </p>
        </div>
        <div className="sb-tariff sb-tariff-dynamic">
          <h4>Dynamic / spot tariff</h4>
          <p>
            You pay the real hourly price. Now moving flexible loads into the cheap hours{' '}
            <strong>directly cuts your bill</strong>, and that&apos;s exactly what SpotSteer
            automates.
          </p>
        </div>
      </div>
    </section>
  );
}
