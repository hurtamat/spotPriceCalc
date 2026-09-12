// Stands where the estimator and the per-appliance cards used to sit on the landing
// page, and hands both off to /savings. The six glyphs are the same Material Symbols
// ligatures the appliance cards use, so the teaser previews the real thing rather
// than describing it. Deliberately carries no numbers: the estimate belongs on the
// page that can ask the questions behind it.
const APPS = [
  { icon: 'electric_car', label: 'Electric car' },
  { icon: 'heat_pump', label: 'Heat pump' },
  { icon: 'water_heater', label: 'Boiler' },
  { icon: 'local_laundry_service', label: 'Washing machine' },
  { icon: 'dishwasher', label: 'Dishwasher' },
  { icon: 'cool_to_dry', label: 'Dryer' },
];

export function SavingsTeaser() {
  return (
    <section className="sb-teaser">
      <div className="sb-teaser-inner">
        <div>
          <h2>What would this be worth in your house?</h2>
          <p>
            Tell us roughly what you run and how many of you there are, and see the yearly figure
            plus the hour each appliance would start on.
          </p>
          <a className="sb-btn sb-primary" href="/savings">
            Work out my saving
          </a>
        </div>

        <div className="sb-teaser-apps">
          {APPS.map((a) => (
            <div key={a.icon} className="sb-teaser-app">
              <span className="material-symbols-outlined" aria-hidden="true">
                {a.icon}
              </span>
              {a.label}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
