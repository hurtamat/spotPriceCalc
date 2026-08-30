import pandas as pd
from fastapi import APIRouter, HTTPException
import numpy as np

from wire import WireModel

router = APIRouter(tags=["price-zones"])

MA_WINDOW = 7 * 24 * 4

# cutoff
ALPHA = 0.3


class PriceZonesResponse(WireModel):
    # Threshold prices in EUR/MWh: below lower = cheap, above upper = expensive.
    lower_quantile: float
    upper_quantile: float


@router.post("/price-zones", response_model=PriceZonesResponse)
def price_zones(eur_per_mwh: list[float]) -> PriceZonesResponse:

    pandas_list = pd.Series(eur_per_mwh)
    ma = pandas_list.rolling(MA_WINDOW, min_periods=1).mean()

    residuals = pandas_list - ma

    lower_quantile = np.quantile(residuals, ALPHA)
    upper_quantile = np.quantile(residuals, 1 - ALPHA)
    level = ma.iloc[-1]

    return PriceZonesResponse(
        lower_quantile=round(level + lower_quantile, 2),
        upper_quantile=round(level + upper_quantile, 2),
    )
