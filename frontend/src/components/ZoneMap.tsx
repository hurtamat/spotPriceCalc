import { useMemo } from 'react';
import { ZONE_BY_MAPKEY, type Zone } from '../api/zones';

// Interactive bidding-zone map. The map is assembled at BUILD TIME from one GeoJSON file
// per zone in src/map/zones/*.geojson (Vite glob-imports them — no runtime fetch, no extra
// HTTP requests). Add or remove a zone by dropping/deleting a file in that folder.
// Geometry is projected with a small hand-rolled Web-Mercator (no map library) and rendered
// as one clickable <path> per zone. Zones present in ZONE_BY_MAPKEY are selectable and drive
// the price chart; the rest render as faint, non-interactive context (Balkans, British Isles…).

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
  selectedZoneId: number;
  onSelect: (zoneId: number) => void;
}) {
  // Project once: fit the mercator bounds of all zone features into the viewBox.
  const shapes = useMemo<Shape[]>(() => {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    const projected = FEATURES.map((f) => {
      const rings = ringsOf(f).map((ring) =>
        ring.map(([lon, lat]) => {
          const [x, y] = mercator(lon, lat);
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
          return [x, y] as [number, number];
        }),
      );
      return { zoneName: f.properties.zoneName, rings };
    });

    const scale = Math.min((W - PAD * 2) / (maxX - minX), (H - PAD * 2) / (maxY - minY));
    const offX = PAD + (W - PAD * 2 - (maxX - minX) * scale) / 2;
    const offY = PAD + (H - PAD * 2 - (maxY - minY) * scale) / 2;
    const tx = (x: number) => (x - minX) * scale + offX;
    const ty = (y: number) => (maxY - y) * scale + offY; // flip: mercator y grows north

    return projected.map(({ zoneName, rings }) => {
      const d = rings
        .map(
          (ring) =>
            'M' +
            ring.map(([x, y]) => `${tx(x).toFixed(1)} ${ty(y).toFixed(1)}`).join('L') +
            'Z',
        )
        .join(' ');
      return { zoneName, zone: ZONE_BY_MAPKEY[zoneName], d };
    });
  }, []);

  return (
    <svg className="sb-zonemap" viewBox={`0 0 ${W} ${H}`} role="group" aria-label="Bidding zone map">
      {/* Context zones first (non-selectable), selectable on top so borders read cleanly. */}
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
