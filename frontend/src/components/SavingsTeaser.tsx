import { ApplianceIcon, type Appliance } from './icons';

const APPS: { kind: Appliance; label: string }[] = [
  { kind: 'ev', label: 'Electric car' },
  { kind: 'pool', label: 'Pool heating' },
  { kind: 'boiler', label: 'Boiler' },
  { kind: 'dryer', label: 'Dryer' },
  { kind: 'dishwasher', label: 'Dishwasher' },
  { kind: 'ac', label: 'Air conditioning' },
];

export function SavingsTeaser() {
  return (
    <section className="sb-teaser">
      <div className="sb-teaser-inner">
        <div>
          <h2 className="sb-h1">What would this be worth in your house?</h2>
          <p className="sb-lede-sm">
            Tell us roughly what you run and how many of you there are, and see the yearly figure
            plus the hour each appliance would start on.
          </p>
          <a className="sb-btn sb-primary" href="/savings">
            Work out my saving
          </a>
        </div>

        <div className="sb-teaser-apps">
          {APPS.map((a) => (
            <div key={a.kind} className="sb-teaser-app">
              <ApplianceIcon kind={a.kind} />
              {a.label}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
