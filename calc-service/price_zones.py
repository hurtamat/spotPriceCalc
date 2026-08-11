"""Price zones: a list of prices in, the two cut-off prices out (cheap / medium / expensive).

Quantiles are order-independent, so no timestamps are needed — the same endpoint
serves 7 days or a year, only the length of the list changes.
"""

import pandas as pd
from fastapi import APIRouter

from wire import WireModel

router = APIRouter(tags=["price-zones"])

# Fixed on purpose — the split is a product decision, not a request parameter.
LOWER_QUANTILE = 0.3
UPPER_QUANTILE = 0.7


class PriceZonesResponse(WireModel):
    # Threshold PRICES in EUR/MWh, not the 0..1 fractions above.
    lower_quantile: float
    upper_quantile: float


@router.post("/price-zones", response_model=PriceZonesResponse)
def price_zones(eur_per_mwh: list[float]) -> PriceZonesResponse:
    """STUB — the body (a bare JSON array of EUR/MWh prices) parses, the numbers are placeholders.

    To implement:

        lower = float(prices.quantile(LOWER_QUANTILE))
        upper = float(prices.quantile(UPPER_QUANTILE))

    Negative prices need no special-casing — quantiles handle them fine.
    """
    prices = pd.Series(eur_per_mwh, dtype="float64")

    # TODO(quantiles): placeholders — nothing below reads `prices`.
    lower = 50.0
    upper = 100.0

    return PriceZonesResponse(
        lower_quantile=round(lower, 2),
        upper_quantile=round(upper, 2),
    )
