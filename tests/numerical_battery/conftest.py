from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path
from typing import Any


PARETO_ROOT = Path(__file__).resolve().parents[2]
PYTHON_REFERENCE_ROOT = Path(
    "/Users/woosung/Desktop/Dev/Woosdom_Brain/01_Domains/System/"
    "codex_output/tttg_forge_sprint_b_2026-04-19/geotool_reimplementation"
)
REFERENCE_FIXTURES = PYTHON_REFERENCE_ROOT / "tests" / "fixtures"
WASM_BRIDGE = Path(__file__).with_name("wasm_bridge.mjs")

if str(PYTHON_REFERENCE_ROOT) not in sys.path:
    sys.path.insert(0, str(PYTHON_REFERENCE_ROOT))


def wasm_call(export_name: str, *args: Any) -> Any:
    payload = json.dumps({"exportName": export_name, "args": list(args)}, ensure_ascii=True)
    result = subprocess.run(
        ["node", str(WASM_BRIDGE)],
        input=payload,
        text=True,
        capture_output=True,
        cwd=PARETO_ROOT,
        check=False,
    )
    if result.returncode != 0:
        raise AssertionError(
            f"node wasm bridge failed with exit {result.returncode}\n"
            f"stdout: {result.stdout}\nstderr: {result.stderr}"
        )
    return json.loads(result.stdout)


def load_reference_fixture(name: str) -> Any:
    return json.loads((REFERENCE_FIXTURES / name).read_text())
