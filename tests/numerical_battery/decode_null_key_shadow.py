from __future__ import annotations

from copy import deepcopy
from typing import Any


def decode_with_preserve_null(payload: dict[str, Any]) -> dict[str, Any]:
    """Shadow decode behavior that preserves explicit null object entries."""
    return deepcopy(payload)


def decode_with_absent_null(payload: dict[str, Any]) -> dict[str, Any]:
    """Shadow current browser-normalized behavior: null object entries are absent."""
    return _drop_null_object_entries(payload)


def _drop_null_object_entries(value: Any) -> Any:
    if isinstance(value, dict):
        return {
            key: _drop_null_object_entries(entry)
            for key, entry in value.items()
            if entry is not None
        }
    if isinstance(value, list):
        return [_drop_null_object_entries(entry) for entry in value]
    return deepcopy(value)
