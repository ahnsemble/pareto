from __future__ import annotations

import base64
import json
import lzma
import math
import random
from typing import Any

import pytest

from geotool_reimpl.score import calculate_damage_factor as py_calculate_damage_factor
from geotool_reimpl.score import decode_public_raw as py_decode_public_raw

from conftest import load_reference_fixture, wasm_call


FLOAT_TOLERANCE = 1e-9


def assert_equivalent(actual: Any, expected: Any, path: str = "$") -> None:
    if isinstance(expected, float) or isinstance(actual, float):
        assert math.isclose(float(actual), float(expected), rel_tol=FLOAT_TOLERANCE, abs_tol=FLOAT_TOLERANCE), (
            path,
            actual,
            expected,
        )
        return
    if isinstance(expected, dict):
        assert isinstance(actual, dict), (path, actual, expected)
        assert set(actual) == set(expected), (path, actual, expected)
        for key in expected:
            assert_equivalent(actual[key], expected[key], f"{path}.{key}")
        return
    if isinstance(expected, list):
        assert isinstance(actual, list), (path, actual, expected)
        assert len(actual) == len(expected), (path, actual, expected)
        for index, (actual_entry, expected_entry) in enumerate(zip(actual, expected, strict=True)):
            assert_equivalent(actual_entry, expected_entry, f"{path}[{index}]")
        return
    assert actual == expected, (path, actual, expected)


def make_lzma_json_raw(seed: int, extra_size: int = 0) -> str:
    payload = {
        "_V": 4,
        "a": {
            "I": "lme1" if seed % 2 else "main",
            "$": 85000 + seed,
            "seed": seed,
        },
        "ignored": "".join(chr(65 + ((seed + index) % 26)) for index in range(extra_size)),
    }
    packed = encode_msgpack_string(json.dumps(payload, ensure_ascii=True, separators=(",", ":")))
    compressed = lzma.compress(packed, format=lzma.FORMAT_ALONE)
    return base64.urlsafe_b64encode(compressed).decode("ascii").rstrip("=")


def encode_msgpack_string(text: str) -> bytes:
    data = text.encode("utf-8")
    length = len(data)
    if length <= 31:
        return bytes([0xA0 | length]) + data
    if length <= 0xFF:
        return bytes([0xD9, length]) + data
    if length <= 0xFFFF:
        return bytes([0xDA]) + length.to_bytes(2, "big") + data
    return bytes([0xDB]) + length.to_bytes(4, "big") + data


def drop_null_object_entries(value: Any) -> Any:
    if isinstance(value, dict):
        return {key: drop_null_object_entries(entry) for key, entry in value.items() if entry is not None}
    if isinstance(value, list):
        return [drop_null_object_entries(entry) for entry in value]
    return value


def expected_make_synthetic_search_space(
    slot_count: int,
    include_baseline: bool,
    tradeoff: bool,
    top_k: int,
) -> dict[str, Any]:
    slots = []
    for index in range(slot_count):
        step = float(index + 1)
        if tradeoff:
            choices = [
                {
                    "name": "precision",
                    "score_delta": 12.0 + step,
                    "damage_delta": 3.0 + step * 0.1,
                },
                {
                    "name": "overload",
                    "score_delta": 5.0 + step * 0.2,
                    "damage_delta": 15.0 + step,
                },
            ]
        elif include_baseline:
            choices = [
                {"name": "baseline", "score_delta": 0.0, "damage_delta": 0.0},
                {
                    "name": "upgrade",
                    "score_delta": 10.0 + step,
                    "damage_delta": 1.0 + step * 0.1,
                },
            ]
        else:
            choices = [
                {
                    "name": "upgrade",
                    "score_delta": 10.0 + step,
                    "damage_delta": 1.0 + step * 0.1,
                }
            ]
        slots.append({"name": f"slot_{index:02}", "choices": choices})
    return {"slots": slots, "top_k": top_k}


def expected_merge_stat_dicts(parts: list[Any]) -> dict[str, float]:
    merged: dict[str, float] = {}
    for part in parts:
        if not isinstance(part, dict):
            continue
        for key, value in part.items():
            merged[key] = merged.get(key, 0.0) + (float(value) if isinstance(value, (int, float)) else 0.0)
    return merged


def expected_coerce_stat_dict(value: Any) -> dict[str, float]:
    if not isinstance(value, dict):
        return {}
    return {key: float(entry) if isinstance(entry, (int, float)) else 0.0 for key, entry in value.items()}


def expected_coerce_pool_vector(value: Any) -> list[float]:
    if not isinstance(value, list):
        return []
    return [float(entry) if isinstance(entry, (int, float)) else 0.0 for entry in value]


def build_decode_cases() -> list[pytest.ParamSpec]:
    cases = []
    public_cases = load_reference_fixture("public_share_cases.json")
    for name, entry in public_cases.items():
        cases.append(pytest.param(f"fixture-{name}", entry["raw"], "valid", id=f"decode-fixture-{name}"))

    for seed in range(28):
        extra_size = 32768 if seed == 27 else (seed % 7) * 37
        cases.append(pytest.param(f"valid-{seed}", make_lzma_json_raw(seed, extra_size), "valid", id=f"decode-valid-{seed:02d}"))

    invalid_base64 = ["", "!", "****", "not base64", "abc%", "====", "A" * 3]
    for seed in range(15):
        raw = invalid_base64[seed % len(invalid_base64)] + (str(seed) if seed else "")
        cases.append(pytest.param(f"invalid-base64-{seed}", raw, "error", id=f"decode-invalid-base64-{seed:02d}"))

    for seed in range(15):
        payload = bytes(((seed * 17 + index * 29) % 256 for index in range(1 + seed % 40)))
        raw = base64.urlsafe_b64encode(payload).decode("ascii").rstrip("=")
        cases.append(pytest.param(f"invalid-lzma-{seed}", raw, "error", id=f"decode-invalid-lzma-{seed:02d}"))
    return cases


def build_search_space_cases() -> list[pytest.ParamSpec]:
    rng = random.Random(424242)
    fixed = [
        (0, False, False, 0),
        (1, True, False, 1),
        (1, False, True, 2),
        (64, True, False, 32),
        (64, False, True, 1000),
    ]
    cases = [pytest.param(*entry, id=f"search-fixed-{index:02d}") for index, entry in enumerate(fixed)]
    for seed in range(55):
        slot_count = rng.choice([0, 1, 2, 3, 4, 8, 16, 31, 32, 63, 64])
        include_baseline = bool(rng.getrandbits(1))
        tradeoff = bool(rng.getrandbits(1))
        top_k = rng.choice([0, 1, 2, 5, 10, 100, 1000])
        cases.append(pytest.param(slot_count, include_baseline, tradeoff, top_k, id=f"search-random-{seed:02d}"))
    return cases


def build_pipeline_cases() -> list[pytest.ParamSpec]:
    fresh = load_reference_fixture("public_share_cases_fresh.json")
    cases = []
    for name, entry in fresh.items():
        cases.append(pytest.param(f"fixture-expanded-{name}", entry["expanded"], {}, id=f"pipeline-expanded-{name}"))
        cases.append(pytest.param(f"fixture-sanitized-{name}", entry["sanitized"], {}, id=f"pipeline-sanitized-{name}"))

    rng = random.Random(98765)
    for seed in range(56):
        config = {
            "heroes": {f"hero_{seed}": {"level": rng.randint(0, 120)}},
            "collectibles": {f"collectible_{index}": {"stars": rng.randint(0, 5)} for index in range(seed % 5)},
            "skills": {"Exo Bracer": bool(seed % 2), "HE Fuel": bool(seed % 3)},
            "meta": {"gameMode": "lme1" if seed % 4 == 0 else "main"},
            "seed": seed,
        }
        cases.append(pytest.param(f"unknown-{seed}", config, {}, id=f"pipeline-unknown-{seed:02d}"))
    return cases


def build_numeric_export_cases() -> list[pytest.ParamSpec]:
    rng = random.Random(13579)
    cases = []
    for seed in range(20):
        parts = []
        for index in range(1 + seed % 5):
            parts.append(
                {
                    "atk": round(rng.uniform(-1000.0, 1000.0), 6),
                    "critRate": seed + index,
                    "nonnumeric": "ignored",
                }
            )
        if seed % 4 == 0:
            parts.append(["not", "an", "object"])
        cases.append(pytest.param("merge_stat_dicts", [parts], expected_merge_stat_dicts(parts), id=f"numeric-merge-{seed:02d}"))

    for seed in range(10):
        parts = [{"atk": seed}, {"atk": seed * 0.5, "hp": "ignored"}]
        cases.append(pytest.param("bridge_set", [parts], expected_merge_stat_dicts(parts), id=f"numeric-bridge-{seed:02d}"))

    for seed in range(10):
        value = {"a": seed, "b": -seed * 0.25, "bad": None, "text": "x"}
        cases.append(pytest.param("coerce_stat_dict", [value], expected_coerce_stat_dict(value), id=f"numeric-coerce-stat-{seed:02d}"))

    for seed in range(10):
        value = [seed, seed + 0.5, None, "x", -seed]
        cases.append(pytest.param("coerce_pool_vector", [value], expected_coerce_pool_vector(value), id=f"numeric-coerce-pool-{seed:02d}"))

    for seed in range(10):
        stats = {
            "ssGlovesLaser": seed % 5,
            "ssMiscPath": 10.0 + seed * 3.5,
            "cooldownReduction": 5.0 if seed % 2 else 0.0,
            "taloxaBeam": seed * 0.25,
            "crimsonBat": seed * 0.5,
            "harmonyTaloxa": seed,
            "harmonyJoey": seed * 0.75,
            "harmonyMetalia": seed * 0.5,
            "harmonyYang": seed * 0.25,
            "harmonyKing": seed * 0.125,
            "harmonyCommon": seed * 0.0625,
            "xenoDamage": seed * 1.5,
        }
        ce_damage_techs = {"Drone": seed * 2.0, "Molotov": seed * 0.125}
        if seed == 9:
            stats.update(
                {
                    "ssMiscPath": 1_000_000_000_000.0,
                    "harmonyTaloxa": 1_000_000_000.0,
                    "harmonyJoey": 500_000_000.0,
                    "xenoDamage": 250_000_000.0,
                }
            )
            ce_damage_techs = {"Drone": 1_000_000_000.0, "Molotov": 500_000_000.0}
        damage_factor, ce_damage = py_calculate_damage_factor(stats, ce_damage_techs)
        expected = {"damageFactor": damage_factor, "ceDamage": ce_damage}
        cases.append(
            pytest.param("calculate_damage_factor", [stats, ce_damage_techs], expected, id=f"numeric-damage-factor-{seed:02d}")
        )
    return cases


DECODE_CASES = build_decode_cases()
SEARCH_SPACE_CASES = build_search_space_cases()
PIPELINE_CASES = build_pipeline_cases()
NUMERIC_EXPORT_CASES = build_numeric_export_cases()


@pytest.mark.parametrize(("label", "raw", "expectation"), DECODE_CASES)
def test_decode_public_raw_random_and_error_battery(label: str, raw: str, expectation: str) -> None:
    actual = wasm_call("decode_public_raw", raw)
    if expectation == "error":
        assert "error" in actual, (label, actual)
        return
    expected_full = py_decode_public_raw(raw)
    expected = drop_null_object_entries({"_V": expected_full.get("_V"), "a": expected_full.get("a")})
    assert_equivalent(actual, expected)


@pytest.mark.parametrize(("slot_count", "include_baseline", "tradeoff", "top_k"), SEARCH_SPACE_CASES)
def test_make_synthetic_search_space_random_battery(
    slot_count: int,
    include_baseline: bool,
    tradeoff: bool,
    top_k: int,
) -> None:
    actual = wasm_call("make_synthetic_search_space", slot_count, include_baseline, tradeoff, top_k)
    expected = expected_make_synthetic_search_space(slot_count, include_baseline, tradeoff, top_k)
    assert_equivalent(actual, expected)


@pytest.mark.parametrize(("label", "config", "expected_stats"), PIPELINE_CASES)
def test_run_full_pipeline_fixture_and_unknown_config_battery(label: str, config: dict[str, Any], expected_stats: dict[str, Any]) -> None:
    actual = wasm_call("run_full_pipeline", config)
    expected = {"stats": expected_stats, "score": expected_stats.get("score", 0.0), "damageFactor": expected_stats.get("damageFactor", 0.0)}
    assert_equivalent(actual, expected)


@pytest.mark.parametrize(("export_name", "args", "expected"), NUMERIC_EXPORT_CASES)
def test_numeric_exports_random_battery(export_name: str, args: list[Any], expected: Any) -> None:
    actual = wasm_call(export_name, *args)
    assert_equivalent(actual, expected)
