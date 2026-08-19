import pandas as pd
from fastapi import APIRouter
from scipy import stats
import numpy as np

from wire import WireModel

router = APIRouter(tags=["price-zones"])


class PriceZonesResponse(WireModel):
    # Threshold prices in EUR/MWh: below lower = cheap, above upper = expensive.
    lower_quantile: float
    upper_quantile: float


@router.post("/price-zones", response_model=PriceZonesResponse)
def price_zones(eur_per_mwh: list[float]) -> PriceZonesResponse:
    # PLACEHOLDER: sort and cut at the 1/3 and 2/3 marks. Deliberately dumb — plain index picks, no
    # interpolation, no outlier handling, no weighting by how recent a price is. TODO: real model.

    pandas_list = pd.Series(eur_per_mwh)
    ma = pandas_list.rolling(672).mean()

    residuals = pandas_list.iloc[-(7 * 24 * 4):] - pandas_list.iloc[-(7 * 24 * 4):]

    day_data = pandas_list.iloc[-(24 * 4):]
    alpha = 0.3
    lower_quantile = np.quantile(residuals, alpha)
    upper_quantile = np.quantile(residuals, 1 - alpha)

    return PriceZonesResponse(
        lower_quantile,
        upper_quantile,
    )
