const CARD_STEPS = [
  {
    n: 'Step 1',
    title: 'Choose your dashboard',
    body: 'Any will do. Most people use the one they look at every morning.',
  },
  {
    n: 'Step 2',
    title: 'Edit it',
    body: 'Press the pencil at the top right, then the plus inside a section.',
  },
  {
    n: 'Step 3',
    title: 'Search for SpotSteer',
    body: 'Type SpotSteer in the card search, pick it and save.',
  },
];

export function HaCard() {
  return (
    <section id="card" className="sb-guide-section">
      <div className="sb-card sb-ha-cardsec">
        <h2 className="sb-h2 sb-guide-h2">Put the price chart on a dashboard</h2>
        <p className="sb-guide-sub">
          SpotSteer comes with a chart of the whole day, and it is the easiest way to see what
          your device is about to do. Three steps to put it on screen.
        </p>
        <div className="sb-ha-cardsteps">
          {CARD_STEPS.map((c) => (
            <div key={c.n} className="sb-ha-cardstep">
              <div className="sb-ha-cardstep-n">{c.n}</div>
              <div className="sb-ha-cardstep-title">{c.title}</div>
              <p className="sb-ha-cardstep-body">{c.body}</p>
            </div>
          ))}
        </div>
        <figure className="sb-ha-cardshot">
          <div className="sb-ha-frame">
            <img
              src="/assets/ha-card.webp"
              alt="The SpotSteer card on a dashboard: a day of prices with the hours it picked shaded"
              width={1494}
              height={770}
            />
          </div>
          <figcaption>The shaded blocks are the hours your device will run.</figcaption>
        </figure>
      </div>
    </section>
  );
}
