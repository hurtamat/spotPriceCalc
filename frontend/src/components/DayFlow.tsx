// Shared by /shelly and /home-assistant. Nothing here names a device, because the
// commit model is the same whichever client is reading the plan.
const BEATS = [
  { title: 'Tomorrow’s prices arrive', body: 'Every afternoon, for your area.' },
  { title: 'SpotSteer picks the hours', body: 'Once, and then it sticks to them.' },
  { title: 'Your device follows them', body: 'The hours never move under you during the day.' },
];

type Props = { sectionClassName: string };

/** The landing page's step rail, reused: the last node is the one that acts. */
export function DayFlow({ sectionClassName }: Props) {
  return (
    <section className={`sb-dayflow ${sectionClassName}`}>
      <h2 className="sb-h2">What happens each day</h2>
      <div className="sb-steps">
        {BEATS.map((b) => (
          <div key={b.title} className="sb-step">
            <span className="sb-step-node" aria-hidden="true" />
            <h3 className="sb-h4">{b.title}</h3>
            <p>{b.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
