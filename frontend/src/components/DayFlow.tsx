import { StepRail } from './StepRail';

const BEATS = [
  { title: 'Tomorrow’s prices arrive', body: 'Every afternoon, for your area.' },
  { title: 'SpotSteer picks the hours', body: 'Once, and then it sticks to them.' },
  { title: 'Your device follows them', body: 'The hours never move under you during the day.' },
];

type Props = { sectionClassName: string };

export function DayFlow({ sectionClassName }: Props) {
  return (
    <section className={`sb-dayflow ${sectionClassName}`}>
      <h2 className="sb-h2">What happens each day</h2>
      <StepRail steps={BEATS} />
    </section>
  );
}
