# Energy Optimization Site — Architecture Summary
 
**Scope for now:** Build the web app and the price-aggregation / calculation engine. Physical switch integration is a later enhancement.
 
## Stack
 
- **Frontend:** React
- **API / orchestration:** C# .NET — serves the app, exposes the REST API, and runs a daily background job to fetch day-ahead prices.
- **Calc service:** Python as a persistent **FastAPI** service (not a shelled-out script), called by .NET over HTTP with an agreed JSON contract. The Python teammate owns this end to end and can iterate on the algorithm independently.
- **Persistence:** Lightweight **Postgres from day one** as source of truth (prices, weather snapshots, later users / devices), with **`IMemoryCache`** in .NET layered on top for the hot path.
- **Deployment:** Two containers (.NET + FastAPI) composed together, via the existing Docker / CI-CD setup.
## Data flow
 
1. Once per day, fetch day-ahead prices → store in Postgres → warm the memory cache.
2. Compute the shared, zone-wide part (ranking cheapest hours from the price curve) once when prices land; cache it.
3. Per user visit, do only the cheap per-user part (fit their pool size, target temp, and available hours into those ranked hours). Weather is cached per location with a short TTL, not fetched on every page load.
## Key decisions / corrections from the original plan
 
- **DB, yes** — reframed as "what state must survive a restart + what history do you want." Price history is useful for trends and backtesting, and persistence is needed the moment accounts / configs / switches arrive.
- **Don't shell out to Python per request** — cold-start + library imports kill it. Persistent FastAPI service instead.
- **Don't recalc everything per visit** — separate shared (zone) work from per-user work.
## Data source caveat
 
EPEX SPOT's own feed is typically licensed / paid for retail use. Free alternatives for bidding-zone day-ahead prices:
 
- **ENTSO-E Transparency Platform** (token required)
- **OTE** (CZ) domestic publication
- **OKTE** (SK) domestic publication
Verify current terms before building the fetcher.
 
## Algorithm note
 
Pool heating isn't just "run during the cheapest hours" — heat loss is nonlinear (ambient temp, wind, cover) with comfort constraints. That thermal-scheduling problem is what justifies the Python scientific stack; make sure the shipped version isn't just naive price-ranking, or it won't beat the rigid software being competed against.
