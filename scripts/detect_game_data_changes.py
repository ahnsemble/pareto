#!/usr/bin/env python3
"""Dry-run friendly game-data fixture diff detector."""

from __future__ import annotations

import argparse
import hashlib
import json
import urllib.request
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
FIXTURE = ROOT / "tttg_forge_optimizer" / "fixtures" / "game_data_sources.json"


def load_sources() -> list[dict[str, str]]:
    return json.loads(FIXTURE.read_text(encoding="utf-8"))


def hash_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def fetch_hash(url: str, timeout: float) -> str:
    with urllib.request.urlopen(url, timeout=timeout) as response:
        return hash_bytes(response.read())


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--timeout", type=float, default=10.0)
    args = parser.parse_args()

    rows = []
    for source in load_sources():
        error = None
        error_type = None
        if args.dry_run:
            current_hash = source["baseline_hash"]
        else:
            try:
                current_hash = fetch_hash(source["url"], args.timeout)
            except Exception as err:
                current_hash = None
                error = str(err)
                error_type = type(err).__name__
        row = {
            "id": source["id"],
            "url": source["url"],
            "baseline_hash": source["baseline_hash"],
            "current_hash": current_hash,
            "changed": current_hash != source["baseline_hash"],
        }
        if error is not None:
            row["error"] = error
            row["error_type"] = error_type
        rows.append(row)
    print(json.dumps({"source_count": len(rows), "rows": rows}, indent=2, sort_keys=True))
    return 1 if any(row["changed"] for row in rows) else 0


if __name__ == "__main__":
    raise SystemExit(main())
