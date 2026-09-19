// No MUI here on purpose: PriceSection needs these eagerly, the chart is lazy-loaded.
import type { PricePoint, PriceQuantile } from '../api/spotPrices';

/** A `type`, not an `interface`, so it satisfies MUI X's `DatasetType` index signature. */
export type PriceSlot = {
  /** "HH:MM" in the zone's local time, also the band-scale category. */
  time: string;
  ct: number;
  quantile: PriceQuantile | null;
  fromUtc: string;
  toUtc: string;
};

const pad2 = (n: number) => String(n).padStart(2, '0');

/** Local calendar date + wall-clock of an instant, read in a specific IANA timezone. */
function zonedParts(fmt: Intl.DateTimeFormat, at: Date) {
  const parts = fmt.formatToParts(at);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '0';
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    // hour12:false emits "24" at midnight in some engines, so normalize.
    hour: Number(get('hour')) % 24,
    minute: Number(get('minute')),
  };
}

/** The slots of `localDate` as seen in `timeZone`, in order. Falls back to the full curve if the
 *  filter finds nothing. */
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
