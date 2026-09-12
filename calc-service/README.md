# calc-service (FastAPI)

The statistics engine. The .NET API hands it a trailing window of real prices;
this service returns the cut-offs that split them into cheap/normal/expensive.
Scheduling itself lives in .NET (`ScheduleService`). **.NET is the only caller** — it owns fetching data;
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

> **Status: implemented.** Cut-offs are de-trended, not plain quantiles of the raw
> prices — see *How the cut-offs are derived* below.

The body is a **JSON array of price points** — each one a slot's span and its price:

```json
[
  { "fromUtc": "2026-07-24T00:00:00Z", "toUtc": "2026-07-24T00:15:00Z", "eurPerMwh": 155.26 },
  { "fromUtc": "2026-07-24T00:15:00Z", "toUtc": "2026-07-24T00:30:00Z", "eurPerMwh": 148.90 }
]
```

The span is the only thing that says hourly or 15-min, so there is no resolution field, and a payload may mix
both. The service **sorts by `fromUtc`** before doing anything: the moving baseline is order-dependent, unlike
plain quantiles, and now that every point carries its own timestamp that no longer rests on the caller's
`ORDER BY`. Only `eurPerMwh` feeds the maths today — the timestamps are carried so this endpoint can start
weighting slots by length without another contract change.

**Extra fields are ignored.** .NET reuses one `PricePointDto` for its own API and for this call, so a real
payload also carries `ctPerKwh` and `quantile`; pydantic drops what the model doesn't declare. Don't start
reading `quantile` here — on the day being classified it is `null`, which is the whole reason for the call.

The caller sends a trailing window (7 days today) and stamps only the **last day**
of it. That is why one pair of numbers is enough: it only has to be correct for
the day being classified, and the next day gets a fresh pair from its own window.

Back come the two **cut-off prices** in EUR/MWh:

```json
{ "lowerQuantile": 62.04, "upperQuantile": 99.68 }
```

Below `lowerQuantile` is cheap (green), above `upperQuantile` is expensive (red),
between them is medium (yellow). With those two numbers the caller colours any
slot locally, including tomorrow's prices that were never in the sample.

**The colours are informative only.** They drive the chart so a user can see the
shape of a day. Nothing switches on them — device scheduling picks the cheapest
hours directly, because the appliance has to run either way.

### How the cut-offs are derived

Plain quantiles over the raw window make a day that is expensive *relative to the
preceding week* come back with zero cheap hours: the week's cheaper prices swamp
it, even though that day still has hours worth waiting for. So instead:

1. `baseline` = rolling mean over `MA_WINDOW` (672 = 7 days), `min_periods=1`
   so a short or still-backfilling window yields a real number instead of NaN.
2. `residuals` = each price minus that baseline — how unusual it is for its moment.
3. Take `ALPHA` of the residuals, then **add
   `baseline.iloc[-1]` back**, so what goes out is two absolute EUR/MWh prices the
   caller can compare raw prices against.

Step 3 is what keeps the wire contract two plain numbers:
`SpotPriceRepository.SetQuantilesAsync` does `row.Price < lower`, so residuals
centred on zero would stamp every slot red.

- **These are prices, not the 0..1 fractions.** Where the cut-offs sit in the
  residual distribution is fixed in `ALPHA` (0.3 / 0.7)
  — a product decision, deliberately not a request parameter.
- **`MA_WINDOW` is a tuning knob.** At 672 it equals the whole window .NET
  sends, so the baseline is effectively the window's running mean and adapts
  slowly. A shorter baseline (2 days = 192) tracks the recent level more tightly.
- **Negative prices are fine** — normal in Central European zones, and quantiles
  handle them without special-casing.
- **An empty list is a `422`**, not a 500.
- The .NET side refuses ranges with fewer than 12 stored prices
  (`SpotPriceService.MinQuantileSamples`) — quantiles over a near-empty sample are
  noise.

**Caveat — equal slot durations.** Quantiles are unweighted, so every value counts
once regardless of how long its slot lasted, even though each point now states its
own span. Correct within one zone at one
resolution, but a range straddling a PT60M→PT15M switchover would weight an hour
the same as 15 minutes. The .NET side sends a single zone/range, which holds
today; revisit if you ever backfill across a resolution change.

**Caveat — a year is not one distribution.** January and July have genuinely
different price levels. De-trending is what addresses this: the baseline follows
the seasonal level, so residuals stay comparable across the year rather than
labelling one whole season expensive. Note this only holds while the window is
meaningfully longer than `MA_WINDOW` — at today's 7-day window and 672-slot
baseline the two are equal, so there is little trend left to remove.

## The .NET ↔ FastAPI contract

Keep both ends in sync with these conventions:

- **Endpoint** — `POST /price-zones`, one call per (zone, trailing window).
- **JSON casing** — camelCase on the wire (`biddingZoneId`, `eurPerMwh`, …).
  Python fields stay snake_case; `Field(alias=...)` / `to_camel` bridge the two,
  and `populate_by_name` lets either spelling deserialize. The shared price-point
  model lives in `wire.py` (`fromUtc` / `toUtc` / `eurPerMwh`).
- **Timestamps** — UTC, ISO-8601 (e.g. `2026-07-24T02:00:00Z`). Postgres emits
  `+00:00` instead of `Z`; both are valid UTC and parse fine.
- **Units** — price = EUR/MWh, temperature = °C.
- **Time resolution** — *not* a field. It's implied by each price point's own
  `from`→`to` span (PT60M ⇒ hourly, PT15M ⇒ 15-min), decided per bidding zone
  upstream. Always send both `fromUtc` and `toUtc` on every price point.
- **Device config** — intentionally **not** sent yet. Added later.

### Request shape

A bare array of price points — the trailing window, any resolution, any order
(the service sorts by `fromUtc`).

```json
[
  { "fromUtc": "2026-07-24T00:00:00Z", "toUtc": "2026-07-24T00:15:00Z", "eurPerMwh": 155.26 }
]
```

### Response shape

```json
{ "lowerQuantile": -12.4, "upperQuantile": 18.9 }
```

Cut-offs in EUR/MWh on the price *residual*: below `lowerQuantile` is cheap,
above `upperQuantile` is expensive, between them is normal.
