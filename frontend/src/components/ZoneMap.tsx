import { useMemo } from 'react';
import { ZONE_BY_MAPKEY, type Zone } from '../api/zones';

// Interactive bidding-zone map, assembled at build time from one GeoJSON file per zone
// in src/map/zones/*.geojson. Geometry is projected with a hand-rolled Web-Mercator and
// rendered as one clickable path per zone; zones in ZONE_BY_MAPKEY are selectable.

// Vite bundles every zone file as a raw string at build time; we JSON.parse once below.
const ZONE_FILES = import.meta.glob('../map/zones/*.geojson', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>;

// SVG canvas the projected map is fitted into.
const W = 560;
const H = 620;
const PAD = 12;

// Fixed geographic viewport (degrees lon/lat), covers Ireland to the Caucasus.
const LON0 = -13;
const LON1 = 47;
const LAT0 = 34;
const LAT1 = 71;

type Ring = [number, number][];
interface Feature {
  properties: { zoneName: string };
  geometry: { type: 'Polygon' | 'MultiPolygon'; coordinates: number[][][] | number[][][][] };
}

// Parse the per-zone files into features once, at module load.
const FEATURES: Feature[] = Object.values(ZONE_FILES).map((raw) => JSON.parse(raw) as Feature);

/** Raw Web-Mercator (unscaled). Input [lon, lat] in degrees. */
function mercator(lon: number, lat: number): [number, number] {
  const x = (lon * Math.PI) / 180;
  const y = Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
  return [x, y];
}

/** Pull every polygon ring out of a Polygon/MultiPolygon feature. */
function ringsOf(f: Feature): Ring[] {
  const polys =
    f.geometry.type === 'Polygon'
      ? [f.geometry.coordinates as number[][][]]
      : (f.geometry.coordinates as number[][][][]);
  const rings: Ring[] = [];
  for (const poly of polys) for (const ring of poly) rings.push(ring as Ring);
  return rings;
}

interface Shape {
  zoneName: string;
  zone: Zone | undefined; // present => selectable
  d: string; // SVG path
}

export function ZoneMap({
  selectedZoneId,
  onSelect,
}: {
  selectedZoneId: number | null;
  onSelect: (zoneId: number) => void;
}) {
  // Project once into the fixed viewport with a uniform mercator scale.
  const shapes = useMemo<Shape[]>(() => {
    const [wx0, wy0] = mercator(LON0, LAT0);
    const [wx1, wy1] = mercator(LON1, LAT1);
    const bw = wx1 - wx0;
    const bh = wy1 - wy0;
    const scale = Math.min((W - PAD * 2) / bw, (H - PAD * 2) / bh);
    const offX = PAD + (W - PAD * 2 - bw * scale) / 2;
    const offY = PAD + (H - PAD * 2 - bh * scale) / 2;
    const tx = (x: number) => (x - wx0) * scale + offX;
    const ty = (y: number) => (wy1 - y) * scale + offY; // flip: mercator y grows north

    const project = (ring: Ring) =>
      'M' +
      ring
        .map(([lon, lat]) => {
          const [mx, my] = mercator(lon, lat);
          return `${tx(mx).toFixed(1)} ${ty(my).toFixed(1)}`;
        })
        .join('L') +
      'Z';

    return FEATURES.map((f) => {
      const d = ringsOf(f).map(project).join(' ');
      return { zoneName: f.properties.zoneName, zone: ZONE_BY_MAPKEY[f.properties.zoneName], d };
    });
  }, []);

  return (
    <svg className="sb-zonemap" viewBox={`0 0 ${W} ${H}`} role="group" aria-label="Bidding zone map">
      {/* Context zones first, selectable ones on top so borders read cleanly. */}
      {shapes
        .filter((s) => !s.zone)
        .map((s) => (
          <path key={s.zoneName} d={s.d} className="sb-zone sb-zone-context" />
        ))}
      {shapes
        .filter((s) => s.zone)
        .map((s) => {
          const selected = s.zone!.id === selectedZoneId;
          return (
            <path
              key={s.zoneName}
              d={s.d}
              className="sb-zone sb-zone-pick"
              data-selected={selected}
              onClick={() => onSelect(s.zone!.id)}
              tabIndex={0}
              role="button"
              aria-label={s.zone!.name}
              aria-pressed={selected}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelect(s.zone!.id);
                }
              }}
            >
              <title>{s.zone!.name}</title>
            </path>
          );
        })}
    </svg>
  );
}
