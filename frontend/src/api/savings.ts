// Client for GET /api/savings/appliances. The estimator's own numbers never come from the API — see
// SavingsCalculator.

import { getJson } from './client';

export interface AppliancePlan {
  key: string;
  name: string;
  cycleKwh: number;
  cycleHours: number;
  /** "HH:mm" in the zone's own clock. Null together with the two below. */
  startLocal: string | null;
  greenPriceCtPerKwh: number | null;
  savingEur: number | null;
}

export interface ApplianceSavings {
  zoneName: string;
  timeZoneId: string;
  fixedPriceCtPerKwh: number;
  appliances: AppliancePlan[];
}

export function fetchApplianceSavings(
  zoneCode: string,
  signal?: AbortSignal,
): Promise<ApplianceSavings> {
  return getJson<ApplianceSavings>(
    `/api/savings/appliances?zoneCode=${encodeURIComponent(zoneCode)}`,
    signal,
  );
}
