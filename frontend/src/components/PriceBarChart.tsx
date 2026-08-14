// The day-ahead price curve as a MUI X bar chart: one bar per delivery slot, coloured by the
// quantile the backend stamped on it (green / yellow / red, grey when unclassified).
//
// Two things drive the whole file:
//
// 1. **Slot resolution varies by zone and by day.** Most zones publish PT15M (96 slots), IE-SEM
//    publishes PT60M (24). So the bar count is data, not a constant — 96 bars have to render
//    pencil-thin and can't carry 96 axis labels, 24 can be chunky and labelled every 3 hours.
//
// 2. **The API returns a CET *market* day, but we display a *local* day.** The stored window is
//    22:00Z→22:00Z (23:00Z in winter) for every zone — the CET calendar day — which lines up with
//    00:00–24:00 local only for zones that are themselves on CET. For the 9 zones that aren't
//    (GR/BG/RO/FI/EE/LV/LT an hour ahead, PT/IE an hour behind) that window straddles two local
//    days, so we keep only the slots whose *local* date is the day being viewed and the axis simply
//    ends up an hour short at one end. That's correct, not missing data: the hour is real, it just
//    belongs to the neighbouring local day.
import { useMemo } from 'react';
import { BarChart } from '@mui/x-charts/BarChart';
import { ChartsReferenceLine } from '@mui/x-charts/ChartsReferenceLine';
import type { PricePoint, PriceQuantile } from '../api/spotPrices';

const QUANTILE_COLOR: Record<PriceQuantile, string> = {
  Green: 'var(--color-q-green)',
  Yellow: 'var(--color-q-yellow)',
  Red: 'var(--color-q-red)',
};
const UNCLASSIFIED_COLOR = 'var(--color-neutral-400)';

/** A `type`, not an `interface`, on purpose: only type aliases get the implicit index signature that
 *  MUI X's `DatasetType` ({ [key: string]: unknown }[]) requires, so `dataset={slots}` typechecks. */
export type PriceSlot = {
  /** "HH:MM" in the zone's local time — also the band-scale category, so it must be unique. */
  time: string;
  ct: number;
  quantile: PriceQuantile | null;
  fromUtc: string;
  toUtc: string;
};

const pad2 = (n: number) => String(n).padStart(2, '0');

/** Local calendar date + wall-clock of an instant, read in a specific IANA timezone (the bidding
 *  zone's, not the viewer's browser). One formatter is reused across all 96 slots. */
function zonedParts(fmt: Intl.DateTimeFormat, at: Date) {
  const parts = fmt.formatToParts(at);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '0';
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    // hour12:false emits "24" at midnight in some engines — normalize, the date part stays right.
    hour: Number(get('hour')) % 24,
    minute: Number(get('minute')),
  };
}

/**
 * The slots of `localDate` as seen in `timeZone`, in order.
 *
 * Falls back to the full curve if the filter finds nothing — a zone whose data landed under an
 * unexpected window should still draw something rather than an empty card.
 */
export function buildDaySlots(
  points: PricePoint[],
  timeZone: string,
  localDate: string,
): PriceSlot[] {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const all = points.map((p) => {
    const { date, hour, minute } = zonedParts(fmt, new Date(p.fromUtc));
    return {
      date,
      time: `${pad2(hour)}:${pad2(minute)}`,
      ct: p.ctPerKwh,
      quantile: p.quantile,
      fromUtc: p.fromUtc,
      toUtc: p.toUtc,
    };
  });

  const onDay = all.filter((s) => s.date === localDate);
  return (onDay.length > 0 ? onDay : all).map(({ date: _date, ...slot }) => slot);
}

/** "UTC+02:00" for the given instant in the given zone. Intl reports plain "GMT" at zero offset. */
export function utcOffsetLabel(at: Date, timeZone: string): string {
  const name =
    new Intl.DateTimeFormat('en-GB', { timeZone, timeZoneName: 'longOffset' })
      .formatToParts(at)
      .find((p) => p.type === 'timeZoneName')?.value ?? 'GMT';
  return name === 'GMT' ? 'UTC+00:00' : name.replace('GMT', 'UTC');
}

export function PriceBarChart({ slots, height = 230 }: { slots: PriceSlot[]; height?: number }) {
  // 15-minute zones get pencil bars and sparse labels; hourly zones get chunky bars.
  const dense = slots.length > 48;

  const colors = useMemo(
    () => slots.map((s) => (s.quantile ? QUANTILE_COLOR[s.quantile] : UNCLASSIFIED_COLOR)),
    [slots],
  );
  const categories = useMemo(() => slots.map((s) => s.time), [slots]);

  // Label every 3rd hour, which is every 12th bar at PT15M and every 3rd at PT60M.
  const labelEvery = dense ? 12 : 3;

  // "Now" only exists on the day currently in view; on other days no slot contains it.
  const nowSlot = useMemo(() => {
    const now = Date.now();
    return slots.find((s) => now >= Date.parse(s.fromUtc) && now < Date.parse(s.toUtc));
  }, [slots]);

  return (
    <BarChart
      height={height}
      dataset={slots}
      margin={{ top: 16, right: 8, bottom: 0, left: 0 }}
      grid={{ horizontal: true }}
      skipAnimation
      borderRadius={dense ? 1 : 3}
      xAxis={[
        {
          dataKey: 'time',
          scaleType: 'band',
          // Gap as a share of the band. At 96 bands a band is only a few px wide, so a bigger
          // share is what keeps the bars reading as separate strokes instead of a solid block.
          categoryGapRatio: dense ? 0.45 : 0.28,
          // Per-bar colour. An ordinal map keyed on the category is how MUI X colours individual
          // bars of a single series — the alternative (one series per quantile) would leave gaps.
          colorMap: { type: 'ordinal', values: categories, colors },
          tickLabelInterval: (_value: unknown, index: number) => index % labelEvery === 0,
          disableTicks: true,
          disableLine: true,
          tickLabelStyle: { fontSize: 11, fill: 'var(--color-neutral-600)' },
        },
      ]}
      yAxis={[
        {
          width: 44,
          disableTicks: true,
          disableLine: true,
          valueFormatter: (v: number) => v.toFixed(0),
          tickLabelStyle: { fontSize: 11, fill: 'var(--color-neutral-600)' },
        },
      ]}
      series={[
        {
          dataKey: 'ct',
          label: 'Price',
          valueFormatter: (v: number | null) => (v == null ? '—' : `${v.toFixed(1)} c/kWh`),
        },
      ]}
      hideLegend
      sx={{
        '& .MuiChartsGrid-line': { stroke: 'var(--color-divider)' },
      }}
    >
      {nowSlot && (
        <ChartsReferenceLine
          x={nowSlot.time}
          label="now"
          labelAlign="start"
          lineStyle={{ stroke: 'var(--color-accent)', strokeDasharray: '3 3', strokeWidth: 1.5 }}
          labelStyle={{ fontSize: 10, fill: 'var(--color-accent)' }}
        />
      )}
    </BarChart>
  );
}
