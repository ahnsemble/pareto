from __future__ import annotations

from copy import deepcopy
from typing import Any, Iterable


def expand(
    compact: dict[str, Any],
    data: dict[str, Any] | list[dict[str, Any]],
    beta_flags: list[str] | None = None,
    strict: bool = True,
) -> dict[str, Any]:
    """Fixture-free expansion shadow: callers inject data instead of reading native files."""
    del beta_flags
    for entry in _entries(data):
        if entry.get("compact") == compact:
            return deepcopy(entry.get("expanded", {}))
    if strict:
        raise KeyError("expand_compact fixture not found")
    return deepcopy(compact)


def aggregate(
    config: dict[str, Any],
    data: dict[str, Any] | list[dict[str, Any]],
) -> dict[str, float]:
    """Fixture-free aggregate shadow with in-memory data injection and no filesystem access."""
    for entry in _entries(data):
        if entry.get("sanitized") == config or entry.get("expanded") == config:
            stats = entry.get("stats", {})
            return deepcopy(stats) if isinstance(stats, dict) else {}

    inline_stats = config.get("stats")
    if isinstance(inline_stats, dict):
        return _coerce_stat_dict(inline_stats)

    stat_parts = config.get("statParts")
    if isinstance(stat_parts, list):
        return _merge_stat_dicts(stat_parts)

    return {}


def _entries(data: dict[str, Any] | list[dict[str, Any]]) -> Iterable[dict[str, Any]]:
    if isinstance(data, list):
        yield from (entry for entry in data if isinstance(entry, dict))
        return

    cases = data.get("cases", data)
    if isinstance(cases, dict):
        yield from (entry for entry in cases.values() if isinstance(entry, dict))


def _coerce_stat_dict(value: dict[str, Any]) -> dict[str, float]:
    return {key: _number(entry) for key, entry in value.items()}


def _merge_stat_dicts(parts: list[Any]) -> dict[str, float]:
    merged: dict[str, float] = {}
    for part in parts:
        if not isinstance(part, dict):
            continue
        for key, value in part.items():
            merged[key] = merged.get(key, 0.0) + _number(value)
    return merged


def _number(value: Any) -> float:
    return float(value) if isinstance(value, (int, float)) else 0.0
