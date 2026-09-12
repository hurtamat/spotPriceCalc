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

    pandas_list = pd.Series([p.eur_per_mwh for p in ordered])
    ma = pandas_list.rolling(MA_WINDOW, min_periods=1).mean()

    residuals = pandas_list - ma

    lower_quantile = np.quantile(residuals, ALPHA)
    upper_quantile = np.quantile(residuals, 1 - ALPHA)
    level = ma.iloc[-1]

    return PriceZonesResponse(
        lower_quantile=round(level + lower_quantile, 2),
        upper_quantile=round(level + upper_quantile, 2),
    )
