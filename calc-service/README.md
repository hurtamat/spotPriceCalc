# calc-service (FastAPI)

The scheduling/optimization engine. The .NET API calls this service once per
(zone, day range) with real prices + weather; this service computes an on/off
schedule and returns it. **.NET is the only caller** — it owns fetching data;
this service is a pure function over the data it's handed (no DB, no upstream
API calls of its own), which keeps it easy to unit-test and backtest.

## Run it

**Windows (PowerShell)** — from the `calc-service` folder:

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
fastapi dev main.py
```

If PowerShell blocks activation, use CMD (`.venv\Scripts\activate.bat`) or run
once: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.

**Linux / macOS**:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
fastapi dev main.py
```

- Needs **Python 3.10+** (`main.py` uses `date | None` union syntax).
- Build your **own** `.venv` — it's gitignored, not shared. Don't commit it.
- Service listens on **http://localhost:8000**. Interactive docs at **/docs**.

## Testing

Four real payloads (2026-07-24, full 15-min day, straight from the DB) sit next
to this README:

| Country | Zone id | File |
| --- | --- | --- |
| Slovakia | 6 | `sample-request-sk-2026-07-24.json` |
| Germany-Luxembourg | 7 | `sample-request-de-2026-07-24.json` |
| Spain | 9 | `sample-request-es-2026-07-24.json` |
| Italy North | 33 | `sample-request-it-north-2026-07-24.json` |

Open `calc-service.http` in Rider/VS Code and click **Run** on any request, or
try them at http://localhost:8000/docs.

**What it returns now:** `200 OK` with `{}` — the request is validated and all
price points are parsed, but the response shape (on/off windows + cost/saving
estimates) is not defined yet. That's the part to build. A `200` with `{}` means
the contract works end-to-end and your input parsed correctly.

## `POST /price-zones` — cheap / medium / expensive cut-offs

Lives in **`price_zones.py`** (`main.py` only mounts the router). Shared Pydantic
base config is in `wire.py`.

> **Status: contract done, maths is a stub.** The handler parses the prices into a
> `pandas.Series` and then returns **placeholder numbers**. A `200` means your input
> parsed and the contract works end-to-end — it does *not* mean the thresholds are
> real. Implementing the quantiles is the open task; the `price_zones()` docstring
> has the pandas calls to write.

Quantiles are order-independent, so the body is a **bare JSON array of prices** —
no timestamps, no resolution, no metadata. One route serves both cases: send
7 days of values for short-term colours, or a year for long-term context. Only
the length of the list changes.

```json
[155.26, 148.9, 132.0, 121.44, 118.02, 110.35, 104.88, 99.1]
```

Back come the two **cut-off prices** in EUR/MWh:

```json
{ "lowerQuantile": 62.04, "upperQuantile": 99.68 }
```

Below `lowerQuantile` is cheap (green), above `upperQuantile` is expensive (red),
between them is medium (yellow). With those two numbers the caller colours any
slot locally, including tomorrow's prices that were never in the sample.

- **These are prices, not the 0..1 fractions.** Where the cut-offs sit in the
  distribution is fixed in `LOWER_QUANTILE` / `UPPER_QUANTILE` (0.3 / 0.7) — a
  product decision, deliberately not a request parameter.
- **Negative prices are fine** — normal in Central European zones, and quantiles
  handle them without special-casing.
- The .NET side refuses ranges with fewer than 12 stored prices
  (`SpotPriceService.MinZoneSamples`) — quantiles over a near-empty sample are noise.

**Caveat — equal slot durations.** Quantiles are unweighted, so every value counts
once regardless of how long its slot lasted. Correct within one zone at one
resolution, but a range straddling a PT60M→PT15M switchover would weight an hour
the same as 15 minutes. The .NET side sends a single zone/range, which holds
today; revisit if you ever backfill across a resolution change.

**Caveat — a year is not one distribution.** January and July have genuinely
different price levels, so one yearly cut-off will label most of one season
expensive and most of the other cheap. Use the year for context and let the 7-day
cut-offs drive actual switching decisions, or compute per-month.

## The .NET ↔ FastAPI contract

Keep both ends in sync with these conventions:

- **Endpoint** — `POST /schedule`, one call per (zone, day range).
- **JSON casing** — camelCase on the wire (`biddingZoneId`, `eurPerMwh`, …).
  Python fields stay snake_case; `Field(alias=...)` / `to_camel` bridge the two,
  and `populate_by_name` lets either spelling deserialize.
- **Timestamps** — UTC, ISO-8601 (e.g. `2026-07-24T02:00:00Z`). Postgres emits
  `+00:00` instead of `Z`; both are valid UTC and parse fine.
- **`from` / `to`** on the request are calendar **dates**. `from` is required;
  `to` is optional and defaults to `from` (a single day).
- **Units** — price = EUR/MWh, temperature = °C.
- **Time resolution** — *not* a field. It's implied by each price point's own
  `from`→`to` span (PT60M ⇒ hourly, PT15M ⇒ 15-min), decided per bidding zone
  upstream. Always send both `from` and `to` on every price point.
- **Device config** — intentionally **not** sent yet. Added later.

### Request shape

```json
{
  "biddingZoneId": 6,
  "from": "2026-07-24",
  "to": "2026-07-24",
  "prices": [
    { "from": "2026-07-24T00:00:00Z", "to": "2026-07-24T00:15:00Z", "eurPerMwh": 155.26 }
  ],
  "weather": [
    { "timeUtc": "2026-07-24T00:00:00Z", "temperatureC": 14.2 }
  ]
}
```

`weather` may be empty (`[]`) — there's no temperature data yet.

### Response shape

**To be defined** (your part). Likely on/off windows plus cost/saving estimates,
e.g. `windows[]` of `{ from, to, on }`. Currently returns `{}`.
