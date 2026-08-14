// Client for the .NET spot-price API (GET /api/spotprices).
// `date` is the zone's LOCAL delivery day; the backend resolves it to a UTC window via the zone's
// timezone and returns the stored day-ahead curve (points are UTC; `timeZoneId` says how to label them).

/** Where a slot sits in its zone's trailing-7-day price distribution, as stamped by the backend.
 *  `null` = never classified (too little history, or the calc-service was down when the day landed)
 *  — render it as unknown, never guess a colour. */
export type PriceQuantile = 'Green' | 'Yellow' | 'Red';

export interface PricePoint {
  fromUtc: string;
  toUtc: string;
  eurPerMwh: number;
  ctPerKwh: number;
  quantile: PriceQuantile | null;
}

export interface ZoneSpotPrices {
  biddingZoneId: number;
  /** IANA timezone of the bidding zone (e.g. "Europe/Berlin"). Points stay UTC; use this to label
   *  them in the zone's local time rather than the viewer's browser timezone. */
  timeZoneId: string;
  points: PricePoint[];
}

// Override at build/dev time with VITE_API_BASE_URL (see .env.example).
// Default targets the API's `http` launch profile.
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5262';

export type DayKey = 'yesterday' | 'today' | 'tomorrow';

export const DAY_LABELS: Record<DayKey, string> = {
  yesterday: 'Yesterday',
  today: 'Today',
  tomorrow: 'Tomorrow',
};

export const DAY_ORDER: DayKey[] = ['yesterday', 'today', 'tomorrow'];

/** Local calendar date (YYYY-MM-DD) offset from today by the given day. */
export function dateForDay(day: DayKey): string {
  const d = new Date();
  d.setDate(d.getDate() + (day === 'yesterday' ? -1 : day === 'tomorrow' ? 1 : 0));
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

export async function fetchSpotPrices(
  biddingZoneId: number,
  date: string,
  signal?: AbortSignal,
): Promise<ZoneSpotPrices> {
  const url = `${API_BASE}/api/spotprices?biddingZoneId=${biddingZoneId}&date=${date}`;
  const res = await fetch(url, { signal });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`API ${res.status}${body ? `: ${body}` : ''}`);
  }
  return (await res.json()) as ZoneSpotPrices;
}
