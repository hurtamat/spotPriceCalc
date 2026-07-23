# =============================================================================
# .NET  <->  FastAPI  contract -- AI SLOP
# -----------------------------------------------------------------------------
# The .NET API calls this service once per (zone, day range) to get an
# something back. .NET is the only caller; it owns fetching prices +
# weather, this service is a pure function over the data it is handed.
#
# Conventions (agreed with the .NET side — keep both ends in sync):
#   * JSON casing .......... camelCase on the wire (biddingZoneId, eurPerMwh, ...)
#                            Python fields stay snake_case; Field(alias=...) /
#                            to_camel bridge the two. populate_by_name lets
#                            either spelling deserialize.
#   * Timestamps ........... UTC, ISO-8601 (e.g. 2026-07-24T02:00:00Z).
#                            "from"/"to" on the request are calendar DATES.
#   * Units ................ price = EUR/MWh, temperature = °C.
#   * Time resolution ...... NOT a field. It is implied by each price point's
#                            own from/to span (PT60M => hourly, PT15M => 15-min),
#                            which is decided per bidding zone upstream.
#   * Date range ........... "from" required, "to" optional. If "to" is omitted
#                            it defaults to "from" (a single day).
#   * Device config ........ intentionally NOT sent yet. Added later.
# =============================================================================

from datetime import date, datetime

from fastapi import FastAPI
from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

app = FastAPI()  # <- this is the "app" fastapi dev looks for


class _WireModel(BaseModel):
    """Base: snake_case in Python, camelCase on the wire, accepts both."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


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


@app.get("/")
def health():
    return {"status": "ok"}


@app.post("/schedule")
def schedule(req: ScheduleRequest):
    date_to = req.date_to or req.date_from
    # TODO: response shape (on/off windows + cost/saving estimates) — to be defined.
    return {}
