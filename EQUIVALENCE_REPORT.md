# Pareto Sprint E Equivalence Report

## Summary

- Python reference pytest: 73/73 PASS (`51` Sprint B/Full Space V2 + `22` Sprint E shadow-fix tests)
- Rust workspace release tests: 120/120 PASS
- Regression status: 0 observed in runnable fixture-backed subset
- Floating point epsilon: `1e-9` for score/damage parity tests

## Python Reference

Command:

```text
python3 -m pytest /Users/woosung/Desktop/Dev/Woosdom_Brain/01_Domains/System/codex_output/tttg_forge_sprint_b_2026-04-19/geotool_reimplementation/tests /Users/woosung/Desktop/Dev/Woosdom_Brain/01_Domains/System/codex_output/tttg_forge_sprint_e_prep_2026-04-21/tests -q
```

Result:

```text
73 passed in 104.04s (0:01:44)
```

## Rust Reference

Command:

```text
cargo test --workspace --release
```

Result:

```text
120 passed; 0 failed
```

Breakdown:

- `tttg_forge_core`: 70 tests
- `tttg_forge_optimizer`: 48 tests
- `tttg_forge_wasm`: 2 native tests

## Notes

- `pareto_frontier::dominated_by_strict` uses strict Pareto dominance: not worse on all axes and strictly better on at least one axis.
- `space_builder::compute_bitmask_v2` uses `(u64, u64)` key format and preserves all 64 collectible bits.
- `decode_public_raw` is fixture-backed for Sprint E and currently returns the verified public-share header/attack subset for the raw benchmark path. Full LZMA-alone unpack remains an explicit Sprint F/E2 carryover because `xz2` was intentionally not added outside the approved dependency set.
