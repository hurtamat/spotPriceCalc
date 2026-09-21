// Shared by /shelly and /home-assistant. Nothing here names a device, because the
// commit model is the same whichever client is reading the plan.
const BEATS = [
  { title: 'Tomorrow’s prices arrive', body: 'Every afternoon, for your area.' },
  { title: 'SpotSteer picks the hours', body: 'Once, and then it sticks to them.' },
  { title: 'Your device follows them', body: 'The hours never move under you during the day.' },
];

type Props = { sectionClassName: string; headingClassName: string };

/** The mark is a dial with one point marked; the rail repeats it, filling the last node. */
export function DayFlow({ sectionClassName, headingClassName }: Props) {
  return (
    <section className={sectionClassName}>
      <h2 className={headingClassName}>What happens each day</h2>
      <div className="sb-flow">
        {BEATS.map((b, i) => (
          <div key={b.title} className="sb-flow-item">
            <span className="sb-flow-node" data-last={i === BEATS.length - 1} aria-hidden="true" />
            <div className="sb-flow-title">{b.title}</div>
            <p className="sb-flow-body">{b.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
