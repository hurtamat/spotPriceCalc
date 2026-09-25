// Client for the .NET spot-price API (GET /api/spotprices).
// `date` is the zone's local delivery day; the backend resolves it to a UTC window.

import { API_BASE, getJson } from './client';
import { pad2 } from '../lib/format';

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

export type DayKey = 'yesterday' | 'today' | 'tomorrow';

export const DAY_LABELS: Record<DayKey, string> = {
  yesterday: 'Yesterday',
  today: 'Today',
  tomorrow: 'Tomorrow',
};

export const DAY_ORDER: DayKey[] = ['yesterday', 'today', 'tomorrow'];

/** Local calendar date (YYYY-MM-DD) offset from today by the given day.
 *  `public/warm.js` repeats this for the today case; the two must agree or nothing is adopted. */
export function dateForDay(day: DayKey): string {
  const d = new Date();
  d.setDate(d.getDate() + (day === 'yesterday' ? -1 : day === 'tomorrow' ? 1 : 0));
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

declare global {
  interface Window {
    __warmPrices?: { url: string; promise: Promise<ZoneSpotPrices | null> };
  }
}

export async function fetchSpotPrices(
  biddingZoneId: number,
  date: string,
  signal?: AbortSignal,
): Promise<ZoneSpotPrices> {
  const path = `/api/spotprices?biddingZoneId=${biddingZoneId}&date=${date}`;

  // Adopted once: a second caller must not re-read a response from hours ago.
  const warm = window.__warmPrices;
  if (warm?.url === `${API_BASE}${path}`) {
    window.__warmPrices = undefined;
    const warmed = await warm.promise;
    if (warmed) return warmed;
  }

  return getJson<ZoneSpotPrices>(path, signal);
}
