const CONTROLS = [
  {
    name: 'Enabled',
    desc: 'Pause SpotSteer without removing it. Your device goes back to being ordinary.',
  },
  {
    name: 'Refresh plan',
    desc: 'Fetch the newest prices and pick the hours again, right now.',
  },
];

const SETTINGS = [
  {
    name: 'Continuous block',
    desc: 'Run in one go, or in whichever hours are cheapest.',
  },
  { name: 'Duration', desc: 'How many hours the device needs.' },
  { name: 'Ready by', desc: 'When it has to be finished.' },
  {
    name: 'Unavailable from',
    desc: 'The start of a stretch it must never run in.',
  },
  { name: 'Unavailable to', desc: 'The end of that stretch.' },
  {
    name: 'Use unavailable window',
    desc: 'Switch that quiet stretch on and off without losing the times.',
  },
];

const REPORTS = [
  { name: 'Current price', desc: 'What power costs at this moment.' },
  { name: 'Next end', desc: 'When the cheap stretch ends.' },
  { name: 'Next start', desc: 'When the next cheap stretch begins.' },
  { name: 'Price level', desc: 'Cheap, average or expensive today.' },
  { name: 'Running', desc: 'Whether the device is switched on right now.' },
];

function Panel({
  title,
  rows,
  img,
  alt,
  flip,
}: {
  title: string;
  rows: { name: string; desc: string }[];
  img: string;
  alt: string;
  flip?: boolean;
}) {
  return (
    <div className={flip ? 'sb-ha-pair sb-ha-pair-flip' : 'sb-ha-pair'}>
      <h3 className="sb-h4 sb-ha-pair-title">{title}</h3>
      <figure className="sb-ha-shot">
        <div className="sb-ha-frame">
          <img src={img} alt={alt} />
        </div>
      </figure>
      <div className="sb-ha-pair-text">
        {rows.map((r) => (
          <div key={r.name} className="sb-ha-ref-row">
            <div className="sb-ha-ref-name">{r.name}</div>
            <div className="sb-ha-ref-desc">{r.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function HaPreview() {
  return (
    <section className="sb-guide-section">
      <h2 className="sb-h2 sb-guide-h2">What it looks like in Home Assistant</h2>
      <p className="sb-guide-sub">
        Three panels appear on your SpotSteer device page. One switch, one set of settings, and
        one that simply tells you what is going on.
      </p>

      <Panel
        title="The on switch"
        rows={CONTROLS}
        img="/assets/ha-controls.webp"
        alt="A Home Assistant panel with an Enabled toggle and a Refresh plan button"
      />

      <Panel
        title="What you can change any time"
        rows={SETTINGS}
        img="/assets/ha-configuration.webp"
        alt="A Home Assistant panel of sliders and time pickers for duration, deadline and quiet hours"
        flip
      />

      <Panel
        title="What SpotSteer reports back"
        rows={REPORTS}
        img="/assets/ha-sensors.webp"
        alt="A Home Assistant panel listing the current price, price level and when the device next runs"
      />
    </section>
  );
}
