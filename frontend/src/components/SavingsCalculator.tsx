import { useState } from 'react';
import { ROUTES } from '../config/site';

// Deliberately local: a ballpark at typical EU figures, not a reading of any zone's curve.
// Every consumption figure here is half a year, which is the window the reference numbers
// were measured over; the result is doubled once for the yearly total.
const BASE_HALF_YEAR_KWH = 1250;
const MAX_ANNUAL_KWH = 1_000_000;
const FIXED_PRICE_EUR = 205.29;
const GREEN_PRICE_EUR = 44.19;
const RATE_EUR_PER_KWH = (FIXED_PRICE_EUR - GREEN_PRICE_EUR) / BASE_HALF_YEAR_KWH;

const CATEGORIES = [
  { key: 'water_heating', label: 'Water heating', halfYearKwh: 200 },
  { key: 'ev', label: 'Electric car', halfYearKwh: 2100 },
  { key: 'ac', label: 'Air conditioning', halfYearKwh: 260 },
  { key: 'heat_pump', label: 'Heat pump', halfYearKwh: 170 },
  { key: 'sauna', label: 'Sauna', halfYearKwh: 234 },
  { key: 'hot_tub', label: 'Hot tub', halfYearKwh: 468 },
];

export function SavingsCalculator() {
  const [kwh, setKwh] = useState('');
  const [on, setOn] = useState<Record<string, boolean>>({});

  const toggle = (key: string) => setOn((s) => ({ ...s, [key]: !s[key] }));

  // The field asks for a year, the model works in halves.
  const baseKwh = parseFloat(kwh) ? parseFloat(kwh) / 2 : BASE_HALF_YEAR_KWH;
  const extraKwh = CATEGORIES.reduce((sum, c) => (on[c.key] ? sum + c.halfYearKwh : sum), 0);
  const halfYearKwh = baseKwh + extraKwh;
  const savedEur = Math.round(halfYearKwh * RATE_EUR_PER_KWH * 2);

  return (
    <div className="sb-card sb-calc">
      <h3 className="sb-h3 sb-calc-title">Estimate it</h3>

      <div>
        <label className="sb-field-label" htmlFor="sb-calc-kwh">
          Yearly consumption, optional (kWh/year)
        </label>
        <input
          id="sb-calc-kwh"
          className="sb-input"
          inputMode="numeric"
          placeholder={`e.g. ${(BASE_HALF_YEAR_KWH * 2).toLocaleString('en-US')}`}
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
            <span className="sb-calc-result-per"> /yr</span>
          </div>
        </div>
        <div className="sb-calc-result-split">
          <div className="sb-calc-result-pct">{(RATE_EUR_PER_KWH * 100).toFixed(1)}</div>
          <div className="sb-calc-result-cap">cents saved per kWh</div>
        </div>
      </div>

      <p className="sb-fine">
        Rough estimate against an average European fixed tariff. Learn more in our{' '}
        <a className="sb-fine-link" href={ROUTES.terms}>
          terms and conditions
        </a>
        .
      </p>
    </div>
  );
}
