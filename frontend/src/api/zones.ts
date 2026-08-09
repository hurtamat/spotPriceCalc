// Bidding-zone catalog: maps the GeoJSON `zoneName` (electricitymaps keys) to our
// backend bidding-zone ids (BiddingZoneSeedData). This is the bridge the map uses to
// turn a clicked polygon into a `biddingZoneId` for the price API.
//
// Notes on the many-features-to-one-zone cases:
//   - DE + LU        → zone 7 (Germany-Luxembourg is one bidding zone)
//   - FR + FR-COR    → zone 11 (Corsica sits in the French bidding zone)
// Italy Calabria (zone 41) has no separate polygon in the dataset — its area is folded
// into IT-SO, so it isn't independently selectable on the map.

export interface Zone {
  id: number;
  name: string;
}

/** GeoJSON zoneName → our bidding zone. Only these are price-selectable. */
export const ZONE_BY_MAPKEY: Record<string, Zone> = {
  AT: { id: 1, name: 'Austria' },
  BE: { id: 2, name: 'Belgium' },
  BG: { id: 3, name: 'Bulgaria' },
  CH: { id: 4, name: 'Switzerland' },
  CZ: { id: 5, name: 'Czech Republic' },
  SK: { id: 6, name: 'Slovakia' },
  DE: { id: 7, name: 'Germany-Luxembourg' },
  LU: { id: 7, name: 'Germany-Luxembourg' },
  EE: { id: 8, name: 'Estonia' },
  ES: { id: 9, name: 'Spain' },
  FI: { id: 10, name: 'Finland' },
  FR: { id: 11, name: 'France' },
  'FR-COR': { id: 11, name: 'France' },
  GR: { id: 12, name: 'Greece' },
  HR: { id: 13, name: 'Croatia' },
  HU: { id: 14, name: 'Hungary' },
  LT: { id: 15, name: 'Lithuania' },
  LV: { id: 16, name: 'Latvia' },
  NL: { id: 17, name: 'Netherlands' },
  PL: { id: 18, name: 'Poland' },
  PT: { id: 19, name: 'Portugal' },
  RO: { id: 20, name: 'Romania' },
  SI: { id: 21, name: 'Slovenia' },
  'SE-SE1': { id: 22, name: 'Sweden SE1' },
  'SE-SE2': { id: 23, name: 'Sweden SE2' },
  'SE-SE3': { id: 24, name: 'Sweden SE3' },
  'SE-SE4': { id: 25, name: 'Sweden SE4' },
  'NO-NO1': { id: 26, name: 'Norway NO1' },
  'NO-NO2': { id: 27, name: 'Norway NO2' },
  'NO-NO3': { id: 28, name: 'Norway NO3' },
  'NO-NO4': { id: 29, name: 'Norway NO4' },
  'NO-NO5': { id: 30, name: 'Norway NO5' },
  'DK-DK1': { id: 31, name: 'Denmark DK1' },
  'DK-DK2': { id: 32, name: 'Denmark DK2' },
  'IT-NO': { id: 33, name: 'Italy North' },
  'IT-CNO': { id: 34, name: 'Italy Centre-North' },
  'IT-CSO': { id: 35, name: 'Italy Centre-South' },
  'IT-SO': { id: 36, name: 'Italy South' },
  'IT-SAR': { id: 37, name: 'Italy Sardinia' },
  'IT-SIC': { id: 38, name: 'Italy Sicily' },
  'IT-CAL': { id: 41, name: 'Italy Calabria' },
  // Western Balkans + all-island Ireland (SEM), added when support was extended.
  AL: { id: 44, name: 'Albania' },
  ME: { id: 45, name: 'Montenegro' },
  XK: { id: 46, name: 'Kosovo' },
  MK: { id: 47, name: 'North Macedonia' },
  RS: { id: 48, name: 'Serbia' },
  // The IE polygon covers the whole island (Republic + Northern Ireland) — one all-island SEM zone.
  IE: { id: 49, name: 'Ireland (SEM)' },
};

/** Reverse lookup: zone id → zone. */
export const ZONE_BY_ID: Record<number, Zone> = Object.values(ZONE_BY_MAPKEY).reduce(
  (acc, z) => {
    acc[z.id] = z;
    return acc;
  },
  {} as Record<number, Zone>,
);
