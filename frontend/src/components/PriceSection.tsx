import { useEffect, useMemo, useRef, useState } from 'react';
import {
  DAY_LABELS,
  DAY_ORDER,
  dateForDay,
  fetchSpotPrices,
  type DayKey,
  type ZoneSpotPrices,
} from '../api/spotPrices';

// Slovakia is hardcoded for now (bidding zone id 6 in the backend seed).
const SLOVAKIA = { id: 6, name: 'Slovakia' } as const;

// Chart geometry (matches the design export).
const CW = 620;
const CH = 210;
const PAD_T = 22;
const PAD_B = 16;

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: ZoneSpotPrices };

function hourLabel(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function PriceSection() {
  const [day, setDay] = useState<DayKey>('today');
  // Cache each day's fetch so switching tabs back is instant.
  const [cache, setCache] = useState<Partial<Record<DayKey, LoadState>>>({});
  // Read the cache without making it an effect dependency (which would re-run
  // the effect — and abort the in-flight request — every time we set loading).
  const cacheRef = useRef(cache);
  cacheRef.current = cache;

  useEffect(() => {
    // Already have a finished result for this day? Show it, don't refetch.
    if (cacheRef.current[day]?.status === 'ready') return;

    const controller = new AbortController();
    setCache((c) => ({ ...c, [day]: { status: 'loading' } }));
    fetchSpotPrices(SLOVAKIA.id, dateForDay(day), controller.signal)
      .then((data) => setCache((c) => ({ ...c, [day]: { status: 'ready', data } })))
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        const message = err instanceof Error ? err.message : 'Request failed';
        setCache((c) => ({ ...c, [day]: { status: 'error', message } }));
      });
    return () => controller.abort();
  }, [day]);

  const state = cache[day];

  return (
    <section id="prices" className="sb-price-section">
      <div className="sb-map-bg" aria-hidden="true" />
      <div className="sb-price-inner">
        <div className="sb-price-col">
          <div className="sb-price-head">
            <h2>Today&apos;s price curve</h2>
            <p>
              Live day-ahead spot prices for {SLOVAKIA.name}. The graph shows the price through the
              day — SpotBuddy runs your devices in the dips.
            </p>
          </div>

          <div className="sb-card sb-chart-card">
            <Chart state={state} day={day} onPickDay={setDay} zoneName={SLOVAKIA.name} />
          </div>
        </div>
      </div>
    </section>
  );
}

function Chart({
  state,
  day,
  onPickDay,
  zoneName,
}: {
  state: LoadState | undefined;
  day: DayKey;
  onPickDay: (d: DayKey) => void;
  zoneName: string;
}) {
  const derived = useMemo(() => {
    const points = state?.status === 'ready' ? state.data.points : [];
    if (points.length === 0) return null;
    const values = points.map((p) => p.ctPerKwh);
    const n = values.length;
    const max = Math.max(...values);
    const min = Math.min(...values);
    const avg = values.reduce((a, b) => a + b, 0) / n;
    const minIdx = values.indexOf(min);
    const maxIdx = values.indexOf(max);
    const scale = max * 1.12 || 1;

    const xAt = (i: number) => (n <= 1 ? 0 : i / (n - 1)) * CW;
    const yAt = (v: number) => PAD_T + (1 - v / scale) * (CH - PAD_T - PAD_B);

    const pts = values.map((v, i) => [xAt(i), yAt(v)] as const);
    const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
    const area = `M0 ${CH} ${pts.map((p) => `L${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ')} L${CW} ${CH} Z`;

    return {
      line,
      area,
      avgY: yAt(avg),
      minX: xAt(minIdx),
      minY: yAt(min),
      maxX: xAt(maxIdx),
      maxY: yAt(max),
      avg,
      min,
      max,
      minHour: hourLabel(points[minIdx].fromUtc),
      maxHour: hourLabel(points[maxIdx].fromUtc),
    };
  }, [state]);

  const fmt = (v: number | undefined) => (v == null ? '—' : v.toFixed(1));

  return (
    <>
      <div className="sb-chart-stats">
        <div className="sb-chart-stats-group">
          <Stat capClass="sb-stat-cap" cap="Avg" value={fmt(derived?.avg)} unit="c/kWh" />
          <Stat
            capClass="sb-stat-cap sb-stat-cap-accent"
            cap="Cheapest"
            value={fmt(derived?.min)}
            unit={derived ? `c · ${derived.minHour}` : 'c'}
            valueColor="var(--color-accent)"
          />
          <Stat
            capClass="sb-stat-cap sb-stat-cap-pop"
            cap="Peak"
            value={fmt(derived?.max)}
            unit={derived ? `c · ${derived.maxHour}` : 'c'}
            valueColor="var(--color-pop)"
          />
        </div>
        <div className="sb-day-tabs">
          {DAY_ORDER.map((k) => (
            <button
              key={k}
              className="sb-day-tab"
              data-active={day === k}
              onClick={() => onPickDay(k)}
            >
              {DAY_LABELS[k]}
            </button>
          ))}
        </div>
      </div>

      {state?.status === 'loading' && (
        <div className="sb-chart-state">Loading {DAY_LABELS[day].toLowerCase()}&apos;s prices…</div>
      )}

      {state?.status === 'error' && (
        <div className="sb-chart-state">
          Couldn&apos;t reach the price API.
          <br />
          <span style={{ fontSize: 12.5 }}>{state.message}</span>
        </div>
      )}

      {state?.status === 'ready' && !derived && (
        <div className="sb-chart-state">
          No prices stored for {DAY_LABELS[day].toLowerCase()} yet.
          <br />
          <span style={{ fontSize: 12.5 }}>
            Populate the backend first: <code>POST /api/spotprices/populate?day={day}</code>
          </span>
        </div>
      )}

      {derived && (
        <>
          <div>
            <svg
              viewBox={`0 0 ${CW} ${CH}`}
              style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}
            >
              <defs>
                <linearGradient id="sbFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="var(--color-accent)" stopOpacity="0.30" />
                  <stop offset="1" stopColor="var(--color-accent)" stopOpacity="0.02" />
                </linearGradient>
              </defs>
              {[55, 105, 155].map((y) => (
                <line key={y} x1="0" y1={y} x2={CW} y2={y} stroke="var(--color-divider)" strokeWidth="1" />
              ))}
              <path d={derived.area} fill="url(#sbFill)" />
              <line
                x1="0"
                y1={derived.avgY}
                x2={CW}
                y2={derived.avgY}
                stroke="var(--color-neutral-400)"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              <path
                d={derived.line}
                fill="none"
                stroke="var(--color-accent)"
                strokeWidth="2.5"
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
              <circle cx={derived.maxX} cy={derived.maxY} r="5" fill="var(--color-pop)" stroke="#fff" strokeWidth="2" />
              <circle cx={derived.minX} cy={derived.minY} r="5" fill="var(--color-accent)" stroke="#fff" strokeWidth="2" />
            </svg>
            <div className="sb-axis">
              <span>00:00</span>
              <span>06:00</span>
              <span>12:00</span>
              <span>18:00</span>
              <span>24:00</span>
            </div>
          </div>

          <div className="sb-legend">
            <span className="sb-legend-item">
              <span className="sb-dot" style={{ background: 'var(--color-accent)' }} /> Cheapest —{' '}
              {fmt(derived.min)} c at {derived.minHour}
            </span>
            <span className="sb-legend-item">
              <span className="sb-dot" style={{ background: 'var(--color-pop)' }} /> Peak —{' '}
              {fmt(derived.max)} c at {derived.maxHour}
            </span>
            <span className="sb-legend-item">
              <span style={{ width: 15, borderTop: '1px dashed var(--color-neutral-400)', display: 'inline-block' }} />{' '}
              Avg {fmt(derived.avg)} c
            </span>
            <span style={{ marginLeft: 'auto' }}>
              {zoneName} · {DAY_LABELS[day]} · c/kWh
            </span>
          </div>
        </>
      )}
    </>
  );
}

function Stat({
  capClass,
  cap,
  value,
  unit,
  valueColor,
}: {
  capClass: string;
  cap: string;
  value: string;
  unit: string;
  valueColor?: string;
}) {
  return (
    <div>
      <div className={capClass}>{cap}</div>
      <div className="sb-stat-big" style={valueColor ? { color: valueColor } : undefined}>
        {value} <span className="sb-stat-unit">{unit}</span>
      </div>
    </div>
  );
}
