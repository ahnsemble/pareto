# Tangtang Generated Optimizer Multiplier Parity Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the generated optimizer successor gate from structural `18/26` to honest multiplier parity by fixing trace/worker alignment first, then the remaining Rust scoring residual.

**Outcome update (2026-05-29):** The old `18/26` number was a mixed trace/worker signal, so the gate now reports separate metrics instead of treating it as success. Verified structural optimizer parity is `26/26` for row signature, active skills, chips, parts, overload, scorer, and full flag. Live-worker multiplier parity remains red at `0/26` because the checked-in live expected artifact and the stale trace artifact disagree, and the original May worker source needed to regenerate aligned traces is unavailable. Safe Rust fixes were still made for the two concrete candidate-selection defects found during the audit: broad collectible bridge rarity preservation and LME2 compact-only judgment bridge effective-stat selection.

**Architecture:** Keep public Tangtang UI untouched. Add a small trace-alignment helper used by trace generation and gate scripts so `tracedMultiplier` is only compared when its row and enabled skill set match `workerCase.best`. For the one real Rust residual, preserve the worker row rarity in generated bridge candidates so reconstruction sees the same tech row the live worker scored.

**Tech Stack:** Node ESM scripts, Rust `tttg_forge_optimizer`, WASM package rebuild, generated TD11 artifacts.

---

## File Structure

- Create: `frontend/scripts/lib/sio_lm_trace_alignment.mjs`
  - Pure helpers for row signature normalization, skill-bit comparison, and aligned trace selection.
- Create: `frontend/scripts/sio_lm_trace_alignment_unit_test.mjs`
  - RED/GREEN unit tests for helper behavior without loading the minified worker.
- Modify: `frontend/scripts/sio_lm_trace_summary.mjs`
  - Collect all LM traces from the patched worker.
  - Select the trace matching `workerCase.best.rowSignature` and `workerCase.best.skillBits`.
  - Emit explicit `traceAlignment`.
- Modify: `frontend/scripts/sio_generated_optimizer_parity_gate.mjs`
  - Require aligned trace metadata before using `traceCase.tracedMultiplier`.
  - Report alignment failures separately from Rust multiplier residuals.
- Modify: `tttg_forge_optimizer/src/tech/sio_solver.rs`
  - Carry optional worker/live rarity through `SioSkillsRobot`.
- Modify: `tttg_forge_optimizer/src/tech_search.rs`
  - Preserve rarity in generated bridge rows and in LM reconstruction tech rows.
- Test: `tttg_forge_optimizer/tests/tech_optimizer_performance.rs`
  - Add/extend RED tests for broad collectible multiplier parity.

## Task 1: Trace Alignment Helper

**Files:**
- Create: `frontend/scripts/lib/sio_lm_trace_alignment.mjs`
- Create: `frontend/scripts/sio_lm_trace_alignment_unit_test.mjs`

- [x] **Step 1: Write the failing helper test**

Create a test fixture where a higher-scoring trace has the wrong row or enabled skills, and a lower-scoring trace matches `workerCase.best`.

Run: `node scripts/sio_lm_trace_alignment_unit_test.mjs`

Expected: FAIL because the helper does not exist.

- [x] **Step 2: Implement minimal helper**

Implement:
- `traceRowSignature(traceTechs)`
- `enabledSkillNamesFromBits(skillBits, skillOrder)`
- `enabledSkillNamesFromTraceSkills(traceSkills)`
- `selectAlignedLmTrace(traces, workerCase, skillOrder)`

The helper must return `{ trace, alignment }` where `alignment.rowMatches`, `alignment.enabledSkillsMatch`, and `alignment.aligned` are explicit booleans.

- [x] **Step 3: Verify helper GREEN**

Run: `node scripts/sio_lm_trace_alignment_unit_test.mjs`

Expected: PASS.

## Task 2: Trace Summary Uses Row-Aligned Trace

**Files:**
- Modify: `frontend/scripts/sio_lm_trace_summary.mjs`
- Modify: `frontend/scripts/sio_generated_optimizer_parity_gate.mjs`

- [ ] **Step 1: Write RED script-level assertion**

Extend the helper test or add a focused script assertion that the known generated cases no longer use a mismatched trace when a matching trace exists:
- `pets_xeno_awakening_sync_rate`
- `survivors_passives_harmony_teamwork`
- collection/custom-set row mismatch cases

Run: `node scripts/sio_lm_trace_alignment_unit_test.mjs`

Expected: FAIL until `sio_lm_trace_summary.mjs` emits aligned traces.

- [x] **Step 2: Collect all traces in patched worker**

Change both minified `scoreReplacement` strings so each score builds a trace object, pushes it into `self.__lmTraces`, and still updates `self.__bestLmTrace`.

- [x] **Step 3: Select aligned trace**

In `traceCase(...)`, use `selectAlignedLmTrace(context.__lmTraces, workerCase, catalog.J3)`.

Emit:
- `tracedMultiplier` from the selected aligned trace.
- `traceAlignment`.
- previous highest trace fields only if useful for diagnostics.

- [x] **Step 4: Gate alignment guard**

In `sio_generated_optimizer_parity_gate.mjs`, use `traceCase.tracedMultiplier` only when `traceCase.traceAlignment.aligned === true`; otherwise mark `traceAlignmentMatches=false` and keep the case red as fixture/reference alignment, not Rust multiplier failure.

- [x] **Step 5: Verify generated trace/gate**

Result: `sio_lm_trace_summary.mjs` can emit aligned trace metadata when a compatible worker source is available. The checked-in stale `lm_trace_summary.json` has no `traceAlignment`, so the successor gate reports `traceAlignmentAvailable=0/26`, `traceMultiplierUnavailable=26/26`, and does not use trace-first parity as the primary pass signal.

Run:

```bash
cd /Users/woosung/Desktop/Dev/Projects/pareto/frontend
TRACE_LM_TECH_STAGE=1 node scripts/sio_lm_trace_summary.mjs \
  --ignored-by-script-env-only
node scripts/sio_generated_optimizer_parity_gate.mjs
```

Expected: the first seven previous mismatch cases should stop failing because of stale/mixed trace expected values, or should be reported as explicit trace-alignment failures with evidence.

## Task 3: Broad Collectible Rarity/Multiplier Residual

**Files:**
- Modify: `tttg_forge_optimizer/src/tech/sio_solver.rs`
- Modify: `tttg_forge_optimizer/src/tech_search.rs`
- Modify: `tttg_forge_optimizer/tests/tech_optimizer_performance.rs`

- [x] **Step 1: Write RED Rust test**

Extend the generated optimizer fixture test to assert `collectibles_broad_item_tech_set_endgame_fold` top multiplier matches the aligned trace multiplier within `1e-9`.

Run:

```bash
cargo test -p tttg_forge_optimizer tech_optimizer_uses_lm_preselect_width_for_resonance_candidates -- --nocapture
```

Expected: FAIL around `350.493e15` actual vs `425.4e15` expected.

- [x] **Step 2: Preserve worker row rarity**

Add `rarity: Option<SioRarity>` to `SioSkillsRobot`. Default generic candidates preserve existing behavior. Bridge candidates can set explicit rarity for rows where worker row signature includes it.

For `collectibles_broad_item_tech_set_endgame_fold`, set:
- `phaseDriver` + `boomerangMode`: `Eternal`
- `exoRadicator` + `guardianMode`: `Eternal`

- [x] **Step 3: Use explicit rarity in LM reconstruction**

Update `candidate_techs_for_captured_lm(...)` to emit `rarity` from `robot.rarity` before falling back to existing EGS/AM/QN/all-Eternal inference.

- [x] **Step 4: Verify GREEN**

Run:

```bash
cargo test -p tttg_forge_optimizer tech_optimizer_uses_lm_preselect_width_for_resonance_candidates -- --nocapture
cargo test -p tttg_forge_optimizer tech_optimizer_ -- --nocapture
```

Expected: PASS.

## Task 4: Remaining Requirement Audit

**Files:**
- Modify if needed: existing tests/scripts only.

- [x] **Step 1: Rerun original P1/P2 verification set**

Run the known minimum verification commands plus any new trace-alignment test.

- [x] **Step 2: Browser/static check**

If build passes, run a lightweight static/browser check for `/ko/v3/optimizer/tech-parts`, public copy guard, and share link surface.

- [x] **Step 3: Record final status**

Update `/Users/woosung/Desktop/Dev/Woosdom_Brain/00_System/Templates/from_codex.md` with:
- exact decision
- final gate summary
- residuals, if any
- verification output
- commit hash
- no deploy / no push / no PR

## Task 5: Commit

- [ ] **Step 1: Check status**

Run: `git status --short --branch`

Confirm the two existing untracked plan files remain untouched.

- [ ] **Step 2: Commit scoped changes**

Run:

```bash
git add frontend/scripts/lib/sio_lm_trace_alignment.mjs \
  frontend/scripts/sio_lm_trace_alignment_unit_test.mjs \
  frontend/scripts/sio_lm_trace_summary.mjs \
  frontend/scripts/sio_generated_optimizer_parity_gate.mjs \
  tttg_forge_optimizer/src/tech/sio_solver.rs \
  tttg_forge_optimizer/src/tech_search.rs \
  tttg_forge_optimizer/tests/tech_optimizer_performance.rs \
  tttg_forge_wasm/pkg/tttg_forge_wasm_bg.wasm \
  docs/superpowers/plans/2026-05-29-tangtang-generated-optimizer-multiplier-parity.md
git commit -m "fix: align generated optimizer multiplier parity"
```

Expected: one local commit, no push/PR/deploy.
