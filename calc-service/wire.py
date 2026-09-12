from datetime import datetime

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class WireModel(BaseModel):
    """Base: snake_case in Python, camelCase on the wire, accepts both.

    Its own module so route files can share it without importing `main` (circular).
    """
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class PricePoint(WireModel):
    """One priced slot. `from_utc`→`to_utc` is what carries the resolution (PT60M vs PT15M),
    so no endpoint needs a resolution field. On the wire: fromUtc / toUtc / eurPerMwh."""
    from_utc: datetime
    to_utc: datetime
    eur_per_mwh: float
