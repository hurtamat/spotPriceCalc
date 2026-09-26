import { StepRail } from './StepRail';

const BEATS = [
  { title: 'Tomorrow’s prices arrive', body: 'Every afternoon, for your area.' },
  { title: 'SpotSteer picks the hours', body: 'Once, and then it sticks to them.' },
  { title: 'Your device follows them', body: 'The hours never move under you during the day.' },
];

export function DayFlow() {
  return (
    <section className="sb-guide-section sb-dayflow">
      <h2 className="sb-h2">What happens each day</h2>
      <StepRail steps={BEATS} />
    </section>
  );
}
