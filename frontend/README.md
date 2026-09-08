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
- **Shelly setup wizard** (`/shelly`) — asks the browser for coordinates, resolves the zone with
  `GET /api/zones/resolve`, and fills the answers into the minified device scripts from
  `../scripts/shelly/dist/*.js` (imported `?raw`). See `src/shelly/generate.ts` and
  [`../scripts/shelly/README.md`](../scripts/shelly/README.md).
- **Home Assistant guide** (`/home-assistant`) and the **legal documents** (`/privacy`, `/terms`),
  which render `public/legal/*.html` through `src/api/legal.ts`. Routing is a path check in `App.tsx`
  — no router dependency — and nginx has the SPA fallback so the paths work in production too.
- **Scroll reveal** — `useScrollReveal` fades each `<section>` in as it scrolls into view, site-wide.
  The hiding class is applied by the effect, never in markup, so content stays visible if it never runs.
- **Savings estimator, FAQ** — static / local-only. Placeholders to be wired up later.
- **No waitlist / email capture** — deliberately removed. Every CTA on the page is an anchor into
  the `#prices` section; there is no signup form anywhere.

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

Override the API URL by copying `.env.example` to `.env` (or `.env.local`) and setting `VITE_API_BASE_URL`.

**`VITE_DEVICE_API_BASE_URL` is separate and matters for the Shelly wizard.** It is baked into the
generated device script, so it is read by the *Shelly*, not the browser — during local testing that has to
be this machine's LAN address, because a Shelly's `localhost` is itself. Generation refuses outright on a
loopback address rather than handing someone a script that cannot work. In production both are the same URL.

Vite reads env files only at startup, so restart the dev server after changing one.

## Structure

```
src/
├─ api/spotPrices.ts        price API client + date helpers
├─ api/zones.ts             GeoJSON zone name → bidding-zone id, plus the /api/zones fetchers
├─ api/legal.ts             loads and sanitises the Termly legal documents
├─ shelly/generate.ts       fills the wizard's answers into the minified device scripts
├─ hooks/useScrollReveal.ts scroll-in effect, mounted once in App
├─ map/zones/*.geojson      one shape per zone (glob-imported into ZoneMap)
├─ styles/spotbuddy.css     design tokens + all component styles
├─ components/              one file per section (Nav, Hero, PriceSection, ZoneMap, …)
└─ App.tsx                  page composition
```
