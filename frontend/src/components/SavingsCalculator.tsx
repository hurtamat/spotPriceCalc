import { useState } from 'react';

// Rough local estimator, mirrors the design's numbers. Not wired to the API.
interface AppMeta {
  key: string;
  label: string;
  kwh: number; // rough yearly consumption contribution
  w: number; // rough savings-% weight
}

const APP_META: AppMeta[] = [
  { key: 'ev', label: 'Electric car', kwh: 2600, w: 9 },
  { key: 'heatpump', label: 'Heat pump', kwh: 4200, w: 8 },
  { key: 'pool', label: 'Pool heating', kwh: 3200, w: 6 },
  { key: 'boiler', label: 'Electric boiler', kwh: 1600, w: 4 },
  { key: 'ac', label: 'Air-con', kwh: 700, w: 3 },
  { key: 'solar', label: 'Solar panels', kwh: 0, w: 4 },
];

const PRICE_PER_KWH = 0.245; // assumed all-in €/kWh

export function SavingsCalculator() {
  const [people, setPeople] = useState(3);
  const [kwh, setKwh] = useState('');
  const [apps, setApps] = useState<Record<string, boolean>>({});

  const toggleApp = (key: string) => setApps((s) => ({ ...s, [key]: !s[key] }));

  const kwhIn = parseFloat(kwh) || 0;
  let appKwh = 0;
  let pct = 9;
  for (const a of APP_META) {
    if (apps[a.key]) {
      appKwh += a.kwh;
      pct += a.w;
    }
  }
  pct = Math.min(35, pct);
  const totalKwh = kwhIn > 0 ? kwhIn : Math.round(1600 + 1050 * people + appKwh);
  const savedEur = Math.round((totalKwh * PRICE_PER_KWH * pct) / 100);

  return (
    <div className="sb-card sb-calc">
      <h3 className="sb-calc-title">Estimate it</h3>

      <div>
        <label className="sb-field-label">People in the household</label>
        <div className="sb-stepper">
          <button
            className="sb-btn sb-step-btn"
            onClick={() => setPeople((p) => Math.max(1, p - 1))}
            aria-label="fewer people"
          >
            −
          </button>
          <span className="sb-step-val">{people}</span>
          <button
            className="sb-btn sb-step-btn"
            onClick={() => setPeople((p) => Math.min(9, p + 1))}
            aria-label="more people"
          >
            +
          </button>
        </div>
      </div>

      <div>
        <label className="sb-field-label">Yearly consumption, optional (kWh/year)</label>
        <input
          className="sb-input"
          inputMode="numeric"
          placeholder="e.g. 3500"
          value={kwh}
          onChange={(e) => setKwh(e.target.value.replace(/[^0-9]/g, ''))}
        />
      </div>

      <div>
        <label className="sb-field-label">Which of these do you have?</label>
        <div className="sb-chips">
          {APP_META.map((a) => (
            <button
              key={a.key}
              className="sb-chip"
              data-on={!!apps[a.key]}
              onClick={() => toggleApp(a.key)}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>

      <div className="sb-calc-result">
        <div>
          <div className="sb-calc-result-cap">Estimated saving</div>
          <div className="sb-calc-result-euros">
            ≈ {savedEur.toLocaleString('en-US')} €
            <span style={{ fontSize: 18, opacity: 0.7, fontWeight: 600 }}> /yr</span>
          </div>
        </div>
        <div className="sb-calc-result-split">
          <div className="sb-calc-result-pct">{pct}%</div>
          <div className="sb-calc-result-cap">off your bill</div>
        </div>
      </div>

      <p className="sb-fine">
        Rough estimate on ~{totalKwh.toLocaleString('en-US')} kWh/yr at an assumed 24.5 c/kWh all-in
        price. Real results depend on your tariff and how flexible each load is.
      </p>
    </div>
  );
}
