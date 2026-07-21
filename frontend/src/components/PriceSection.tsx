import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  DAY_LABELS,
  DAY_ORDER,
  dateForDay,
  fetchSpotPrices,
  type DayKey,
  type ZoneSpotPrices,
} from '../api/spotPrices';
import { ZoneMap } from './ZoneMap';
import { ZONE_BY_ID } from '../api/zones';

// Default selection until the user picks a zone on the map (Slovakia = id 6).
const DEFAULT_ZONE_ID = 6;

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
  const [zoneId, setZoneId] = useState<number>(DEFAULT_ZONE_ID);
  // Cache each (zone, day) fetch so switching back is instant.
  const [cache, setCache] = useState<Record<string, LoadState>>({});
  // Read the cache without making it an effect dependency (which would re-run
  // the effect — and abort the in-flight request — every time we set loading).
  const cacheRef = useRef(cache);
  cacheRef.current = cache;

  const zoneName = ZONE_BY_ID[zoneId]?.name ?? 'this zone';
  const key = `${zoneId}:${day}`;

  useEffect(() => {
    // Already have a finished result for this zone+day? Show it, don't refetch.
    if (cacheRef.current[key]?.status === 'ready') return;

    const controller = new AbortController();
    setCache((c) => ({ ...c, [key]: { status: 'loading' } }));
    fetchSpotPrices(zoneId, dateForDay(day), controller.signal)
      .then((data) => setCache((c) => ({ ...c, [key]: { status: 'ready', data } })))
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        const message = err instanceof Error ? err.message : 'Request failed';
        setCache((c) => ({ ...c, [key]: { status: 'error', message } }));
      });
    return () => controller.abort();
  }, [key, zoneId, day]);

  const state = cache[key];

  return (
    <section id="prices" className="sb-price-section">
      <div className="sb-price-inner">
        <div className="sb-price-layout">
          <div className="sb-card sb-map-card">
            <div className="sb-map-head">
              <h3>Pick a bidding zone</h3>
              <p>Click a zone to see its day-ahead prices.</p>
            </div>
            <ZoneMap selectedZoneId={zoneId} onSelect={setZoneId} />
          </div>

          <div className="sb-price-col">
            <div className="sb-price-head">
              <h2>Today&apos;s price curve</h2>
              <p>
                Live day-ahead spot prices for {zoneName}. The graph shows the price through the
                day — SpotBuddy runs your devices in the dips.
              </p>
            </div>

            <div className="sb-card sb-chart-card">
              <Chart state={state} day={day} onPickDay={setDay} zoneName={zoneName} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

interface ChartDatum {
  hour: number; // local hour-of-day (0–24), the x position
  time: string; // "HH:MM" label
  ct: number; // price in c/kWh
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

    const data: ChartDatum[] = points.map((p) => {
      const d = new Date(p.fromUtc);
      return { hour: d.getHours() + d.getMinutes() / 60, time: hourLabel(p.fromUtc), ct: p.ctPerKwh };
    });

    const values = data.map((d) => d.ct);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const minPt = data[values.indexOf(min)];
    const maxPt = data[values.indexOf(max)];

    return { data, min, max, avg, minPt, maxPt };
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
            unit={derived ? `c · ${derived.minPt.time}` : 'c'}
            valueColor="var(--color-accent)"
          />
          <Stat
            capClass="sb-stat-cap sb-stat-cap-pop"
            cap="Peak"
            value={fmt(derived?.max)}
            unit={derived ? `c · ${derived.maxPt.time}` : 'c'}
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
          <div style={{ width: '100%', height: 230 }}>
            <ResponsiveContainer>
              <AreaChart data={derived.data} margin={{ top: 16, right: 8, bottom: 0, left: -18 }}>
                <defs>
                  <linearGradient id="sbFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="var(--color-accent)" stopOpacity={0.3} />
                    <stop offset="1" stopColor="var(--color-accent)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="var(--color-divider)" />
                <XAxis
                  dataKey="hour"
                  type="number"
                  domain={[0, 24]}
                  ticks={[0, 6, 12, 18, 24]}
                  tickFormatter={(h: number) => `${String(h).padStart(2, '0')}:00`}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'var(--color-neutral-600)', fontSize: 12 }}
                />
                <YAxis
                  width={44}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'var(--color-neutral-600)', fontSize: 12 }}
                  tickFormatter={(v: number) => v.toFixed(0)}
                />
                <Tooltip
                  formatter={(v) => [`${(v as number).toFixed(1)} c/kWh`, 'Price']}
                  labelFormatter={(h) => `${String(Math.floor(h as number)).padStart(2, '0')}:00`}
                  contentStyle={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-divider)',
                    borderRadius: 10,
                    fontSize: 13,
                  }}
                />
                <ReferenceLine
                  y={derived.avg}
                  stroke="var(--color-neutral-400)"
                  strokeDasharray="4 4"
                />
                <Area
                  type="monotone"
                  dataKey="ct"
                  stroke="var(--color-accent)"
                  strokeWidth={2.5}
                  fill="url(#sbFill)"
                  isAnimationActive={false}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <ReferenceDot
                  x={derived.minPt.hour}
                  y={derived.min}
                  r={5}
                  fill="var(--color-accent)"
                  stroke="#fff"
                  strokeWidth={2}
                />
                <ReferenceDot
                  x={derived.maxPt.hour}
                  y={derived.max}
                  r={5}
                  fill="var(--color-pop)"
                  stroke="#fff"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="sb-legend">
            <span className="sb-legend-item">
              <span className="sb-dot" style={{ background: 'var(--color-accent)' }} /> Cheapest —{' '}
              {fmt(derived.min)} c at {derived.minPt.time}
            </span>
            <span className="sb-legend-item">
              <span className="sb-dot" style={{ background: 'var(--color-pop)' }} /> Peak —{' '}
              {fmt(derived.max)} c at {derived.maxPt.time}
            </span>
            <span className="sb-legend-item">
              <span
                style={{
                  width: 15,
                  borderTop: '1px dashed var(--color-neutral-400)',
                  display: 'inline-block',
                }}
              />{' '}
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
