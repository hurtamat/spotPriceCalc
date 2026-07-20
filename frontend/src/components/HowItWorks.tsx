const STEPS = [
  {
    n: '1',
    title: 'We read the market',
    body: 'Every day we pull the day-ahead spot prices for your bidding zone.',
  },
  {
    n: '2',
    title: 'We find the cheap hours',
    body: 'Our engine ranks the hours and plans when each flexible load should run, factoring weather and comfort.',
  },
  {
    n: '3',
    title: 'Your devices act',
    body: 'SpotBuddy integrates with your smart home and switches devices on when it saves the most.',
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="sb-section">
      <div className="sb-section-head">
        <h2 style={{ fontSize: 'clamp(26px,3.6vw,38px)', margin: '14px 0' }}>What are spot prices</h2>
        <p style={{ color: 'var(--color-neutral-700)' }}>
          On the wholesale market, electricity is priced <strong>every single hour</strong>. At 3am
          with lots of wind it can be nearly free; at 6pm when everyone cooks it spikes. That hourly
          wholesale price is the <em>spot price</em>.
        </p>
      </div>

      <div className="sb-steps">
        {STEPS.map((s) => (
          <div key={s.n} className="sb-card sb-step">
            <div className="sb-step-badge">{s.n}</div>
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
            saves you <strong>nothing</strong> — the meter can&apos;t tell the difference.
          </p>
        </div>
        <div className="sb-tariff sb-tariff-dynamic">
          <h4>Dynamic / spot tariff</h4>
          <p>
            You pay the real hourly price. Now moving flexible loads into the cheap hours{' '}
            <strong>directly cuts your bill</strong> — and that&apos;s exactly what SpotBuddy
            automates.
          </p>
        </div>
      </div>

      <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--color-neutral-600)', marginTop: 18 }}>
        Ask your supplier for a <strong>dynamic tariff &amp; install a smart switch</strong>. Once
        you do, SpotBuddy handles the data and integration for you.
      </p>
    </section>
  );
}
