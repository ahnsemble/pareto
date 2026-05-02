from __future__ import annotations

from typing import Any


def pareto_frontier_smoke(
    candidates: list[dict[str, Any]],
    score_key: str = "score",
    damage_key: str = "damage",
) -> list[int]:
    """Return indices of Pareto-optimal candidates using Rust strict dominance semantics."""
    indexed = list(enumerate(candidates))
    frontier: list[tuple[int, dict[str, Any]]] = []

    for candidate in indexed:
        if any(_dominates(existing[1], candidate[1], score_key, damage_key) for existing in frontier):
            continue
        frontier = [
            existing
            for existing in frontier
            if not _dominates(candidate[1], existing[1], score_key, damage_key)
        ]
        frontier.append(candidate)

    frontier.sort(
        key=lambda entry: (
            -_number(entry[1].get(score_key)),
            -_number(entry[1].get(damage_key)),
            str(entry[1].get("label", "")),
            entry[0],
        )
    )
    return [index for index, _candidate in frontier]


def _dominates(left: dict[str, Any], right: dict[str, Any], score_key: str, damage_key: str) -> bool:
    left_score = _number(left.get(score_key))
    right_score = _number(right.get(score_key))
    left_damage = _number(left.get(damage_key))
    right_damage = _number(right.get(damage_key))
    not_worse_score = left_score >= right_score
    not_worse_damage = left_damage >= right_damage
    strictly_better_score = left_score > right_score
    strictly_better_damage = left_damage > right_damage
    return not_worse_score and not_worse_damage and (strictly_better_score or strictly_better_damage)


def _number(value: Any) -> float:
    return float(value) if isinstance(value, (int, float)) else 0.0
