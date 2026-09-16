import type { ApplianceSavings } from '../api/savings';

// The icon font is an eight-glyph subset, so a new key needs it regenerated — which is why air
// conditioning borrows the dryer's snowflake.
const ICONS: Record<string, string> = {
  boiler: 'water_heater',
  ev: 'electric_car',
  pool: 'heat_pump',
  ac: 'cool_to_dry',
  dishwasher: 'dishwasher',
  washer: 'local_laundry_service',
};

const eur = (v: number) => `€${v.toFixed(2)}`;
const ct = (v: number) => `${v.toFixed(1)} c/kWh`;

export function IndividualSavings({ data }: { data: ApplianceSavings | null }) {
  return (
    <section className="sb-indiv" id="individual-savings">
      <div className="sb-indiv-head">
        <h3>Individual savings</h3>
        <span>
          {data
            ? `What one cycle saves in ${data.zoneName}, run in today's cheapest window instead of paying a fixed ${ct(data.fixedPriceCtPerKwh)}. The best hour is the whole day's, so it may already have passed.`
            : 'Pick your price zone to see the best hour for each appliance today.'}
        </span>
      </div>

      <div className="sb-indiv-grid">
        {(data?.appliances ?? []).map((a) => (
          <div
            className="sb-card sb-indiv-card"
            key={a.key}
            data-pending={a.startLocal == null || undefined}
          >
            <div className="sb-indiv-top">
              <span className="sb-indiv-icon">
                <span className="material-symbols-outlined" aria-hidden="true">
                  {ICONS[a.key]}
                </span>
              </span>
              <div className="sb-indiv-title">
                <div className="sb-indiv-name">{a.name}</div>
                <div className="sb-indiv-spec">
                  {a.cycleKwh} kWh cycle over {a.cycleHours} h
                </div>
              </div>
              {a.startLocal != null && (
                <div className="sb-indiv-when">
                  <div className="sb-indiv-cap">Best time today</div>
                  <div className="sb-indiv-time">{a.startLocal}</div>
                </div>
              )}
            </div>

            {/* One pending line: three blank value slots would read as a loading failure. */}
            {a.savingEur == null || a.greenPriceCtPerKwh == null || data == null ? (
              <div className="sb-indiv-pending">
                No {a.cycleHours} h window in today&apos;s prices.
              </div>
            ) : (
              <div className="sb-indiv-foot">
                <div className="sb-indiv-mid">
                  <strong>{ct(a.greenPriceCtPerKwh)}</strong> instead of {ct(data.fixedPriceCtPerKwh)}
                </div>
                <div className="sb-indiv-saving-box">
                  <div className="sb-indiv-cap">Saved today</div>
                  <div className="sb-indiv-saving">{eur(a.savingEur)}</div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
