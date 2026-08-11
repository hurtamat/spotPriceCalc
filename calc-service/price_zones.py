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
    #TODO 
    lower = 50.0
    upper = 100.0

    return PriceZonesResponse(
        lower_quantile=round(lower, 2),
        upper_quantile=round(upper, 2),
    )
