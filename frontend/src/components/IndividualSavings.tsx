import { useEffect, useRef, useState } from 'react';
import { fetchApplianceSavings, type ApplianceSavings } from '../api/savings';
import { fetchZones, type ZoneOption } from '../api/zones';
import { useDetectedZone } from '../hooks/useDetectedZone';
import { fixed } from '../lib/format';

// The icon font is an eight-glyph subset, so a new key needs it regenerated — which is why air
// conditioning borrows the dryer's snowflake.
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

/** Owns the zone picker: the zone changes only these cards, never the estimator beside them. */
export function IndividualSavings() {
  const { state: zoneState, request: locate } = useDetectedZone();
  const [zones, setZones] = useState<ZoneOption[]>([]);
  const [zoneCode, setZoneCode] = useState('');
  // A ref, not state: flipping this on mousedown must not re-render and close the open dropdown.
  const touchedZone = useRef(false);
  const [data, setData] = useState<ApplianceSavings | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const ctl = new AbortController();
    fetchZones(ctl.signal)
      .then(setZones)
      .catch(() => undefined);
    return () => ctl.abort();
  }, []);

  // Prefill from the detected zone, but never overwrite a choice — or an open dropdown.
  useEffect(() => {
    if (zoneState.status === 'ready' && zoneState.detected && !touchedZone.current) {
      setZoneCode(zoneState.detected.code);
    }
  }, [zoneState]);

  useEffect(() => {
    if (!zoneCode) return;
    const ctl = new AbortController();
    // The old cards stay up while the new zone loads: emptying the grid collapses the page
    // and the browser clamps you back to the top.
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

  const zone = zones.find((z) => z.code === zoneCode);

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

        <div className="sb-indiv-zone">
          <label className="sb-sw-label" htmlFor="sb-indiv-zone">
            Price zone
          </label>
          <select
            id="sb-indiv-zone"
            className="sb-sw-input"
            value={zoneCode}
            onMouseDown={() => (touchedZone.current = true)}
            onKeyDown={() => (touchedZone.current = true)}
            onChange={(e) => {
              touchedZone.current = true;
              setZoneCode(e.target.value);
            }}
          >
            <option value="">Select your country…</option>
            {zones.map((z) => (
              <option key={z.code} value={z.code}>
                {z.name}
              </option>
            ))}
          </select>
          <div className="sb-sw-note">
            {zone ? (
              <>Times in {zone.time_zone_id}.</>
            ) : zoneState.status === 'idle' ? (
              <button type="button" className="sb-locate" onClick={locate}>
                Use my location
              </button>
            ) : zoneState.status === 'locating' ? (
              'Checking your location…'
            ) : zoneState.status === 'failed' ? (
              `${zoneState.reason} Pick your zone above.`
            ) : (
              'No zone covers your location, pick one above.'
            )}
          </div>
        </div>
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
