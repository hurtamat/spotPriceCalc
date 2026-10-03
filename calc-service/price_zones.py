import numpy as np
import pandas as pd
from fastapi import APIRouter, HTTPException

from wire import PricePoint, WireModel

router = APIRouter(tags=["price-zones"])

MA_WINDOW = 7 * 24 * 4

# cutoff
ALPHA = 0.3


class PriceZonesResponse(WireModel):
    # Threshold prices in EUR/MWh: below lower = cheap, above upper = expensive.
    lower_quantile: float
    upper_quantile: float


@router.post("/price-zones", response_model=PriceZonesResponse)
def price_zones(prices: list[PricePoint]) -> PriceZonesResponse:
    if not prices:
        raise HTTPException(status_code=422, detail="prices must not be empty")

    ordered = sorted(prices, key=lambda p: p.from_utc)

    times = [p.from_utc for p in ordered]                                      # new
    prices_list = [p.eur_per_mwh for p in ordered]                             # new

    time_series = pd.Series(data=prices_list, index=times)                     # new

    # '7D' means 7 Days. Pandas will calculate the average of all rows
    # that fall within exactly 7 days of the current row's timestamp.
    ma = time_series.rolling('7D', min_periods=1).mean()                       # new
    
    # pandas_list = pd.Series([p.eur_per_mwh for p in ordered])                # old
    # ma = pandas_list.rolling(MA_WINDOW, min_periods=1).mean()                # old

    residuals = time_series - ma

    lower_quantile = np.quantile(residuals, ALPHA)
    upper_quantile = np.quantile(residuals, 1 - ALPHA)
    level = ma.iloc[-1]

    return PriceZonesResponse(
        lower_quantile=round(level + lower_quantile, 2),
        upper_quantile=round(level + upper_quantile, 2),
    )
