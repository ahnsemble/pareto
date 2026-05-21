# SIO lm CritRateFlux And Calibration Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve the current qN/shared compact-only blocker without falsely flipping `fullSioEquivalent`, then continue decomposing calibrated equipment residuals into source formulas.

**Architecture:** Treat `critRateFlux` as an explicitly registered non-scoring mutable live trace artifact, not as a hidden broad ignore. Keep production scorer unchanged. Keep calibrated equipment helpers in production until each helper-covered delta has source-formula coverage and a calibration-removal probe stays green.

**Tech Stack:** Rust tests and optimizer code in `tttg_forge_optimizer`, score verification in `tttg_forge_core`, JSON/Markdown TD-11 artifacts under `frontend/artifacts/td11`.

---

### Task 1: CritRateFlux Equivalence Surface

**Files:**
- Modify: `tttg_forge_optimizer/tests/tech_optimizer_performance.rs`
- Modify: `frontend/artifacts/td11/s68_high_resonance_equipment_endgame_rollup.json`
- Modify: `frontend/artifacts/td11/sio_lm_equivalence_matrix.json`
- Modify: `frontend/artifacts/td11/release_readiness_audit.md`
- Modify: `frontend/artifacts/td11/verification_summary.txt`
- Modify: `/Users/woosung/Desktop/Dev/Woosdom_Brain/00_System/Templates/from_codex.md`

- [x] **Step 1: Write the failing test**

Add a test proving stats equivalence can ignore only registered non-scoring mutable trace artifacts while still failing real scoring stat mismatches.

- [x] **Step 2: Run RED**

Run:

```bash
cargo test -p tttg_forge_optimizer --test tech_optimizer_performance sio_lm_stats_equivalence_ignores_only_registered_non_scoring_mutable_trace_artifacts -- --nocapture
```

Expected: FAIL before the helper/policy exists.

- [x] **Step 3: Implement minimal helper**

Add a test-local helper that skips `critRateFlux` only, with a narrow name and no production scorer change.

- [x] **Step 4: Apply helper to qN/shared compact-only stats comparisons**

Use the helper in the two compact-only live trace tests that currently fail on `critRateFlux`.

- [x] **Step 5: Verify**

Run:

```bash
cargo test -p tttg_forge_optimizer --test tech_optimizer_performance sio_lm_stats_equivalence_ignores_only_registered_non_scoring_mutable_trace_artifacts -- --nocapture
cargo test -p tttg_forge_optimizer --test tech_optimizer_performance sio_lm_compact_only_reconstructs_qn5n40_live_trace_without_supplied_context -- --nocapture
cargo test -p tttg_forge_optimizer --test tech_optimizer_performance sio_lm_compact_only_reconstructs_remaining_shared_live_traces_without_supplied_context -- --nocapture
```

Expected: all three pass if no other qN/shared stats mismatch remains.

### Task 2: Calibration Residual Decomposition

**Files:**
- Modify: `tttg_forge_optimizer/src/tech/sio_lm/equipment_transform.rs`
- Modify: `tttg_forge_optimizer/tests/tech_optimizer_performance.rs`
- Update the same TD-11 artifacts as Task 1.

- [x] **Step 1: Keep calibration in production**

Do not remove `CompactEquipmentCalibration`, `apply_compact_equipment_calibration`, or related loadout matchers until a source-formula replacement keeps qN/shared green with calibration disabled.

- [x] **Step 2: Select the first source slice**

Use calibration-removal probe output to pick the smallest source-backed field group. Prefer `damageTransmute` because live transmute formula coverage already exists and the remaining deltas are small.

Result: selected live module `24804` postprocess slices first (`evolvePassives` adrenaline multiplier and unit-interval condition uptime clamps) because the calibration-off probe exposed them as isolated source-backed residuals.

- [x] **Step 3: Add focused RED**

Write a focused test around the selected formula path before changing production code.

- [x] **Step 4: Implement one source formula**

Move exactly one calibrated field group from helper baseline toward source-formula coverage.

- [x] **Step 5: Probe calibration removal**

Run focused qN/shared tests with and without calibration. Keep `fullSioEquivalent=false` unless calibration removal is safe and gate G2 clears.

### Task 3: Final Verification And Reporting

- [x] Run `cargo test -p tttg_forge_optimizer --test tech_optimizer_performance sio_lm_ -- --nocapture`.
- [x] Run `cd frontend && node scripts/sio_full_equivalence_gate.mjs`.
- [x] Run `cargo fmt --check`.
- [x] Run `git diff --check`.
- [x] Update all TD-11 artifacts and `from_codex.md` with exact pass/fail output and blocker state.
