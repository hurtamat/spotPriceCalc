import { useEffect, useState } from 'react';
import { Nav } from './Nav';
import { Footer } from './Footer';
import { SavingsCalculator } from './SavingsCalculator';
import { IndividualSavings } from './IndividualSavings';
import { fetchZones, type ZoneOption } from '../api/zones';
import { useDetectedZone } from '../hooks/useDetectedZone';
import { fetchApplianceSavings, type ApplianceSavings } from '../api/savings';

/** /savings. The estimator is a local year-long ballpark; only the appliance cards read the picked
 *  zone's real curve, which is why only they need the zone. */
export function SavingsPage() {
  const zoneState = useDetectedZone();
  const [zones, setZones] = useState<ZoneOption[]>([]);
  const [zoneCode, setZoneCode] = useState('');
  const [touchedZone, setTouchedZone] = useState(false);
  const [savings, setSavings] = useState<ApplianceSavings | null>(null);

  useEffect(() => {
    const ctl = new AbortController();
    fetchZones(ctl.signal)
      .then(setZones)
      .catch(() => undefined);
    return () => ctl.abort();
  }, []);

  // Prefill from the detected zone, but never overwrite a choice the user has already made.
  useEffect(() => {
    if (zoneState.status === 'ready' && zoneState.detected && !touchedZone) {
      setZoneCode(zoneState.detected.code);
    }
  }, [zoneState, touchedZone]);

  useEffect(() => {
    if (!zoneCode) return;
    const ctl = new AbortController();
    setSavings(null);
    fetchApplianceSavings(zoneCode, ctl.signal)
      .then(setSavings)
      .catch(() => {
        // The cards render their own empty state.
      });
    return () => ctl.abort();
  }, [zoneCode]);

  const zone = zones.find((z) => z.code === zoneCode);

  return (
    <div className="sb-shell">
      <Nav />

      <header className="sb-savings-head">
        <h1>What could you save?</h1>
        <p>
          Two views of the same question. The estimator gives you a yearly figure from what you run at
          home. The breakdown below takes today&apos;s prices in your zone and shows when each
          appliance would be cheapest to start.
        </p>
      </header>

      <div className="sb-savings-zone">
        <label className="sb-sw-label" htmlFor="sb-savings-zone">
          Price zone
        </label>
        <select
          id="sb-savings-zone"
          className="sb-sw-input"
          value={zoneCode}
          onChange={(e) => {
            setTouchedZone(true);
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
          ) : zoneState.status === 'locating' ? (
            'Checking your location…'
          ) : zoneState.status === 'failed' ? (
            `${zoneState.reason} Pick your zone above.`
          ) : (
            'No zone covers your location, pick one above.'
          )}
        </div>
      </div>

      <div className="sb-savings-grid">
        <SavingsCalculator />
        <IndividualSavings data={savings} />
      </div>

      <a className="sb-back" href="/">
        Back to SpotSteer
      </a>

      <Footer />
    </div>
  );
}
