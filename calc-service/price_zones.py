import pandas as pd
from fastapi import APIRouter

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
    s = sorted(eur_per_mwh)

    return PriceZonesResponse(
        lower_quantile=round(s[len(s) // 3], 2),
        upper_quantile=round(s[2 * len(s) // 3], 2),
    )
