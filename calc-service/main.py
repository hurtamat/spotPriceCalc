from datetime import date, datetime

import pandas as pd
from fastapi import FastAPI
from pydantic import Field

import price_zones
from wire import WireModel as _WireModel

app = FastAPI()

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
    date_to: date | None = Field(default=None)  # None means a single day
    prices: list[PricePoint]
    weather: list[WeatherPoint]


# --- Helper Functions ---

def zone_flags(residual_value: float, low: float, high: float) -> dict:
    return {
        "green": bool(residual_value < low),
        "yellow": bool(low <= residual_value <= high),
        "red": bool(residual_value > high),
    }


def best_window(df: pd.DataFrame, window_size: int, low_q: float, high_q: float, col_name: str) -> dict:
    rolling_mean = df[col_name].rolling(window_size).mean()
    rolling_residual = df["residual"].rolling(window_size).mean()

    # Index position of the lowest rolling average
    best_end_pos = int(rolling_mean.argmin())
    best_start_pos = best_end_pos - window_size + 1

    window = df.iloc[best_start_pos: best_end_pos + 1]
    best_avg = float(rolling_mean.iloc[best_end_pos])
    best_residual_avg = float(rolling_residual.iloc[best_end_pos])

    return {
        "from": window.iloc[0]["from"],
        "to": window.iloc[-1]["to"],
        "average_price": round(best_avg, 2),
        "price_dif": round(float(rolling_mean.max() - rolling_mean.min()), 2),
        "zones": zone_flags(best_residual_avg, low_q, high_q),
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
    data = req.model_dump(by_alias=True)
    date_to = req.date_to or req.date_from

    prices_df = pd.DataFrame(data["prices"])
    col = "eurPerMwh"

    prices_df["from_dt"] = pd.to_datetime(prices_df["from"], utc=True)
    prices_df["to_dt"] = pd.to_datetime(prices_df["to"], utc=True)

    # 672 periods = 7 days at 15 min intervals; min_periods=1 avoids NaNs on shorter payloads
    prices_df['moving_average'] = prices_df[col].rolling(window=672, min_periods=1).mean()
    prices_df['residual'] = prices_df[col] - prices_df['moving_average']

    alpha = 0.3
    lower_q = float(prices_df['residual'].quantile(alpha))
    upper_q = float(prices_df['residual'].quantile(1 - alpha))

    prices_df["greenZone"] = prices_df['residual'] < lower_q
    prices_df["yellowZone"] = prices_df['residual'].between(lower_q, upper_q, inclusive="both")
    prices_df["redZone"] = prices_df['residual'] > upper_q

    activities = {
        "ironing": best_window(prices_df, 4, lower_q, upper_q, col),  # 1 hour (4x15m)
        "dryer": best_window(prices_df, 6, lower_q, upper_q, col),  # 90 mins (6x15m)
        "water_boiler": best_window(prices_df, 6, lower_q, upper_q, col),  # 90 mins (6x15m)
        "washing_machine": best_window(prices_df, 8, lower_q, upper_q, col),  # 2 hours (8x15m)
    }

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

    return output_json
