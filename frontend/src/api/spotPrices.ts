// Client for the .NET spot-price API (GET /api/spotprices).
// `date` is the zone's local delivery day; the backend resolves it to a UTC window.

/** Where a slot sits in its zone's trailing-7-day price distribution.
 *  `null` means never classified, render as unknown rather than guessing a colour. */
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
  /** IANA timezone of the bidding zone (e.g. "Europe/Berlin"); points stay UTC. */
  timeZoneId: string;
  points: PricePoint[];
}

// Override at build/dev time with VITE_API_BASE_URL (see .env.example).
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
