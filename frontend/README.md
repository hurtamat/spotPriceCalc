# SpotSteer, frontend

React + TypeScript + Vite. The marketing site and the two device setup flows.

## Design system

Dark-first, and dark only. The tokens live at the top of `src/styles/spotsteer.css` and are authored
on `:root` rather than inside a `prefers-color-scheme` block, because dark is the product's theme and
not a variant of a light one. Every route reads the same tokens, so nothing can flip theme mid-scroll.

- **Brand colours come from `public/spotsteer-mark.svg` verbatim**: the dial ring `#1B7EA6`
  (`--color-brand`) and the marker dot `#E8952B` (`--color-warm`). Neither is ever redefined.
  `--color-accent` is a lifted tint of the ring, used for text and small UI, because the ring itself
  does not clear WCAG AA on the dark ground.
- **Type is Space Grotesk**, taken from the logotype, plus JetBrains Mono for numerals. Both are
  self-hosted variable fonts in `public/fonts/` (one file per subset covers every weight), so the
  first paint owes nothing to fonts.googleapis.com. Only the Material Symbols icon font is still
  loaded from Google, trimmed to the eight glyphs actually used.
- **Two scales, no free values.** Radii are `--r-xs/sm/md/lg/pill`; elevation is `--e-1/2/3`,
  tinted to the ground rather than pure black.
- **The mark is a system, not just a logo.** A dial with one point marked: hollow teal nodes on the
  how-it-works rail with the last one filled amber, and the selected map zone as the one warm shape
  on an otherwise teal map.
- Legacy `--color-accent-100..900`, `--color-neutral-*` and `--color-pop*` names are kept as aliases
  resolving into the new system, so the older sub-page styles do not point at colours that no longer
  exist.

The brand lockup is rebuilt in HTML (`BrandMark.tsx` plus two spans) rather than dropped in as
`spotsteer-logo.svg`, so the wordmark renders in the real webfont; fonts do not load inside an
`<img>`-embedded SVG. `spotsteer-logo-light.svg` exists for external use on dark grounds and differs
from the original only in the text fill.

## Routes

Path check in `App.tsx`, no router dependency. nginx has the SPA fallback so these work in
production too.

| Path | What it is |
| --- | --- |
| `/` | Landing page |
| `/savings` | Savings estimator and the per-appliance breakdown |
| `/shelly` | Shelly setup wizard |
| `/home-assistant` | Home Assistant setup guide |
| `/privacy`, `/terms` | Termly documents rendered through `src/api/legal.ts` |

## What's wired up

- **Interactive zone map.** An SVG map of European bidding zones built at build time from one GeoJSON
  file per zone in `src/map/zones/`, no map library. Clicking a zone drives the price chart.
  `src/api/zones.ts` maps each GeoJSON zone to our backend bidding-zone id. Selectable zones clear
  3:1 against the page ground so they read as controls; the selected one is the brand amber.
- **Price chart.** Calls `GET /api/spotprices?biddingZoneId=…&from=…&to=…` and shows the day-ahead
  curve for yesterday / today / tomorrow. Zone comes from the map (desktop defaults to
  Germany-Luxembourg, id 7); results are cached per zone and day. The curve is sliced and labelled in
  the zone's own local time, not the viewer's and not CET, and the offset is printed under the chart.
  Cheap / average / expensive are the brand's temperature pair rather than a red-green traffic light,
  which is also the safer pair for colour blindness.
- **Mobile price section.** A two-panel slider (chart and map): nothing preselected, tap a zone to
  slide to the graph, use the handle or swipe to slide back.
- **Savings teaser to `/savings`.** The estimator and the appliance cards used to sit on the landing
  page. They answer "what is this worth to me", which is not the first question, so they moved behind
  a teaser. `SavingsPage` seeds the selection store itself, since there is no map on that page to
  feed it.
- **Shelly setup wizard** (`/shelly`). Asks the browser for coordinates, resolves the zone with
  `GET /api/zones/resolve`, and fills the answers into the minified device scripts from
  `../scripts/shelly/dist/*.js` (imported `?raw`). See `src/shelly/generate.ts` and
  [`../scripts/shelly/README.md`](../scripts/shelly/README.md). The wizard's colour legend keeps
  green / amber / red on purpose: those are the literal LED values `priceColor.js` writes to the plug,
  so the legend has to match the hardware rather than the brand.
- **Scroll reveal.** `useScrollReveal` fades each `<section>` in as it scrolls into view, site-wide.
  The hiding class is applied by the effect and never in markup, so content stays visible if the
  effect never runs. The hero is excluded because it has its own entry animation. Everything is gated
  behind `prefers-reduced-motion`.
- **No waitlist or email capture**, deliberately. There is no signup form anywhere.

## Known gaps

- `planAppliance` in `IndividualSavings.tsx` is a `TODO(math)` stub, so every appliance card on
  `/savings` shows a pending line instead of a start time and a saving.
- `public/assets/backdrop.png` is 640x256 and upscales about 2.25x in the hero. A wider re-export as
  WebP or AVIF would sharpen it and cut the 327KB.
- The legal documents in `public/legal/` still carry the pre-rebrand `SpotPriceBuddy` name. They are
  generated Termly output and have to be regenerated there, not edited here.
- `CONTACT_EMAIL` in `ContactDialog.tsx` is still a placeholder address.
- The bundle is ~1.3MB (448KB gzip), almost entirely MUI X Charts.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
```

The chart needs the backend running. Start the .NET API on its **`http` profile** so the browser can
reach it over plain HTTP (`http://localhost:5262`):

- CORS for `localhost:5173` is already allowed in `Program.cs`.
- If nothing shows in the chart, the DB probably isn't populated yet. `PriceDataScheduler` populates
  on startup, so restart the API and watch its log. There is no manual populate endpoint any more.

Override the API URL by copying `.env.example` to `.env` (or `.env.local`) and setting
`VITE_API_BASE_URL`.

**`VITE_DEVICE_API_BASE_URL` is separate and matters for the Shelly wizard.** It is baked into the
generated device script, so it is read by the *Shelly*, not the browser. During local testing that has
to be this machine's LAN address, because a Shelly's `localhost` is itself. Generation refuses
outright on a loopback address rather than handing someone a script that cannot work. In production
both are the same URL.

Vite reads env files only at startup, so restart the dev server after changing one.

## Structure

```
public/
├─ fonts/                   self-hosted Space Grotesk + JetBrains Mono (OFL, licence included)
├─ assets/backdrop.png      hero photograph
├─ spotsteer-mark.svg       the mark on its own
├─ spotsteer-logo.svg       full lockup, dark text, for light grounds
├─ spotsteer-logo-light.svg full lockup, light text, for dark grounds
├─ legal/*.html             Termly documents
├─ robots.txt, sitemap.xml
src/
├─ api/spotPrices.ts        price API client + date helpers
├─ api/zones.ts             GeoJSON zone name to bidding-zone id, plus the /api/zones fetchers
├─ api/legal.ts             loads and sanitises the Termly legal documents
├─ shelly/generate.ts       fills the wizard's answers into the minified device scripts
├─ state/selectionStore.ts  one-way broadcast of the picked zone and day
├─ hooks/useScrollReveal.ts scroll-in effect, mounted once in App
├─ map/zones/*.geojson      one shape per zone (glob-imported into ZoneMap)
├─ styles/spotsteer.css     design tokens + all component styles
├─ styles/muiTheme.ts       MUI palette mirroring the tokens (MUI cannot read CSS variables)
├─ components/              one file per section (Nav, Hero, PriceSection, ZoneMap, …)
└─ App.tsx                  routing + page composition
```
