from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class WireModel(BaseModel):
    """Base: snake_case in Python, camelCase on the wire, accepts both.

    Its own module so route files can share it without importing `main` (circular).
    """
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
