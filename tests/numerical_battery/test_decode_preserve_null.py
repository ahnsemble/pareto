from __future__ import annotations

import base64
import json
import lzma
from pathlib import Path
from typing import Any

import pytest

from conftest import wasm_call
from decode_null_key_shadow import decode_with_absent_null, decode_with_preserve_null


FIXTURE_ROOT = Path(
    "/Users/woosung/Desktop/Dev/Woosdom_Brain/01_Domains/System/"
    "codex_output/tttg_forge_sprint_b_2026-04-19/geotool_reimplementation/tests/fixtures"
)


def tg0nar_payload() -> dict[str, Any]:
    return json.loads((FIXTURE_ROOT / "tg0naR.compact.json").read_text())


NULL_CASES = [
    pytest.param(tg0nar_payload, ["a", "ba"], None, False, id="tg0naR"),
    pytest.param(lambda: {"a": {"ba": None}}, ["a", "ba"], None, False, id="null-only"),
    pytest.param(lambda: {"a": {"ba": None, "bb": 0}}, ["a", "ba"], None, False, id="null-value-mix"),
    pytest.param(lambda: {"a": {"nested": {"x": None, "y": 1}}}, ["a", "nested", "x"], None, False, id="nested-null"),
    pytest.param(lambda: {"a": {"items": [None, {"x": None, "y": 2}]}}, ["a", "items", 1, "x"], None, False, id="list-object-null"),
]


def path_exists(value: Any, path: list[str | int]) -> bool:
    current = value
    for part in path:
        if isinstance(part, int):
            if not isinstance(current, list) or part >= len(current):
                return False
            current = current[part]
            continue
        if not isinstance(current, dict) or part not in current:
            return False
        current = current[part]
    return True


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


def encode_raw_payload(payload: dict[str, Any]) -> str:
    packed = encode_msgpack_string(json.dumps(payload, ensure_ascii=True, separators=(",", ":")))
    compressed = lzma.compress(packed, format=lzma.FORMAT_ALONE)
    return base64.urlsafe_b64encode(compressed).decode("ascii").rstrip("=")


@pytest.mark.parametrize(("payload_factory", "null_path", "expected_value", "unused"), NULL_CASES)
@pytest.mark.parametrize("preserve_null", [True, False], ids=["preserve", "absent"])
def test_decode_null_key_shadow_preserve_vs_absent(
    payload_factory: Any,
    null_path: list[str | int],
    expected_value: Any,
    unused: bool,
    preserve_null: bool,
) -> None:
    payload = payload_factory()
    actual = decode_with_preserve_null(payload) if preserve_null else decode_with_absent_null(payload)

    assert path_exists(actual, null_path) is preserve_null
    if preserve_null:
        current = actual
        for part in null_path:
            current = current[part]
        assert current is expected_value

    if null_path[:2] == ["a", "ba"] and "bb" in payload.get("a", {}):
        assert actual["a"]["bb"] == 0


def test_wasm_decode_public_raw_default_keeps_absent_null_policy() -> None:
    raw = encode_raw_payload({"_V": 9, "a": {"ba": None, "bb": 0, "items": [None, {"x": None, "y": 2}]}})

    actual = wasm_call("decode_public_raw", raw)

    assert not path_exists(actual, ["a", "ba"])
    assert not path_exists(actual, ["a", "items", 1, "x"])
    assert actual["a"]["bb"] == 0
    assert actual["a"]["items"][0] is None


def test_wasm_decode_public_raw_js_preserves_nulls_when_opted_in() -> None:
    raw = encode_raw_payload({"_V": 9, "a": {"ba": None, "bb": 0, "items": [None, {"x": None, "y": 2}]}})

    actual = wasm_call("decode_public_raw_js", raw, True)

    assert path_exists(actual, ["a", "ba"])
    assert path_exists(actual, ["a", "items", 1, "x"])
    assert actual["a"]["ba"] is None
    assert actual["a"]["items"][1]["x"] is None


def test_wasm_decode_public_raw_default_and_opt_in_are_differential() -> None:
    raw = encode_raw_payload({"_V": 9, "a": {"ba": None, "bb": 0, "items": [None, {"x": None, "y": 2}]}})

    default_actual = wasm_call("decode_public_raw", raw)
    opt_in_actual = wasm_call("decode_public_raw_js", raw, True)

    assert default_actual != opt_in_actual
    assert not path_exists(default_actual, ["a", "ba"])
    assert path_exists(opt_in_actual, ["a", "ba"])
