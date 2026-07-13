# Energy Optimization Site — Architecture Summary
 
**Scope for now:** Build the web app and the price-aggregation / calculation engine. Physical switch integration is a later enhancement.

## Running locally

Three services run at the same time, one terminal each. Start them in any order.

| Service      | Directory      | Command                          | URL                     |
| ------------ | -------------- | -------------------------------- | ----------------------- |
| .NET API     | `spotPriceCalc/` | `dotnet run`                   | http://localhost:5262   |
| Calc service | `calc-service/`  | `source .venv/bin/activate` then `fastapi dev main.py` | http://localhost:8000 (docs at `/docs`) |
| Frontend     | `frontend/`      | `npm run dev`                  | http://localhost:5173   |

**.NET API** (or just hit Run in Rider):
```bash
cd spotPriceCalc
dotnet run
```

**Calc service** (Python / FastAPI — activate the venv first, only in this terminal):
```bash
cd calc-service
source .venv/bin/activate      # prompt shows (.venv); `deactivate` to exit
fastapi dev main.py
```
First-time setup (only if `.venv` is missing, e.g. fresh clone):
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

**Frontend** (React / Vite):
```bash
cd frontend
npm install                    # first time / after a fresh clone only
npm run dev
```

The Vite dev server proxies `/api` calls to the .NET API on port **5262** — set that in `frontend/vite.config.ts`.
 
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
