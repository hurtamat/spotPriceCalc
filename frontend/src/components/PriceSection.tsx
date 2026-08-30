import { useEffect, useMemo, useRef, useState, type TouchEvent as ReactTouchEvent } from 'react';
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
import { PriceBarChart, buildDaySlots, utcOffsetLabel } from './PriceBarChart';
import { publishSelection } from '../state/selectionStore';

// Default selection until the user picks a zone on the map (Germany-Luxembourg = id 7).
const DEFAULT_ZONE_ID = 7;

// Mobile breakpoint, must match the `@media (max-width: 900px)` rules in spotbuddy.css.
const MOBILE_QUERY = '(max-width: 900px)';
const isMobileNow = () =>
  typeof window !== 'undefined' && window.matchMedia(MOBILE_QUERY).matches;

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: ZoneSpotPrices };

export function PriceSection() {
  const [day, setDay] = useState<DayKey>('today');
  // On mobile nothing starts selected; the user is nudged to tap the map first.
  const [zoneId, setZoneId] = useState<number | null>(() => (isMobileNow() ? null : DEFAULT_ZONE_ID));
  // Mobile only: whether the chart panel has slid over the map.
  const [panelOpen, setPanelOpen] = useState(false);
  // Cache each (zone, day) fetch so switching back is instant.
  const [cache, setCache] = useState<Record<string, LoadState>>({});
  // Read the cache without making it an effect dependency.
  const cacheRef = useRef(cache);
  cacheRef.current = cache;

  // If the viewport grows to desktop while nothing is picked, fall back to the default zone.
  useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY);
    const sync = () => {
      if (!mql.matches) setZoneId((z) => (z == null ? DEFAULT_ZONE_ID : z));
    };
    mql.addEventListener('change', sync);
    return () => mql.removeEventListener('change', sync);
  }, []);

  // Picking a zone on mobile slides the track over to the chart after a short beat.
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSelect = (id: number) => {
    setZoneId(id);
    if (openTimer.current) clearTimeout(openTimer.current);
    openTimer.current = setTimeout(() => setPanelOpen(true), 260);
  };
  useEffect(() => () => {
    if (openTimer.current) clearTimeout(openTimer.current);
  }, []);

  // Finger-swipe between the two mobile stages; a tap or vertical drag is ignored.
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
    if (dx > 0) {
      if (zoneId != null) setPanelOpen(true); // swipe right, only if a zone is picked
    } else {
      setPanelOpen(false); // swipe left, back to map
    }
  };

  const zoneName = zoneId != null ? (ZONE_BY_ID[zoneId]?.name ?? 'this zone') : 'this zone';
  const key = `${zoneId}:${day}`;

  useEffect(() => {
    if (zoneId == null) return; // nothing picked yet (mobile)
    if (cacheRef.current[key]?.status === 'ready') return; // already fetched

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

  // Let the Individual-savings section follow this selection and reuse the curve.
  useEffect(() => {
    publishSelection({ zoneId, day, data: state?.status === 'ready' ? state.data : null });
  }, [zoneId, day, state]);

  return (
    <section
      id="prices"
      className="sb-price-section"
      data-panel-open={panelOpen}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Large map as a background layer, bleeds off the right edge. */}
      <div className="sb-zonemap-bleed">
        <ZoneMap selectedZoneId={zoneId} onSelect={handleSelect} />
      </div>

      {/* Mobile-only nudge inviting the first tap. Hidden on desktop and once the panel opens. */}
      <div className="sb-map-nudge" aria-hidden="true">
        <span className="sb-map-nudge-tap" />
        Tap your zone to see prices
      </div>

      <div className="sb-price-inner">
        {/* Mobile-only handle that slides the track back to the map to re-pick. */}
        <button
          type="button"
          className="sb-chart-handle"
          onClick={() => setPanelOpen(false)}
          aria-label="Back to map, change zone"
        >
          <span aria-hidden="true">›</span>
        </button>

        <div className="sb-price-col">
          <div className="sb-price-head">
            <h2>Today&apos;s price curve</h2>
            <p>
              Pick a zone on the map for live spot prices. The graph shows
              the price through the day.
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
    if (state?.status !== 'ready' || state.data.points.length === 0) return null;

    // Label and slice the day in the bidding zone's local time, not the viewer's or CET.
    const timeZone = state.data.timeZoneId;
    const slots = buildDaySlots(state.data.points, timeZone, dateForDay(day));
    if (slots.length === 0) return null;

    const values = slots.map((s) => s.ct);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;

    return {
      slots,
      min,
      max,
      avg,
      minPt: slots[values.indexOf(min)],
      maxPt: slots[values.indexOf(max)],
      offset: utcOffsetLabel(new Date(slots[0].fromUtc), timeZone),
    };
  }, [state, day]);

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
          <div style={{ width: '100%' }}>
            <PriceBarChart slots={derived.slots} />
          </div>

          <div className="sb-legend">
            <span className="sb-legend-item">
              <i className="sb-dot" style={{ background: 'var(--color-q-green)' }} /> Cheap
            </span>
            <span className="sb-legend-item">
              <i className="sb-dot" style={{ background: 'var(--color-q-yellow)' }} /> Average
            </span>
            <span className="sb-legend-item">
              <i className="sb-dot" style={{ background: 'var(--color-q-red)' }} /> Expensive
            </span>
            <span>
              {zoneName} · {DAY_LABELS[day]} · c/kWh
            </span>
          </div>

          {/* The x axis is the zone's own wall clock, not the viewer's and not UTC. */}
          <div className="sb-chart-tz">
            Local time in {zoneName} ({derived.offset})
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
