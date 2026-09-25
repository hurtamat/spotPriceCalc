import { useEffect, useState } from 'react';
import { fetchApplianceSavings, type ApplianceSavings } from '../api/savings';
import { useZonePicker } from '../hooks/useZonePicker';
import { ZoneSelect } from './ZoneSelect';
import { fixed } from '../lib/format';

// The icon font is an 8-glyph subset; a new key means regenerating it.
const ICONS: Record<string, string> = {
  boiler: 'water_heater',
  ev: 'electric_car',
  pool: 'heat_pump',
  ac: 'cool_to_dry',
  dishwasher: 'dishwasher',
  dryer: 'local_laundry_service',
};

const eur = (v: number) => `€${fixed(v, 2)}`;
const ct = (v: number) => `${fixed(v, 1)} c/kWh`;

export function IndividualSavings() {
  const picker = useZonePicker();
  const { zoneCode } = picker;
  const [data, setData] = useState<ApplianceSavings | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!zoneCode) return;
    const ctl = new AbortController();
    // Keep the old cards up while loading: an empty grid collapses the page and jumps to the top.
    setLoading(true);
    fetchApplianceSavings(zoneCode, ctl.signal)
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => {
        if (!ctl.signal.aborted) setLoading(false);
      });
    return () => ctl.abort();
  }, [zoneCode]);

  return (
    <section className="sb-indiv" id="individual-savings">
      <div className="sb-indiv-head">
        <div className="sb-indiv-headings">
          <h3 className="sb-h3">Individual savings</h3>
          <span>
            {data
              ? "What one cycle saves, run in today's cheapest window instead of at an average European tariff. The best hour is the whole day's, so it may already have passed."
              : 'Pick your price zone to see the best hour for each appliance today.'}
          </span>
        </div>

        <ZoneSelect
          id="sb-indiv-zone"
          picker={picker}
          className="sb-indiv-zone"
          describe={(z) => <>Times in {z.time_zone_id}.</>}
        />
      </div>

      <div className="sb-indiv-grid" data-loading={loading || undefined}>
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
