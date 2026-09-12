// One-way broadcast of the zone/day picked on the price map, so Individual-savings
// (which renders outside PriceSection) can follow the same selection and curve.
import { useSyncExternalStore } from 'react';
import type { DayKey, ZoneSpotPrices } from '../api/spotPrices';
import { ZONE_BY_ID } from '../api/zones';

/** Germany-Luxembourg, the same default PriceSection starts on. */
const DEFAULT_ZONE_ID = 7;

export interface Selection {
  /** Always a real zone: subscribers never render an "unpicked" state. */
  zoneId: number;
  day: DayKey;
  zoneName: string;
  /** Curve for (zoneId, day), or null while loading or errored. */
  data: ZoneSpotPrices | null;
}

const INITIAL: Selection = {
  zoneId: DEFAULT_ZONE_ID,
  day: 'today',
  zoneName: ZONE_BY_ID[DEFAULT_ZONE_ID].name,
  data: null,
};

let current: Selection = INITIAL;
const listeners = new Set<() => void>();

/** PriceSection only. `zoneId: null` is the mobile "nothing tapped yet" state; keeps the last zone. */
export function publishSelection(next: {
  zoneId: number | null;
  day: DayKey;
  data: ZoneSpotPrices | null;
}) {
  const zoneId = next.zoneId ?? current.zoneId;
  const resolved: Selection = {
    zoneId,
    day: next.day,
    zoneName: ZONE_BY_ID[zoneId]?.name ?? current.zoneName,
    data: next.data,
  };
  if (
    current.zoneId === resolved.zoneId &&
    current.day === resolved.day &&
    current.data === resolved.data
  ) {
    return;
  }
  current = resolved;
  for (const l of listeners) l();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useSelection(): Selection {
  return useSyncExternalStore(subscribe, () => current, () => INITIAL);
}
