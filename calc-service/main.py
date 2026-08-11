from datetime import date, datetime

import pandas as pd
from fastapi import FastAPI
from pydantic import Field

import price_zones
from wire import WireModel as _WireModel

app = FastAPI()

# Cheap/medium/expensive thresholds over a bare price list (7 days, a year — same route).
app.include_router(price_zones.router)


class PricePoint(_WireModel):
    # "from"/"to" span implies the resolution (hourly vs 15-min).
    frm: datetime = Field(alias="from")
    to: datetime
    eur_per_mwh: float


class WeatherPoint(_WireModel):
    time_utc: datetime
    temperature_c: float


class ScheduleRequest(_WireModel):
    bidding_zone_id: int
    date_from: date = Field(alias="from")
    date_to: date | None = Field(default=None)  # None => single day (== date_from)
    prices: list[PricePoint]
    weather: list[WeatherPoint]


# --- Helper Functions ---

def zone_flags(value: float, low: float, high: float) -> dict:
    return {
        "green": bool(value < low),
        "yellow": bool(low <= value <= high),
        "red": bool(value > high),
    }


def best_window(df: pd.DataFrame, window_size: int, low_q: float, high_q: float, col_name: str) -> dict:
    rolling_mean = df[col_name].rolling(window_size).mean()

    # Index position of the lowest rolling average
    best_end_pos = int(rolling_mean.argmin())
    best_start_pos = best_end_pos - window_size + 1

    window = df.iloc[best_start_pos: best_end_pos + 1]
    best_avg = float(rolling_mean.iloc[best_end_pos])

    return {
        "from": window.iloc[0]["from"],
        "to": window.iloc[-1]["to"],
        "average_price": round(best_avg, 2),
        "price_dif": round(float(rolling_mean.max() - rolling_mean.min()), 2),
        "zones": zone_flags(best_avg, low_q, high_q),
        "zone_values": {
            "green": bool(window["greenZone"].all()),
            "yellow": bool(window["yellowZone"].all()),
            "red": bool(window["redZone"].all()),
        },
    }


# --- API Routes ---

@app.get("/")
def health():
    return {"status": "ok"}


@app.post("/schedule")
def schedule(req: ScheduleRequest):
    # 1. Convert validated Pydantic model to a dict, keeping the camelCase aliases (eurPerMwh, etc.)
    data = req.model_dump(by_alias=True)
    date_to = req.date_to or req.date_from

    # 2. Load JSON data into DataFrame
    prices_df = pd.DataFrame(data["prices"])

    # The Pydantic model maps `eur_per_mwh` -> `eurPerMwh` when dumped with by_alias=True
    col = "eurPerMwh"

    # Datetimes are already parsed by Pydantic, but converting them to Pandas datetime for safety
    prices_df["from_dt"] = pd.to_datetime(prices_df["from"], utc=True)
    prices_df["to_dt"] = pd.to_datetime(prices_df["to"], utc=True)

    # 3. Calculate Quantiles & Zones
    alpha = 0.3
    lower_q = float(prices_df[col].quantile(alpha))
    upper_q = float(prices_df[col].quantile(1 - alpha))

    prices_df["greenZone"] = prices_df[col] < lower_q
    prices_df["yellowZone"] = prices_df[col].between(lower_q, upper_q, inclusive="both")
    prices_df["redZone"] = prices_df[col] > upper_q

    # 4. Generate activities dict
    activities = {
        "ironing": best_window(prices_df, 4, lower_q, upper_q, col),  # 1 hour (4x15m)
        "dryer": best_window(prices_df, 6, lower_q, upper_q, col),  # 90 mins (6x15m)
        "water_boiler": best_window(prices_df, 6, lower_q, upper_q, col),  # 90 mins (6x15m)
        "washing_machine": best_window(prices_df, 8, lower_q, upper_q, col),  # 2 hours (8x15m)
    }

    # 5. Format updated prices back to standard dictionary list
    updated_prices = []
    for _, row in prices_df.iterrows():
        updated_prices.append({
            "from": row["from"],
            "to": row["to"],
            "eurPerMwh": row["eurPerMwh"],
            "zones": {
                "green": bool(row["greenZone"]),
                "yellow": bool(row["yellowZone"]),
                "red": bool(row["redZone"]),
            }
        })

    # 6. Combine all data into final output JSON format
    output_json = {
        "biddingZoneId": req.bidding_zone_id,
        "from": req.date_from,
        "dateTo": date_to,
        "quantiles": {
            "lower_quantile": round(lower_q, 2),
            "upper_quantile": round(upper_q, 2),
        },
        "activities": activities,
        "prices": updated_prices,
        "weather": data.get("weather", []),
    }

    # FastAPI will automatically serialize this dictionary (and the inner datetime objects) into JSON
    return output_json
