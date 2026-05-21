# SIO lm Full Equivalence Completion Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Drive `fullSioEquivalent` from the current safe `false` state to either a verified `true` state or a precise local-code/data blocker, without adding fixture-specific residual patches.

**Architecture:** Keep `critRateFlux` as the only registered non-scoring mutable trace artifact. Convert compact equipment handling from calibrated full-profile baselines into source-first formula reconstruction plus a shrinking residual ledger. Delete production calibrated equipment helpers only after calibration-off qN/shared probes and the full gate are green.

**Tech Stack:** Rust (`tttg_forge_optimizer`, `tttg_forge_core`), Node local live-oracle scripts under `frontend/scripts`, TD-11 JSON/Markdown artifacts under `frontend/artifacts/td11`.

---

## Current Baseline

- `fullSioEquivalent=false`
- scorer/currentScorer: `sio_compact_base_stats_transformer`
- `cargo test -p tttg_forge_optimizer --test tech_optimizer_performance sio_lm_ -- --nocapture`: `73/73` passed after S70
- `node scripts/sio_full_equivalence_gate.mjs`: passed as not-full-sio
- gate state: `G0=true`, `G1=true`, `G2=false`, `G3=false`, `G6=false`
- `critRateFlux`: excluded only from compact-only stats equivalence as a registered non-scoring mutable trace artifact
- production residual helpers still present:
  - `CompactEquipmentCalibration`
  - `apply_compact_equipment_calibration`
  - `apply_advanced_void_twisting_calibration`
  - `matches_judgment_sash_loadout`
  - `matches_void_sash_loadout`
  - `matches_void_twisting_loadout`
  - `matches_lme2_judgment_loadout`
  - `matches_advanced_void_twisting_loadout`

Calibration-off residual ledger after S70:

| Fixture | Field | Actual without calibration | Expected live | Direction |
|---|---:|---:|---:|---:|
| qN5n40 | `chilled` | `569.2033333333334` | `736.0366666666667` | `+166.8333333333333` |
| qN5n40 | `damageBoss` | `241.25500000000002` | `261.255` | `+20` |
| qN5n40 | `damageTransmute` | `37.650000000000006` | `39.400000000000006` | `+1.75` |
| qN5n40 | `poisoned` | `65.22666666666669` | `-81.19` | `-146.41666666666669` |
| qN5n40 | `shieldDamage` | `688.12` | `718.12` | `+30` |
| qN5n40 | `ssMiscPath` | `2278.6140000000005` | `2326.782` | `+48.167999999999665` |
| qN5n40 | `vulnerability` | `65` | `90` | `+25` |
| shared 4ZgaBw | `chilled` | `1120.9766666666667` | `1287.81` | `+166.83333333333326` |
| shared 4ZgaBw | `damageBoss` | `244.56` | `264.56` | `+20` |
| shared 4ZgaBw | `damageTransmute` | `25.1` | `26.85` | `+1.75` |
| shared 4ZgaBw | `poisoned` | `658.8966666666668` | `512.48` | `-146.41666666666674` |
| shared 4ZgaBw | `ssMiscPath` | `2205.0240000000003` | `2253.192` | `+48.167999999999665` |
| shared 4ZgaBw | `vulnerability` | `520` | `545` | `+25` |

Do not flip `fullSioEquivalent=true` while any row in this ledger is supplied by a production residual helper.

---

## Chunk 1: Make Residual Measurement Repeatable

### Task 1: Add A Non-Production Calibration-Off Probe Workflow

**Files:**
- Modify: `tttg_forge_optimizer/src/tech/sio_lm.rs`
- Modify: `tttg_forge_optimizer/src/tech/sio_lm/equipment_transform.rs`
- Modify: `tttg_forge_optimizer/tests/tech_optimizer_performance.rs`
- Update: `frontend/artifacts/td11/verification_summary.txt`

- [ ] **Step 1: Write the failing probe test**

Add a focused test that reconstructs qN/shared compact-only traces with equipment calibration disabled and asserts the S70 residual ledger exactly. Name it:

```rust
#[test]
fn sio_lm_calibration_off_probe_tracks_remaining_equipment_source_residuals()
```

The test must compare all non-`critRateFlux` residuals and must not pass by calling the calibrated production path.

- [ ] **Step 2: Run RED**

Run:

```bash
cargo test -p tttg_forge_optimizer --test tech_optimizer_performance sio_lm_calibration_off_probe_tracks_remaining_equipment_source_residuals -- --nocapture
```

Expected: FAIL because there is not yet a stable non-production calibration-off probe entry point.

- [ ] **Step 3: Add a probe-only option**

Add a narrow internal option to the reconstruction path, for example:

```rust
struct SioLmReconstructionOptions {
    disable_equipment_calibration_for_probe: bool,
}
```

Use it only from tests. The default production `reconstruct_sio_lm_inputs` and optimizer calls must continue using calibration until G2 removal.

- [ ] **Step 4: Verify the probe ledger**

Run:

```bash
cargo test -p tttg_forge_optimizer --test tech_optimizer_performance sio_lm_calibration_off_probe_tracks_remaining_equipment_source_residuals -- --nocapture
```

Expected: PASS with the S70 residual ledger above.

- [ ] **Step 5: Guard production behavior**

Run:

```bash
cargo test -p tttg_forge_optimizer --test tech_optimizer_performance sio_lm_compact_only_reconstructs_qn5n40_live_trace_without_supplied_context -- --nocapture
cargo test -p tttg_forge_optimizer --test tech_optimizer_performance sio_lm_compact_only_reconstructs_remaining_shared_live_traces_without_supplied_context -- --nocapture
```

Expected: both PASS.

---

## Chunk 2: Convert Equipment From Calibration-First To Source-First

### Task 2: Split Source Formula Application From Residual Overlay

**Files:**
- Modify: `tttg_forge_optimizer/src/tech/sio_lm.rs`
- Modify: `tttg_forge_optimizer/src/tech/sio_lm/equipment_transform.rs`
- Modify: `tttg_forge_optimizer/tests/tech_optimizer_performance.rs`

- [ ] **Step 1: Write source-first behavior tests**

Add tests proving matched calibrated loadouts still execute generic source formula paths when the probe disables residual overlay:

```rust
#[test]
fn sio_lm_calibrated_loadouts_still_execute_generic_ss_dynamic_source_paths()

#[test]
fn sio_lm_calibrated_loadouts_still_execute_compact_account_source_paths()
```

The tests should use focused stats that are already source-backed and should fail if the code takes the old `if calibration { skip generic source }` branch.

- [ ] **Step 2: Run RED**

Run:

```bash
cargo test -p tttg_forge_optimizer --test tech_optimizer_performance sio_lm_calibrated_loadouts_still_execute_ -- --nocapture
```

Expected: FAIL under the current calibration-first branch.

- [ ] **Step 3: Extract source-first equipment pipeline**

Refactor compact equipment reconstruction so it does this in order:

1. Always apply generic SS equipment dynamic transforms.
2. Always apply compact equipment collectible set bonuses.
3. Always apply compact equipment dynamic specials.
4. Always apply generic account input transform unless a source-backed reason says not to.
5. Apply a temporary residual overlay only for still-unexplained fields.

Do not add new fixture-name branches. Existing calibration matchers may remain only as temporary residual overlay selectors.

- [ ] **Step 4: Rebaseline residual overlay**

Replace full-profile calibration constants with a residual ledger that contains only the fields still missing after the source-first pipeline. The qN/shared production tests must remain green.

- [ ] **Step 5: Verify**

Run:

```bash
cargo test -p tttg_forge_optimizer --test tech_optimizer_performance sio_lm_calibration_off_probe_tracks_remaining_equipment_source_residuals -- --nocapture
cargo test -p tttg_forge_optimizer --test tech_optimizer_performance sio_lm_compact_only_reconstructs_qn5n40_live_trace_without_supplied_context -- --nocapture
cargo test -p tttg_forge_optimizer --test tech_optimizer_performance sio_lm_compact_only_reconstructs_remaining_shared_live_traces_without_supplied_context -- --nocapture
```

Expected: production tests PASS; probe residual ledger is smaller or unchanged, never larger.

---

## Chunk 3: Remove Residual Fields By Source Formula Group

### Task 3: Resolve `damageTransmute +1.75`

**Files:**
- Modify: `tttg_forge_optimizer/src/tech/sio_lm/equipment_transform.rs`
- Modify: `tttg_forge_optimizer/tests/tech_optimizer_performance.rs`

- [ ] **Step 1: Write RED for dynamic transmute condition**

Add:

```rust
#[test]
fn sio_lm_compact_ss_transmute_uses_live_dynamic_mode_condition_seconds()
```

The fixture should isolate the known delta: expected `damageTransmute` increases by `1.75` when the live source condition changes from the generic condition window to the active mode-specific condition.

- [ ] **Step 2: Run RED**

Run:

```bash
cargo test -p tttg_forge_optimizer --test tech_optimizer_performance sio_lm_compact_ss_transmute_uses_live_dynamic_mode_condition_seconds -- --nocapture
```

Expected: FAIL with `damageTransmute` short by `1.75`.

- [ ] **Step 3: Implement source formula**

Port the live condition selection from the local minified source:

- weapon condition can be overridden by Drone Mode/Drone and x-level
- armor by Lightning Mode
- necklace by Durian Mode

Use structured compact equipment fields, not string matching.

- [ ] **Step 4: Remove residual field**

Remove `damage_transmute` from the residual overlay for any profile now covered by the source formula.

- [ ] **Step 5: Verify**

Run:

```bash
cargo test -p tttg_forge_optimizer --test tech_optimizer_performance sio_lm_compact_ss_transmute_uses_live_dynamic_mode_condition_seconds -- --nocapture
cargo test -p tttg_forge_optimizer --test tech_optimizer_performance sio_lm_calibration_off_probe_tracks_remaining_equipment_source_residuals -- --nocapture
```

Expected: `damageTransmute` disappears from the calibration-off residual ledger.

### Task 4: Resolve `damageBoss +20` And `vulnerability +25`

**Files:**
- Modify: `tttg_forge_optimizer/src/tech/sio_lm/equipment_transform.rs`
- Modify: `tttg_forge_optimizer/src/tech/sio_lm.rs`
- Modify: `tttg_forge_optimizer/tests/tech_optimizer_performance.rs`

- [ ] **Step 1: Write RED for boss/vulnerability source coupling**

Add:

```rust
#[test]
fn sio_lm_compact_endgame_equipment_applies_live_boss_and_vulnerability_postprocess()
```

The test should assert qN/shared calibration-off deltas `damageBoss +20` and `vulnerability +25`.

- [ ] **Step 2: Run RED**

Run:

```bash
cargo test -p tttg_forge_optimizer --test tech_optimizer_performance sio_lm_compact_endgame_equipment_applies_live_boss_and_vulnerability_postprocess -- --nocapture
```

Expected: FAIL with those two deltas.

- [ ] **Step 3: Trace source modules**

Use only local source artifacts and scripts:

```bash
node scripts/sio_minified_domain_index.mjs
node scripts/sio_minified_formula_table_extract.mjs
```

Find the exact live branch that adds `damageBoss` and `vulnerability` for the qN/shared loadouts. If the source branch cannot be mapped from local bundles, record that as a blocker instead of adding calibration.

- [ ] **Step 4: Implement source formula**

Implement the mapped source branch using decoded compact equipment/config/account fields.

- [ ] **Step 5: Remove residual fields and verify**

Run:

```bash
cargo test -p tttg_forge_optimizer --test tech_optimizer_performance sio_lm_calibration_off_probe_tracks_remaining_equipment_source_residuals -- --nocapture
```

Expected: `damageBoss` and `vulnerability` disappear from the ledger.

### Task 5: Resolve `chilled` And `poisoned`

**Files:**
- Modify: `tttg_forge_optimizer/src/tech/sio_lm.rs`
- Modify: `tttg_forge_optimizer/src/tech/sio_lm/equipment_transform.rs`
- Modify: `tttg_forge_optimizer/tests/tech_optimizer_performance.rs`

- [ ] **Step 1: Write RED for condition stat finalization**

Add:

```rust
#[test]
fn sio_lm_compact_endgame_condition_stats_follow_live_finalization_order()
```

The test must capture both signs:

- `chilled` is short by `+166.8333333333333`
- `poisoned` is too high by `-146.4166666666667`

- [ ] **Step 2: Run RED**

Run:

```bash
cargo test -p tttg_forge_optimizer --test tech_optimizer_performance sio_lm_compact_endgame_condition_stats_follow_live_finalization_order -- --nocapture
```

Expected: FAIL on `chilled` and `poisoned`.

- [ ] **Step 3: Identify live ordering**

Trace whether the delta comes from:

- source table addition
- condition conversion
- overwrite-vs-add ordering
- LME/EE/endgame mode branch
- passive pool stat interaction

Do not implement a numeric patch until the source branch is identified.

- [ ] **Step 4: Implement the source branch**

Apply the live ordering in the Rust transform. If the live source overwrites `poisoned`, implement overwrite semantics explicitly rather than adding a negative correction.

- [ ] **Step 5: Remove residual fields and verify**

Run:

```bash
cargo test -p tttg_forge_optimizer --test tech_optimizer_performance sio_lm_calibration_off_probe_tracks_remaining_equipment_source_residuals -- --nocapture
```

Expected: `chilled` and `poisoned` disappear from the ledger.

### Task 6: Resolve `ssMiscPath +48.168` And `shieldDamage +30`

**Files:**
- Modify: `tttg_forge_optimizer/src/tech/sio_lm/equipment_transform.rs`
- Modify: `tttg_forge_optimizer/tests/tech_optimizer_performance.rs`

- [ ] **Step 1: Write RED for SS misc path and shield branch**

Add:

```rust
#[test]
fn sio_lm_compact_ss_misc_and_shield_paths_fold_live_total_core_branches()
```

The test should assert:

- qN/shared `ssMiscPath +48.168`
- qN `shieldDamage +30`

- [ ] **Step 2: Run RED**

Run:

```bash
cargo test -p tttg_forge_optimizer --test tech_optimizer_performance sio_lm_compact_ss_misc_and_shield_paths_fold_live_total_core_branches -- --nocapture
```

Expected: FAIL on `ssMiscPath` and qN `shieldDamage`.

- [ ] **Step 3: Implement source table branch**

Port the missing SS total-core/equipment path from local source tables. Reuse existing helpers for total SS core level and selected item collectible set bonuses.

- [ ] **Step 4: Remove residual fields and verify**

Run:

```bash
cargo test -p tttg_forge_optimizer --test tech_optimizer_performance sio_lm_calibration_off_probe_tracks_remaining_equipment_source_residuals -- --nocapture
```

Expected: `ssMiscPath` and `shieldDamage` disappear from the ledger.

---

## Chunk 4: Delete Production Equipment Residual Helpers

### Task 7: Remove Calibration Overlay And Matchers

**Files:**
- Modify: `tttg_forge_optimizer/src/tech/sio_lm.rs`
- Modify: `tttg_forge_optimizer/src/tech/sio_lm/equipment_transform.rs`
- Modify: `tttg_forge_optimizer/tests/tech_optimizer_performance.rs`
- Modify: `frontend/scripts/sio_full_equivalence_gate.mjs` only if the gate scanner needs name-list cleanup, not to weaken G2

- [ ] **Step 1: Run empty-ledger RED**

Run:

```bash
cargo test -p tttg_forge_optimizer --test tech_optimizer_performance sio_lm_calibration_off_probe_tracks_remaining_equipment_source_residuals -- --nocapture
```

Expected before deletion: PASS with an empty non-`critRateFlux` ledger.

- [ ] **Step 2: Delete production residual helpers**

Remove:

- `CompactEquipmentCalibration`
- `apply_compact_equipment_calibration`
- `apply_advanced_void_twisting_calibration`
- `matches_judgment_sash_loadout`
- `matches_void_sash_loadout`
- `matches_void_twisting_loadout`
- `matches_lme2_judgment_loadout`
- `matches_advanced_void_twisting_loadout`

- [ ] **Step 3: Verify source scan**

Run:

```bash
rg -n "CompactEquipmentCalibration|apply_compact_equipment_calibration|apply_advanced_void_twisting_calibration|matches_judgment_sash_loadout|matches_void_sash_loadout|matches_void_twisting_loadout|matches_lme2_judgment_loadout|matches_advanced_void_twisting_loadout" tttg_forge_optimizer/src/tech/sio_lm.rs tttg_forge_optimizer/src/tech/sio_lm/equipment_transform.rs
```

Expected: no matches in production source.

- [ ] **Step 4: Verify qN/shared/default**

Run:

```bash
cargo test -p tttg_forge_optimizer --test tech_optimizer_performance sio_lm_compact_only_reconstructs_default_live_traces_without_supplied_context -- --nocapture
cargo test -p tttg_forge_optimizer --test tech_optimizer_performance sio_lm_compact_only_reconstructs_qn5n40_live_trace_without_supplied_context -- --nocapture
cargo test -p tttg_forge_optimizer --test tech_optimizer_performance sio_lm_compact_only_reconstructs_remaining_shared_live_traces_without_supplied_context -- --nocapture
```

Expected: all PASS.

- [ ] **Step 5: Verify G2**

Run:

```bash
node scripts/sio_full_equivalence_gate.mjs
```

Expected: `G2_noEquipmentProfileResidual=true`. `G6` may still be false if G3 matrix domains are incomplete.

---

## Chunk 5: Complete The Equivalence Matrix G3

### Task 8: Expand Domain Fixtures Until Matrix Is Complete

**Files:**
- Modify: `frontend/scripts/sio_arbitrary_compact_fixture_generator.mjs`
- Modify: `frontend/scripts/sio_arbitrary_compact_live_capture.mjs`
- Modify: `frontend/scripts/sio_arbitrary_compact_worker_summary.mjs`
- Modify: `frontend/artifacts/td11/sio_lm_equivalence_matrix.json`
- Modify: `tttg_forge_optimizer/tests/tech_optimizer_performance.rs`

- [ ] **Step 1: List incomplete matrix domains**

Run:

```bash
node scripts/sio_full_equivalence_gate.mjs
```

Record `matrixIncomplete`.

- [ ] **Step 2: Add one live fixture per incomplete domain edge**

For each remaining partial domain, add a generated compact case with non-null live `best.multiplier` and non-empty `decodedResults`:

- collectibles/custom sets broad equipment/tech branch
- pets/xeno/endgame interaction
- survivors/passives/harmony/teamwork endgame interaction
- mounts damage formulas
- evo residual interactions
- LME dynamic threshold edges
- EE dynamic entries and omnipower
- active-skill/endgame coupling beyond current high-resonance focused tables

- [ ] **Step 3: Capture live expected**

Run:

```bash
node scripts/sio_arbitrary_compact_fixture_generator.mjs
node scripts/sio_arbitrary_compact_live_capture.mjs
node scripts/sio_arbitrary_compact_worker_summary.mjs
```

Expected: every generated case has live expected values; no synthetic-only case is used as true evidence.

- [ ] **Step 4: Add Rust parity tests**

For each new domain edge, add or extend a focused `sio_lm_...` test in:

```text
tttg_forge_optimizer/tests/tech_optimizer_performance.rs
```

Each test must fail first and then pass only after source formula implementation.

- [ ] **Step 5: Update matrix status**

Update `frontend/artifacts/td11/sio_lm_equivalence_matrix.json` only when live-backed tests pass. Do not mark a domain complete from synthetic stage-product replay.

- [ ] **Step 6: Verify G3**

Run:

```bash
node scripts/sio_full_equivalence_gate.mjs
```

Expected: `G3_matrixComplete=true`.

If any domain cannot be live-captured or mapped from local source bundles, stop with a blocker listing:

- compact fixture id
- missing source branch
- command output
- why local code/data is insufficient

---

## Chunk 6: Flip Full Equivalence Only After Gates Are Green

### Task 9: Final Flag/Scorer Change

**Files:**
- Modify: `tttg_forge_optimizer/src/tech/sio_lm.rs`
- Modify: `tttg_forge_optimizer/src/tech_search.rs`
- Modify: `tttg_forge_optimizer/tests/tech_optimizer_performance.rs`
- Modify: `frontend/artifacts/td11/s68_high_resonance_equipment_endgame_rollup.json`
- Modify: `frontend/artifacts/td11/sio_lm_equivalence_matrix.json`
- Modify: `frontend/artifacts/td11/release_readiness_audit.md`
- Modify: `frontend/artifacts/td11/verification_summary.txt`
- Modify: `/Users/woosung/Desktop/Dev/Woosdom_Brain/00_System/Templates/from_codex.md`

- [ ] **Step 1: Run pre-flip gate**

Run:

```bash
node scripts/sio_full_equivalence_gate.mjs
```

Required before code changes:

- `G0_independentLiveOracle=true`
- `G1_noAccountResidual=true`
- `G2_noEquipmentProfileResidual=true`
- `G3_matrixComplete=true`
- no generated case with `best.multiplier=null`
- no generated case with `decodedResults=[]`

- [ ] **Step 2: Write RED for final flag**

Use or extend:

```rust
#[test]
fn sio_full_equivalence_true_is_blocked_while_production_residuals_remain()
```

It should now fail until the flag/scorer is changed.

- [ ] **Step 3: Flip scorer/flag**

Only after Step 1 is green, change:

- `fullSioEquivalent=true`
- scorer away from `sio_compact_base_stats_transformer` to the verified full-equivalence scorer name selected by the codebase convention

- [ ] **Step 4: Run full verification**

Run:

```bash
cargo test -p tttg_forge_optimizer --test tech_optimizer_performance sio_lm_ -- --nocapture
node scripts/sio_full_equivalence_gate.mjs
cargo fmt --check
git diff --check
```

Expected:

- Rust `sio_lm_` suite PASS
- gate `G6_canFlipFullSioEquivalent=true`
- `fullSioEquivalent=true`
- no format or whitespace failures

- [ ] **Step 5: Update artifacts and Brain handoff**

Update all listed artifacts with:

- exact pass/fail counts
- final gate JSON summary
- whether `fullSioEquivalent` is true or a blocker stopped the work
- all residual helper names removed or the exact blocker that remains

---

## Stop Conditions

Stop without flipping `fullSioEquivalent` if any of these happen:

- A production calibrated residual helper remains after source decomposition.
- Any qN/shared/default compact-only live trace fails on a scoring stat.
- `critRateFlux` is the only mismatch but the test is not using the explicit registered non-scoring mutable trace policy.
- A generated live case has `best.multiplier=null` or `decodedResults=[]`.
- A domain cannot be live-captured or mapped from local source bundles.
- The gate reports `G0=false`, `G1=false`, `G2=false`, `G3=false`, or `G6=false`.

When stopping, write the blocker to:

- `frontend/artifacts/td11/release_readiness_audit.md`
- `frontend/artifacts/td11/verification_summary.txt`
- `/Users/woosung/Desktop/Dev/Woosdom_Brain/00_System/Templates/from_codex.md`

Include the full failing command output, not a summary-only claim.
