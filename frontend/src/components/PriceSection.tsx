import { useEffect, useMemo, useRef, useState, type TouchEvent as ReactTouchEvent } from 'react';
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

// Default selection until the user picks a zone on the map (Germany-Luxembourg = id 7).
const DEFAULT_ZONE_ID = 7;

// Mobile breakpoint — must match the `@media (max-width: 900px)` rules in spotbuddy.css.
const MOBILE_QUERY = '(max-width: 900px)';
const isMobileNow = () =>
  typeof window !== 'undefined' && window.matchMedia(MOBILE_QUERY).matches;

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: ZoneSpotPrices };

/** Hour-of-day + minute of a UTC instant, read in a specific IANA timezone (the bidding zone's, not the
 *  viewer's browser). Used both for the x position and the "HH:MM" label so the curve reads in local
 *  market time regardless of where the viewer sits. */
function zonedHourMinute(iso: string, timeZone: string): { hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date(iso));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? '0');
  // hour12:false can emit "24" at midnight in some engines — normalize to 0.
  return { hour: get('hour') % 24, minute: get('minute') };
}

const pad2 = (n: number) => String(n).padStart(2, '0');

export function PriceSection() {
  const [day, setDay] = useState<DayKey>('today');
  // On mobile we start with NOTHING selected — the user is nudged to tap the map first.
  // On desktop the map + chart sit side by side, so we keep the usual default selection.
  const [zoneId, setZoneId] = useState<number | null>(() => (isMobileNow() ? null : DEFAULT_ZONE_ID));
  // Mobile only: whether the chart panel has slid over the map. Ignored by the desktop CSS.
  const [panelOpen, setPanelOpen] = useState(false);
  // Cache each (zone, day) fetch so switching back is instant.
  const [cache, setCache] = useState<Record<string, LoadState>>({});
  // Read the cache without making it an effect dependency (which would re-run
  // the effect — and abort the in-flight request — every time we set loading).
  const cacheRef = useRef(cache);
  cacheRef.current = cache;

  // If the viewport grows to desktop while nothing is picked, fall back to the default
  // zone so the (now always-visible) desktop chart isn't left empty.
  useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY);
    const sync = () => {
      if (!mql.matches) setZoneId((z) => (z == null ? DEFAULT_ZONE_ID : z));
    };
    mql.addEventListener('change', sync);
    return () => mql.removeEventListener('change', sync);
  }, []);

  // Picking a zone on the map: on mobile this slides the track over to the chart, after a
  // short beat so the tapped zone's highlight is visible before the slide.
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSelect = (id: number) => {
    setZoneId(id);
    if (openTimer.current) clearTimeout(openTimer.current);
    openTimer.current = setTimeout(() => setPanelOpen(true), 260);
  };
  useEffect(() => () => {
    if (openTimer.current) clearTimeout(openTimer.current);
  }, []);

  // Finger-swipe between the two mobile stages. A tap (near-zero movement) or a mostly
  // vertical drag (scrolling the chart) is ignored, so this never fights zone taps.
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: ReactTouchEvent) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e: ReactTouchEvent) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) < 45 || Math.abs(dx) < Math.abs(dy)) return; // not a horizontal swipe
    // Chart is the left stage, map the right stage. Swipe right reveals the chart on the
    // left; swipe left reveals the map on the right.
    if (dx > 0) {
      if (zoneId != null) setPanelOpen(true); // swipe right → chart (only if a zone is picked)
    } else {
      setPanelOpen(false); // swipe left → back to map
    }
  };

  const zoneName = zoneId != null ? (ZONE_BY_ID[zoneId]?.name ?? 'this zone') : 'this zone';
  const key = `${zoneId}:${day}`;

  useEffect(() => {
    if (zoneId == null) return; // nothing picked yet (mobile) — no fetch
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

  const state = zoneId != null ? cache[key] : undefined;

  return (
    <section
      id="prices"
      className="sb-price-section"
      data-panel-open={panelOpen}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Large map as a background layer — bleeds off the right edge (Russia), zones stay
          clickable and blue. The chart card floats over it on the left. */}
      <div className="sb-zonemap-bleed">
        <ZoneMap selectedZoneId={zoneId} onSelect={handleSelect} />
      </div>

      {/* Mobile-only nudge inviting the first tap. Hidden on desktop and once the panel opens. */}
      <div className="sb-map-nudge" aria-hidden="true">
        <span className="sb-map-nudge-tap" />
        Tap your zone to see prices
      </div>

      <div className="sb-price-inner">
        {/* Mobile-only handle pinned to the chart stage's right edge (the map is to the
            right): slides the track back to the map to re-pick. Sits on the stage (not
            inside the scrolling column) so it stays put while the chart scrolls. */}
        <button
          type="button"
          className="sb-chart-handle"
          onClick={() => setPanelOpen(false)}
          aria-label="Back to map — change zone"
        >
          <span aria-hidden="true">›</span>
        </button>

        <div className="sb-price-col">
          <div className="sb-price-head">
            <h2>Today&apos;s price curve</h2>
            <p>
              Pick a zone on the map — live day-ahead spot prices for {zoneName}. The graph shows
              the price through the day; SpotBuddy runs your devices in the dips.
            </p>
          </div>

          <div className="sb-card sb-chart-card">
            <Chart state={state} day={day} onPickDay={setDay} zoneName={zoneName} />
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

    // Label each slot in the bidding zone's local time, not the viewer's browser timezone.
    const timeZone = state?.status === 'ready' ? state.data.timeZoneId : 'UTC';
    const data: ChartDatum[] = points.map((p) => {
      const { hour, minute } = zonedHourMinute(p.fromUtc, timeZone);
      return { hour: hour + minute / 60, time: `${pad2(hour)}:${pad2(minute)}`, ct: p.ctPerKwh };
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
            <span>
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
