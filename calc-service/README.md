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
