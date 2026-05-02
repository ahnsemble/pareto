from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest

from conftest import wasm_call
from aggregate_expand_shadow import aggregate, expand


FIXTURE_DIR = Path(__file__).with_name("fixtures") / "aggregate_expand"
FIXTURE_NAMES = [
    "expand_compact_alpha",
    "expand_compact_beta",
    "expand_missing_non_strict",
    "expand_list_data",
    "aggregate_expanded_alpha",
    "aggregate_sanitized_alpha",
    "aggregate_inline_stats",
    "aggregate_stat_parts",
    "aggregate_unknown_empty",
    "aggregate_list_data",
]
PIPELINE_FIXTURE_NAMES = [
    "expand_compact_alpha",
    "expand_compact_beta",
    "expand_list_data",
    "aggregate_expanded_alpha",
    "aggregate_sanitized_alpha",
]


def load_fixture(name: str) -> dict[str, Any]:
    return json.loads((FIXTURE_DIR / f"{name}.json").read_text())


@pytest.mark.parametrize("fixture_name", FIXTURE_NAMES, ids=FIXTURE_NAMES)
def test_aggregate_expand_shadow_fixture_free_cases(fixture_name: str) -> None:
    fixture = load_fixture(fixture_name)

    if fixture["operation"] == "expand":
        actual = expand(fixture["input"], fixture["data"], strict=fixture.get("strict", True))
    else:
        actual = aggregate(fixture["input"], fixture["data"])

    assert actual == fixture["expected"]


@pytest.mark.parametrize("fixture_name", FIXTURE_NAMES, ids=FIXTURE_NAMES)
def test_aggregate_expand_wasm_exports_match_fixture_free_cases(fixture_name: str) -> None:
    fixture = load_fixture(fixture_name)

    if fixture["operation"] == "expand":
        actual = wasm_call("expand_compact_js", fixture["input"], fixture["data"], [], fixture.get("strict", True))
    else:
        actual = wasm_call("aggregate_in_memory_js", fixture["input"], fixture["data"])

    assert actual == fixture["expected"]


@pytest.mark.parametrize("fixture_name", PIPELINE_FIXTURE_NAMES, ids=PIPELINE_FIXTURE_NAMES)
def test_run_full_pipeline_in_memory_wasm_matches_fixture_stats(fixture_name: str) -> None:
    fixture = load_fixture(fixture_name)
    expected_stats = fixture["expected"] if fixture["operation"] == "aggregate" else _first_stats(fixture["data"])

    actual = wasm_call("run_full_pipeline_in_memory", fixture["input"], fixture["data"])

    assert actual == {
        "stats": expected_stats,
        "score": expected_stats.get("score", 0.0),
        "damageFactor": expected_stats.get("damageFactor", 0.0),
    }


def _first_stats(data: Any) -> dict[str, Any]:
    if isinstance(data, list):
        for entry in data:
            if isinstance(entry, dict) and isinstance(entry.get("stats"), dict):
                return entry["stats"]
        return {}
    cases = data.get("cases", data)
    if isinstance(cases, dict):
        for entry in cases.values():
            if isinstance(entry, dict) and isinstance(entry.get("stats"), dict):
                return entry["stats"]
    return {}
