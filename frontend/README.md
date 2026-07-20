# SpotBuddy — frontend

React + TypeScript + Vite landing page for SpotBuddy, ported from the Claude Design
"SpotBuddy v2" export.

## What's wired up

- **Price chart** — the only live-data part. It calls the .NET API
  `GET /api/spotprices?biddingZoneId=6&from=…&to=…` for **Slovakia (bidding zone id 6)** and shows
  the day-ahead curve for **yesterday / today / tomorrow** (tabs). Zone is hardcoded for now.
- **Savings estimator, waitlist forms, FAQ** — static / local-only. The waitlist buttons and the
  email inputs are placeholders to be wired up later.
- **Map** — a decorative faded background image behind the price section. To be replaced with a real
  interactive component later.

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

## ⚠️ Two image assets still needed

`logo-tuya.png` and `europe-zones.png` (the map) are larger than the design-import tool's per-file
limit, so they couldn't be pulled automatically. **Export those two from the Claude Design project and
drop them into `public/assets/`** (the recolored `assets/` versions, not the raw `uploads/`). The three
other logos (Shelly, Aqara, Home Assistant) are already in place. The code already references the two
missing paths, so they'll appear as soon as the files land.

## Structure

```
src/
├─ api/spotPrices.ts        API client + date helpers (Slovakia = zone 6)
├─ styles/spotbuddy.css     design tokens + all component styles
├─ components/              one file per section (Nav, Hero, PriceSection, …)
└─ App.tsx                  page composition
```
