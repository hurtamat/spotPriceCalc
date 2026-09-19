// Client for GET /api/savings/appliances. The estimator's own numbers never come from the API — see
// SavingsCalculator.

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

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5262';

export async function fetchApplianceSavings(
  zoneCode: string,
  signal?: AbortSignal,
): Promise<ApplianceSavings> {
  const url = `${API_BASE}/api/savings/appliances?zoneCode=${encodeURIComponent(zoneCode)}`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`GET /api/savings/appliances failed: ${res.status}`);
  return (await res.json()) as ApplianceSavings;
}
