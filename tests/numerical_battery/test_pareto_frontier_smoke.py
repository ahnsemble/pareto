from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest

from conftest import wasm_call
from pareto_frontier_shadow import pareto_frontier_smoke


FIXTURE_DIR = Path(__file__).with_name("fixtures") / "pareto_frontier"
FIXTURE_NAMES = [
    "single_point",
    "tie_break",
    "score_only_strict",
    "damage_only_strict",
    "multi_point",
]


def load_fixture(name: str) -> dict[str, Any]:
    return json.loads((FIXTURE_DIR / f"{name}.json").read_text())


@pytest.mark.parametrize("fixture_name", FIXTURE_NAMES, ids=FIXTURE_NAMES)
def test_pareto_frontier_smoke_matches_fixture(fixture_name: str) -> None:
    fixture = load_fixture(fixture_name)

    actual = pareto_frontier_smoke(fixture["candidates"], score_key="score", damage_key="damage")

    assert actual == fixture["expected_frontier"]


@pytest.mark.parametrize("fixture_name", FIXTURE_NAMES, ids=FIXTURE_NAMES)
def test_pareto_frontier_smoke_wasm_export_matches_fixture(fixture_name: str) -> None:
    fixture = load_fixture(fixture_name)

    actual = wasm_call("pareto_frontier_smoke_js", fixture["candidates"])

    assert actual == fixture["expected_frontier"]


@pytest.mark.parametrize("fixture_name", FIXTURE_NAMES, ids=FIXTURE_NAMES)
def test_pareto_frontier_smoke_wasm_string_export_matches_fixture(fixture_name: str) -> None:
    fixture = load_fixture(fixture_name)

    actual = wasm_call("pareto_frontier_smoke_wasm", json.dumps(fixture["candidates"], separators=(",", ":")))

    assert actual == fixture["expected_frontier"]
