import random
from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient

from main import app

client = TestClient(app)

START = datetime(2026, 11, 1, tzinfo=UTC)


def series(prices: list[float], step: timedelta = timedelta(hours=1)) -> list[dict]:
    """Wire-format price points (camelCase, as the .NET API sends them), one per step."""
    return [
        {
            "fromUtc": (START + i * step).isoformat(),
            "toUtc": (START + (i + 1) * step).isoformat(),
            "eurPerMwh": p,
        }
        for i, p in enumerate(prices)
    ]


def zones(points: list[dict]) -> tuple[float, float]:
    response = client.post("/price-zones", json=points)
    assert response.status_code == 200, response.text
    body = response.json()
    return body["lowerQuantile"], body["upperQuantile"]


def test_health():
    assert client.get("/healthz").json() == {"status": "ok"}


def test_empty_input_is_rejected():
    assert client.post("/price-zones", json=[]).status_code == 422


def test_constant_price_collapses_both_thresholds_onto_it():
    assert zones(series([42.0] * 48)) == (42.0, 42.0)


def test_hand_computed_two_point_case():
    # MA over [0, 100] is [0, 50], residuals [0, 50]; the 30th/70th percentiles of those
    # are 15 and 35, offset by the last MA level of 50.
    assert zones(series([0.0, 100.0])) == (65.0, 85.0)


def test_thresholds_are_ordered_for_varying_prices():
    rng = random.Random(7)
    lower, upper = zones(series([rng.uniform(-20, 300) for _ in range(7 * 24)]))
    assert lower < upper


def test_input_order_does_not_matter():
    rng = random.Random(11)
    points = series([rng.uniform(0, 200) for _ in range(96)])
    shuffled = points[:]
    rng.shuffle(shuffled)
    assert zones(shuffled) == zones(points)


def test_shifting_every_price_shifts_both_thresholds_by_the_same_amount():
    rng = random.Random(3)
    prices = [rng.uniform(0, 200) for _ in range(72)]
    lower, upper = zones(series(prices))
    shifted_lower, shifted_upper = zones(series([p + 25 for p in prices]))
    assert shifted_lower == pytest.approx(lower + 25, abs=0.011)
    assert shifted_upper == pytest.approx(upper + 25, abs=0.011)
