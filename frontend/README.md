# SpotBuddy — frontend

React + TypeScript + Vite landing page for SpotBuddy, ported from the Claude Design
"SpotBuddy v2" export.

## What's wired up

- **Interactive zone map** — an SVG map of European bidding zones, built at build time from one
  GeoJSON file per zone in `src/map/zones/` (no map library). Clicking a zone drives the price chart.
  `src/api/zones.ts` maps each GeoJSON zone → our backend bidding-zone id.
- **Price chart** — calls `GET /api/spotprices?biddingZoneId=…&from=…&to=…` and shows the day-ahead
  curve for **yesterday / today / tomorrow** (tabs). Zone comes from the map (desktop defaults to
  Germany-Luxembourg, id 7); results are cached per zone+day.
- **Mobile** — the price section is a two-panel slider (chart ⇄ map): nothing preselected, tap a zone
  to slide to the graph, use the handle / swipe to slide back.
- **Savings estimator, waitlist forms, FAQ** — static / local-only. Placeholders to be wired up later.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
```

The chart needs the backend running. Start the .NET API on its **`http` profile** so the browser can
reach it over plain HTTP (`http://localhost:5262`):

- CORS for `localhost:5173` is already allowed in `Program.cs`.
- If nothing shows in the chart, the DB probably isn't populated yet —
  `POST http://localhost:5262/api/spotprices/populate?day=today` (and `?day=tomorrow`).

Override the API URL by copying `.env.example` to `.env` and setting `VITE_API_BASE_URL`.

## ⚠️ One image asset still needed

`logo-tuya.png` is larger than the design-import tool's per-file limit, so it couldn't be pulled
automatically. **Export it from the Claude Design project and drop it into `public/assets/`** (the
recolored `assets/` version). The three other logos (Shelly, Aqara, Home Assistant) are already in
place. (The old `europe-zones.png` map image is no longer needed — the map is now a live SVG component.)

## Structure

```
src/
├─ api/spotPrices.ts        price API client + date helpers
├─ api/zones.ts             GeoJSON zone name → backend bidding-zone id
├─ map/zones/*.geojson      one shape per zone (glob-imported into ZoneMap)
├─ styles/spotbuddy.css     design tokens + all component styles
├─ components/              one file per section (Nav, Hero, PriceSection, ZoneMap, …)
└─ App.tsx                  page composition
```
