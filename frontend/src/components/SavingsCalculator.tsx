import { useState } from 'react';
import { ROUTES } from '../config/site';

// Deliberately local: a year-long ballpark at typical EU figures, not a reading of any zone's curve.
const BASE_ANNUAL_KWH = 2500;
const MAX_ANNUAL_KWH = 1_000_000;
const FIXED_CT_PER_KWH = 20.529;
const GREEN_CT_PER_KWH = 4.419;
// Assumes every kWh moves into a green hour, so the whole gap is the saving.
const RATE_CT_PER_KWH = FIXED_CT_PER_KWH - GREEN_CT_PER_KWH;

const CATEGORIES = [
  { key: 'water_heating', label: 'Water heating', annualKwh: 2750 }, // electric, whole home, 2-4 people
  { key: 'ev', label: 'Electric car', annualKwh: 2250 }, // 12 000 km x ~0.19 kWh/km
  { key: 'pool', label: 'Pool heating', annualKwh: 2250 }, // heat pump, average outdoor pool
  { key: 'ac', label: 'Air conditioning', annualKwh: 720 },
];

export function SavingsCalculator() {
  const [kwh, setKwh] = useState('');
  const [on, setOn] = useState<Record<string, boolean>>({});

  const toggle = (key: string) => setOn((s) => ({ ...s, [key]: !s[key] }));

  const baseKwh = parseFloat(kwh) || BASE_ANNUAL_KWH;
  const extraKwh = CATEGORIES.reduce((sum, c) => (on[c.key] ? sum + c.annualKwh : sum), 0);
  const totalKwh = Math.round(baseKwh + extraKwh);
  const savedEur = Math.round((totalKwh * RATE_CT_PER_KWH) / 100);

  return (
    <div className="sb-card sb-calc">
      <h3 className="sb-calc-title">Estimate it</h3>

      <div>
        <label className="sb-field-label" htmlFor="sb-calc-kwh">
          Yearly consumption, optional (kWh/year)
        </label>
        <input
          id="sb-calc-kwh"
          className="sb-input"
          inputMode="numeric"
          placeholder={`e.g. ${BASE_ANNUAL_KWH.toLocaleString('en-US')}`}
          value={kwh}
          onChange={(e) => {
            const digits = e.target.value.replace(/[^0-9]/g, '');
            setKwh(Number(digits) > MAX_ANNUAL_KWH ? String(MAX_ANNUAL_KWH) : digits);
          }}
        />
      </div>

      <div>
        <label className="sb-field-label">Which of these do you have?</label>
        <div className="sb-chips">
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              className="sb-chip"
              data-on={!!on[c.key]}
              aria-pressed={!!on[c.key]}
              onClick={() => toggle(c.key)}
            >
              {c.label}
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
          <div className="sb-calc-result-pct">{RATE_CT_PER_KWH.toFixed(1)}</div>
          <div className="sb-calc-result-cap">cents saved per kWh</div>
        </div>
      </div>

      <p className="sb-fine">
        Rough estimate against an average European fixed tariff. Learn more in{' '}
        <a className="sb-fine-link" href={ROUTES.terms}>
          Risks and assumptions
        </a>
        .
      </p>
    </div>
  );
}
