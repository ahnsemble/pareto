# Pareto V3 Sio Parity And Performance Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring Pareto V3 Tech Parts UX/data/formulas up to sio-tools parity, then make optimization practical at seconds-to-minutes latency rather than hours.

**Architecture:** Keep Pareto as the primary product and use the existing sio-tools GT documents as authority. Preserve already integrated assets where they are correct, move Tech Parts from flat slot-based UI/state into a multidimensional model, expose Rust/WASM APIs for calculation and optimization, and keep React focused on configuration and progress display. Performance work must be evidence-driven: first benchmark, then optimize Rust/WASM search, then verify with browser and cargo logs.

**Tech Stack:** Rust workspace (`tttg_forge_core`, `tttg_forge_optimizer`, `tttg_forge_wasm`), wasm-bindgen package consumed by Next.js 15/React 19, Zustand store, Comlink Web Worker, Playwright, existing cargo tests and benchmark utilities.

---

## Scope And Non-Scope

This plan is based on:

- `/Users/woosung/Desktop/Dev/Woosdom_Brain/00_System/Templates/to_codex_2.md`
- `/Users/woosung/Desktop/Dev/Woosdom_Brain/00_System/Brainstorm/pareto_v3_vs_sio_handoff_to_codex_2026-05-19.md`
- current Pareto worktree: `/Users/woosung/Desktop/Dev/Projects/pareto`

Non-scope:

- Domain purchase.
- Production deployment.
- Git push, force branch operations, or external publishing without explicit approval.
- Writing to `/Users/woosung/Desktop/Dev/Projects/pareto-v3-rust-wasm-port`.

Execution decision:

- User approved continuous execution preference: M1 and M2 are internal checkpoints, not mandatory human-review pauses.
- Write checkpoint evidence into `from_codex_2.md` after M1 and M2, then continue automatically unless a Plan B critical stop triggers.
- Initial UI parity may proceed from GT documents and prior site analysis. Additional sio-tools screenshots are deferred to the visual QA/hardening pass and should be used to refine, not block, the first implementation pass.

Important current-state correction:

- The handoff says only two Twinborn parts exist, but the current schema already contains Twinborn 10, Active Skills 18, Mode variants 12, and a Tech Modifier Matrix in `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/app/lib/pareto-store/schemas/index.ts`.
- The actual gap is now more precise: GT data has partly landed, but UI/state/API still expose flat `attack_1/2/3` and `defense_1/2/3` slots, and optimization remains synthetic or partially wired.

Latency target:

- Normal user optimization: first useful answer in under 3 seconds.
- Heavy exact run: final answer under 60 seconds when search-space pruning is effective.
- Huge exhaustive run: progressive best-so-far results within 3 seconds and final exact/approx answer under 3 minutes, with UI clearly labeling exact vs bounded/beam mode.
- If a search space is mathematically too large for exact mode, do not pretend it is exact. Return bounded/beam results plus metrics.

2026-05-20 stabilization decision:

- Do not restart from a blank rewrite. The current Tech data model, WASM export, UI wiring, live sio fixture capture, and regression suite are working baseline assets.
- Perform a "cleanup rebuild" instead: preserve the public Rust/WASM/React surfaces, split the Tech optimizer internals into focused catalog/schema/solver modules, then add the real sio resonance-distribution solver behind those boundaries.
- Keep `full_sio_equivalent=false` until live sio golden fixtures pass through the adapter/solver path. A fast result is not sufficient if it is still the formula-adapter heuristic.
- Treat the captured live sio fixture file as a red parity target, not as a release-pass signal.

---

## File Structure Map

### Ground Truth Inputs

- Read only: `/Users/woosung/Desktop/Dev/Woosdom_Brain/01_Domains/시오툴/sio_tools_gt_master.md`
  - Tech Parts: lines 95-172.
  - Rarity: lines 296-300.
  - Data-model mismatch: lines 428-454.
- Read only: `/Users/woosung/Desktop/Dev/Woosdom_Brain/01_Domains/시오툴/sio_tools_formulas_and_defaults.md`
  - Default Techs: lines 351-359.
  - Optimizer schema: lines 500-549.
  - Tech modifier matrix recap: lines 551-599.
  - Damage calc mode: lines 636-660.

### Frontend Data And Store

- Modify: `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/app/lib/pareto-store/types/index.ts`
  - Replace `TechSlot` dependency for Tech Parts with multidimensional config types.
  - Keep old fields only in a migration/compat layer if tests require them during M1.
- Modify: `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/app/lib/pareto-store/schemas/index.ts`
  - Keep existing Twinborn 10, Active 18, Mode 12, and matrix.
  - Add defaults from sio formulas §3.7.
  - Move toward stable catalog exports.
- Modify: `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/app/lib/pareto-store/slices/index.ts`
  - Replace `equipped_slots` attack/defense map with `tech_configs`.
  - Add actions for rarity, mode, resonance, overload, support parts, twinborn level, deployed/equipped.
- Modify: `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/app/lib/pareto-store/selectors/index.ts`
  - Add selectors for Twinborn grid, active skills grid, selected config, and optimizer payload.
- Create: `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/app/lib/pareto-store/tech/types.ts`
  - TS-only types for Tech configuration, catalog IDs, optimizer payloads.
- Create: `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/app/lib/pareto-store/tech/defaults.ts`
  - sio default Tech configs.
- Create: `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/app/lib/pareto-store/tech/migration.ts`
  - One-way migration from old `equipped_slots`/`resonance_chip_allocated` shape into new configs.

### Frontend UI

- Modify: `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/components/v3/index.tsx`
  - Remove inline `TechSelectArray` implementation after replacement is ready.
  - Import new panel component.
- Create: `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/components/v3/tech/TechPartsPanel.tsx`
  - Top-level Tech Parts section.
- Create: `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/components/v3/tech/TechPartsGrid.tsx`
  - Twinborn 10 + Active Skills 18 + Mode variants 12 cards.
- Create: `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/components/v3/tech/TechPartConfigModal.tsx`
  - 7-element sio-style configuration modal.
- Create: `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/components/v3/tech/TechHexagonCard.tsx`
  - Hexagon visualization and rarity coloring.
- Create: `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/components/v3/tech/TechOptimizerStatus.tsx`
  - Progress, exact/beam mode, latency, visited/pruned nodes, cancel button.

### Rust Core And WASM

- Create: `/Users/woosung/Desktop/Dev/Projects/pareto/tttg_forge_core/src/tech_parts.rs`
  - Rust TechPart model, enums, defaults, validation.
- Create: `/Users/woosung/Desktop/Dev/Projects/pareto/tttg_forge_core/src/tech_modifier.rs`
  - Matrix calculation and tests.
- Modify: `/Users/woosung/Desktop/Dev/Projects/pareto/tttg_forge_core/src/lib.rs`
  - Export new modules.
- Modify: `/Users/woosung/Desktop/Dev/Projects/pareto/tttg_forge_core/src/constants.rs`
  - De-duplicate existing `passive_multiplier` constants or redirect to `tech_modifier`.
- Create: `/Users/woosung/Desktop/Dev/Projects/pareto/tttg_forge_optimizer/src/tech_search.rs`
  - Tech optimizer search-space construction, pruning, beam/exact runner.
- Create: `/Users/woosung/Desktop/Dev/Projects/pareto/tttg_forge_optimizer/src/tech/mod.rs`
  - Stable module boundary for Tech optimizer internals.
- Create: `/Users/woosung/Desktop/Dev/Projects/pareto/tttg_forge_optimizer/src/tech/catalog.rs`
  - Tech part IDs, mode IDs, mode weights, and sio display-name normalization.
- Create: `/Users/woosung/Desktop/Dev/Projects/pareto/tttg_forge_optimizer/src/tech/schema.rs`
  - Public sio optimizer option/profile structs and schema coverage helpers.
- Create later: `/Users/woosung/Desktop/Dev/Projects/pareto/tttg_forge_optimizer/src/tech/sio_solver.rs`
  - Real rarity inventory, fodder, chip allocation, active skill selection, and resonance distribution solver.
- Create: `/Users/woosung/Desktop/Dev/Projects/pareto/tttg_forge_optimizer/src/tech_upper_bound.rs`
  - Fast upper-bound estimates for Tech Parts and resource allocation.
- Create: `/Users/woosung/Desktop/Dev/Projects/pareto/tttg_forge_optimizer/src/tech_cache.rs`
  - Memoization key, dominance cache, precomputed coefficient vectors.
- Modify: `/Users/woosung/Desktop/Dev/Projects/pareto/tttg_forge_optimizer/src/lib.rs`
  - Export tech optimizer APIs.
- Create: `/Users/woosung/Desktop/Dev/Projects/pareto/tttg_forge_wasm/src/tech_parts.rs`
  - wasm-bindgen wrappers for Tech Parts APIs.
- Modify: `/Users/woosung/Desktop/Dev/Projects/pareto/tttg_forge_wasm/src/lib.rs`
  - Export JS functions.
- Modify: `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/app/lib/wasm.ts`
  - TypeScript wrappers for new exports.
- Modify: `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/app/lib/wasm-worker.ts`
  - Move expensive Tech optimization into Rust/WASM, not JS DFS.
- Modify: `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/app/lib/wasm-client.ts`
  - Preserve worker proxy. Add cancellation/versioning if needed.

### Tests And Artifacts

- Create: `/Users/woosung/Desktop/Dev/Projects/pareto/tttg_forge_core/tests/tech_parts_model.rs`
- Create: `/Users/woosung/Desktop/Dev/Projects/pareto/tttg_forge_core/tests/tech_modifier_matrix.rs`
- Create: `/Users/woosung/Desktop/Dev/Projects/pareto/tttg_forge_optimizer/tests/tech_optimizer_performance.rs`
- Create: `/Users/woosung/Desktop/Dev/Projects/pareto/tttg_forge_wasm/tests/tech_parts_exports.rs`
- Create: `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/scripts/tech_optimizer_benchmark.mjs`
- Create: `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/e2e/v3_tech_parts_ui.spec.ts`
- Create artifact directory per run: `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/artifacts/td11-tech-parts-performance/`

---

## Chunk 0: Launch Gate And Baseline Capture

## Chunk S7: Cleanup Rebuild Before Real SIO Solver

### Task S7.1: Preserve the current verified surface

**Files:**
- Modify: `/Users/woosung/Desktop/Dev/Projects/pareto/docs/superpowers/plans/2026-05-20-pareto-v3-sio-parity-performance.md`
- Modify: `/Users/woosung/Desktop/Dev/Woosdom_Brain/00_System/Templates/from_codex.md`
- Modify: `/Users/woosung/Desktop/Dev/Woosdom_Brain/00_System/Templates/from_codex_2.md`

- [x] **Step 1: Record the cleanup-rebuild decision**

Document that the project should keep existing validated Tech UI/WASM/test work and split internals instead of starting a blank rewrite.

- [x] **Step 2: Keep release guard language**

Ensure the docs still say full sio replacement remains blocked until live fixture parity passes.

### Task S7.2: Extract Tech catalog/schema internals

**Files:**
- Create: `/Users/woosung/Desktop/Dev/Projects/pareto/tttg_forge_optimizer/src/tech/mod.rs`
- Create: `/Users/woosung/Desktop/Dev/Projects/pareto/tttg_forge_optimizer/src/tech/catalog.rs`
- Create: `/Users/woosung/Desktop/Dev/Projects/pareto/tttg_forge_optimizer/src/tech/schema.rs`
- Modify: `/Users/woosung/Desktop/Dev/Projects/pareto/tttg_forge_optimizer/src/lib.rs`
- Modify: `/Users/woosung/Desktop/Dev/Projects/pareto/tttg_forge_optimizer/src/tech_search.rs`
- Test: `/Users/woosung/Desktop/Dev/Projects/pareto/tttg_forge_optimizer/tests/tech_optimizer_performance.rs`

- [x] **Step 1: Write the failing module-boundary test**

Add a focused test that imports `tttg_forge_optimizer::tech::skill_name_to_mode` and verifies sio labels such as `Drone Mode`, `Drill Shot Mode`, and `Guardian Mode`.

- [x] **Step 2: Run the focused test and confirm it fails**

Run:

```bash
cargo test -p tttg_forge_optimizer --test tech_optimizer_performance tech_catalog_normalizes_sio_display_mode_names
```

Expected: compile failure because `tttg_forge_optimizer::tech` is not exported yet.

- [x] **Step 3: Move catalog/schema code behind `tech`**

Move constants, `mode_weight`, `skill_name_to_mode`, `TechOptimizerOptions`, `TechOptimizerMode`, and sio profile structs out of `tech_search.rs`, then re-export public option/profile types from `tech_search.rs` for backwards compatibility.

- [x] **Step 4: Run the focused test and existing optimizer test**

Run:

```bash
cargo test -p tttg_forge_optimizer --test tech_optimizer_performance
```

Expected: all optimizer tests pass with unchanged behavior.

### Task S7.3: Verify fixture harness still exposes the real gap

**Files:**
- Modify: `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/artifacts/td11/verification_summary.txt`
- Modify: `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/artifacts/td11/release_readiness_audit.md`

- [x] **Step 1: Re-run the live fixture parity harness in mismatch-allowed mode**

Run:

```bash
cd /Users/woosung/Desktop/Dev/Projects/pareto/frontend
ALLOW_MISMATCH=1 node scripts/sio_tech_optimizer_parity_check.mjs
```

Expected: command exits 0 while reporting `passed=0`, `failed=3`, proving the gap is still visible and not hidden.

- [x] **Step 2: Re-run full relevant verification**

Run Rust optimizer tests, WASM export tests, JS syntax checks, and full workspace tests before claiming completion.

## Chunk S8: Real SIO Solver Foundation

### Task S8.1: Import live solver constants into Rust

**Files:**
- Create: `/Users/woosung/Desktop/Dev/Projects/pareto/tttg_forge_optimizer/src/tech/sio_solver.rs`
- Modify: `/Users/woosung/Desktop/Dev/Projects/pareto/tttg_forge_optimizer/src/tech/mod.rs`
- Test: `/Users/woosung/Desktop/Dev/Projects/pareto/tttg_forge_optimizer/tests/tech_optimizer_performance.rs`

- [x] **Step 1: Inspect live sio-tools bundle**

Confirmed rarity order, resonance values, legend-credit conversion, twin chip multipliers, resonance targets, rich targets, and overload constants from the live Next.js bundle.

- [x] **Step 2: Write the failing solver-foundation test**

Added `sio_solver_expands_live_optimizer_rarity_inventory`.

- [x] **Step 3: Run test red**

Run:

```bash
cargo test -p tttg_forge_optimizer --test tech_optimizer_performance sio_solver_expands_live_optimizer_rarity_inventory
```

Expected/observed: unresolved import because `tttg_forge_optimizer::tech::sio_solver` did not exist.

- [x] **Step 4: Implement first solver primitives**

Implemented `SioRarity`, `ExpandedRarityInventory`, `expand_rarity_inventory`, twin multiplier lookup, resonance calculation, resonance target lookup, and overload constants.

- [x] **Step 5: Verify green**

Run:

```bash
cargo test -p tttg_forge_optimizer --test tech_optimizer_performance
cargo test --workspace
ALLOW_MISMATCH=1 node frontend/scripts/sio_tech_optimizer_parity_check.mjs
```

Expected/observed: optimizer tests passed, workspace passed, parity guard still reported live sio mismatch `0/3`.

## Chunk S9: SIO Resonance Worker Search Primitives

### Task S9.1: Port live resonance frontier pruning

**Files:**
- Modify: `/Users/woosung/Desktop/Dev/Projects/pareto/tttg_forge_optimizer/src/tech/sio_solver.rs`
- Test: `/Users/woosung/Desktop/Dev/Projects/pareto/tttg_forge_optimizer/tests/tech_optimizer_performance.rs`

- [x] **Step 1: Confirm live worker behavior**

Confirmed the live bundle's resonance frontier insertion function compares candidate robot `target` values and `chipRemainder`, then skips dominated candidates or removes dominated existing frontier rows.

- [x] **Step 2: Write RED test**

Added `sio_resonance_frontier_prunes_dominated_candidates_like_live_worker`.

- [x] **Step 3: Implement Rust primitive**

Added `SioResonanceRobot`, `SioResonanceCandidate`, and `push_resonance_frontier()`.

### Task S9.2: Port live robot triple prefix task generation

**Files:**
- Modify: `/Users/woosung/Desktop/Dev/Projects/pareto/tttg_forge_optimizer/src/tech/sio_solver.rs`
- Test: `/Users/woosung/Desktop/Dev/Projects/pareto/tttg_forge_optimizer/tests/tech_optimizer_performance.rs`

- [x] **Step 1: Confirm live grouping window**

Confirmed the live worker groups remaining parts into 3-part robot prefixes, expands the rarity lookup window by `lookupDepth`, and dedupes generated task prefixes.

- [x] **Step 2: Write RED test**

Added `sio_resonance_task_generator_uses_live_worker_lookup_window`.

- [x] **Step 3: Implement Rust primitive**

Added `SioResonanceTask` and `generate_resonance_prefix_tasks()`.

- [x] **Step 4: Verify**

Run:

```bash
cargo test -p tttg_forge_optimizer --test tech_optimizer_performance
cargo test --workspace
ALLOW_MISMATCH=1 node frontend/scripts/sio_tech_optimizer_parity_check.mjs
```

Observed: optimizer tests passed with `9 passed`, workspace passed, parity guard still correctly reported live sio mismatch `0/3`.

## Chunk S10: SIO Chip Distribution Primitive

### Task S10.1: Download and inspect the resonance worker chunk

**Files:**
- Read: `https://sio-tools.vercel.app/_next/static/chunks/9157.a8e1c92e9a3358da.js`
- Scratch: `/tmp/sio-tools-src.YizoyI/worker-resonance.pretty.js`

- [x] **Step 1: Locate the dynamic worker**

Confirmed module `37024` registers `"resonance"` as dynamic chunk `9157.a8e1c92e9a3358da.js`.

- [x] **Step 2: Identify the chip distribution stage**

Confirmed the live worker generates non-dominated twin-chip distributions, filters by extra legend cost, and emits precise-mode permutations.

### Task S10.2: Port chip distribution generation

**Files:**
- Modify: `/Users/woosung/Desktop/Dev/Projects/pareto/tttg_forge_optimizer/src/tech/sio_solver.rs`
- Test: `/Users/woosung/Desktop/Dev/Projects/pareto/tttg_forge_optimizer/tests/tech_optimizer_performance.rs`

- [x] **Step 1: Write RED test**

Added `sio_chip_distribution_matches_live_worker_thresholds_and_precise_permutations`.

- [x] **Step 2: Implement Rust primitive**

Added `SioChipDistribution`, `SIO_TWIN_CHIP_THRESHOLDS`, and `generate_chip_distributions()`.

- [x] **Step 3: Verify**

Run:

```bash
cargo test -p tttg_forge_optimizer --test tech_optimizer_performance
cargo test --workspace
ALLOW_MISMATCH=1 node frontend/scripts/sio_tech_optimizer_parity_check.mjs
```

Observed: optimizer tests passed with `10 passed`, workspace passed, parity guard still correctly reported live sio mismatch `0/3`.

## Chunk S11: SIO Resonance Search Execution Primitive

### Task S11.1: Port group/chip candidate execution

**Files:**
- Modify: `/Users/woosung/Desktop/Dev/Projects/pareto/tttg_forge_optimizer/src/tech/sio_solver.rs`
- Test: `/Users/woosung/Desktop/Dev/Projects/pareto/tttg_forge_optimizer/tests/tech_optimizer_performance.rs`

- [x] **Step 1: Write RED test**

Added `sio_resonance_search_executes_group_and_chip_candidates_like_live_worker`.

- [x] **Step 2: Implement Rust primitive**

Added `SioResonanceSearchOptions` and `run_resonance_search()` to combine prefix tasks, remaining 3-part groups, chip distributions, resonance range filters, monotonic resonance filtering, and target/chip frontier pruning.

- [x] **Step 3: Verify**

Run:

```bash
cargo test -p tttg_forge_optimizer --test tech_optimizer_performance
cargo test --workspace
ALLOW_MISMATCH=1 node frontend/scripts/sio_tech_optimizer_parity_check.mjs
```

Observed: optimizer tests passed with `11 passed`, workspace passed, parity guard still correctly reported live sio mismatch `0/3`.

## Chunk S12: SIO Skills Worker Mode/Overload Primitives

### Task S12.1: Port mode assignment and overload candidate rules

**Files:**
- Read: `/tmp/sio-tools-src.YizoyI/worker-skills.pretty.js`
- Modify: `/Users/woosung/Desktop/Dev/Projects/pareto/tttg_forge_optimizer/src/tech/sio_solver.rs`
- Test: `/Users/woosung/Desktop/Dev/Projects/pareto/tttg_forge_optimizer/tests/tech_optimizer_performance.rs`

- [x] **Step 1: Confirm live skills worker rules**

Confirmed the live worker builds mode assignments through index-combination plus cartesian-product generation, filters each assigned mode by min/max resonance, caps overload by resonance threshold, filters overload by chip/extra-legend budgets, and prunes component-wise dominated overload vectors.

- [x] **Step 2: Write RED test**

Added `sio_skills_worker_mode_and_overload_primitives_follow_live_rules`.

- [x] **Step 3: Implement Rust primitive**

Added `SioModeConstraint`, `generate_mode_assignments()`, `filter_mode_assignments_for_resonance()`, `overload_level_for_resonance()`, `available_overload_levels()`, and `generate_overload_combinations()`.

- [x] **Step 4: Verify**

Run:

```bash
cargo test -p tttg_forge_optimizer --test tech_optimizer_performance
cargo test --workspace
ALLOW_MISMATCH=1 node frontend/scripts/sio_tech_optimizer_parity_check.mjs
```

Observed: optimizer tests passed with `12 passed`, workspace passed, parity guard still correctly reported live sio mismatch `0/3`.

## Chunk S13: SIO Skills Candidate Execution Primitive

### Task S13.1: Connect resonance candidates to skills-worker candidate rows

**Files:**
- Read: `/tmp/sio-tools-src.YizoyI/worker-skills.pretty.js`
- Modify: `/Users/woosung/Desktop/Dev/Projects/pareto/tttg_forge_optimizer/src/tech/sio_solver.rs`
- Test: `/Users/woosung/Desktop/Dev/Projects/pareto/tttg_forge_optimizer/tests/tech_optimizer_performance.rs`

- [x] **Step 1: Confirm live outer candidate loop**

Confirmed the worker permutes resonance robots, dedupes target signatures, filters mode assignments, generates overload vectors under chip/legend budgets, and pushes top-k candidate rows.

- [x] **Step 2: Write RED test**

Added `sio_skills_candidate_search_expands_resonance_candidates_like_live_worker`.

- [x] **Step 3: Implement Rust primitive**

Added `SioSkillsSearchOptions`, `SioSkillsRobot`, `SioSkillsCandidate`, and `run_skills_candidate_search()`. The primitive uses a provisional multiplier placeholder until the live `lm()` multiplier objective is ported.

- [x] **Step 4: Verify**

Run:

```bash
cargo test -p tttg_forge_optimizer --test tech_optimizer_performance
cargo test --workspace
ALLOW_MISMATCH=1 node frontend/scripts/sio_tech_optimizer_parity_check.mjs
```

Observed: optimizer tests passed with `13 passed`, workspace passed, parity guard still correctly reported live sio mismatch `0/3`.

## Chunk S14: SIO Mode Coefficient Scorer

### Task S14.1: Replace mode-agnostic placeholder ordering

**Files:**
- Modify: `/Users/woosung/Desktop/Dev/Projects/pareto/tttg_forge_optimizer/src/tech/sio_solver.rs`
- Test: `/Users/woosung/Desktop/Dev/Projects/pareto/tttg_forge_optimizer/tests/tech_optimizer_performance.rs`

- [x] **Step 1: Write RED test**

Added `sio_skills_candidate_search_ranks_modes_by_sio_damage_coefficient`.

- [x] **Step 2: Implement coefficient-aware scorer**

Updated the skills candidate multiplier placeholder to include SIO mode damage coefficients from `tttg_forge_core::constants::damage_coefficient`, with camelCase mode id normalization.

- [x] **Step 3: Verify**

Run:

```bash
cargo test -p tttg_forge_optimizer --test tech_optimizer_performance
cargo test --workspace
ALLOW_MISMATCH=1 node frontend/scripts/sio_tech_optimizer_parity_check.mjs
```

Observed: optimizer tests passed with `14 passed`, workspace passed, parity guard still correctly reported live sio mismatch `0/3`.

## Chunk S15: Exported Optimizer SIO Candidate Path

### Task S15.1: Route live optimize requests through Rust SIO candidate generation

**Files:**
- Modify: `/Users/woosung/Desktop/Dev/Projects/pareto/tttg_forge_optimizer/src/tech_search.rs`
- Modify: `/Users/woosung/Desktop/Dev/Projects/pareto/tttg_forge_optimizer/src/tech/sio_solver.rs`
- Test: `/Users/woosung/Desktop/Dev/Projects/pareto/tttg_forge_optimizer/tests/tech_optimizer_performance.rs`

- [x] **Step 1: Write RED test**

Added `tech_optimizer_uses_sio_candidate_generation_for_optimize_strategy`.

- [x] **Step 2: Implement exported branch**

Added a `strategy=optimize` branch that builds SIO candidate rows from rarity inputs, chip budgets, mode options, and Rust SIO solver primitives. Kept `precise+` formula-adapter tests on the existing path to avoid conflating the partial SIO branch with the older adapter.

- [x] **Step 3: Verify**

Run:

```bash
cargo test -p tttg_forge_optimizer --test tech_optimizer_performance
cargo test -p tttg_forge_wasm --test tech_parts_exports
cargo test --workspace
cd tttg_forge_wasm && wasm-pack build --target web --release -- --features compat-exports
ALLOW_MISMATCH=1 node frontend/scripts/sio_tech_optimizer_parity_check.mjs
```

Observed: optimizer tests passed with `15 passed`, wasm export tests passed with `7 passed`, workspace passed, wasm rebuild passed, and parity guard still reports full parity `0/3`.

- [x] **Step 4: Measure row-mode overlap**

Observed after S15:

```text
default_normal_legend2_epic8_chips100: 6/6
default_normal_legend1_epic6_chips40: 5/6
default_normal_legend3_epic12_chips180: 6/6
```

## Chunk S16: Row Signature Edge

### Task S16.1: Match Phase Driver low-resonance mode edge

**Files:**
- Modify: `/Users/woosung/Desktop/Dev/Projects/pareto/tttg_forge_optimizer/src/tech/sio_solver.rs`
- Modify: `/Users/woosung/Desktop/Dev/Projects/pareto/tttg_forge_optimizer/src/tech_search.rs`
- Test: `/Users/woosung/Desktop/Dev/Projects/pareto/tttg_forge_optimizer/tests/tech_optimizer_performance.rs`

- [x] **Step 1: Write RED test**

Added `tech_optimizer_uses_boomerang_for_zero_resonance_phase_driver_like_live_fixture`.

- [x] **Step 2: Implement edge correction**

Made Phase Driver mode preference resonance-aware and added `permute_robots` to keep exported optimize rows aligned with generated robot order while preserving permutation support in the solver primitive.

- [x] **Step 3: Verify**

Run:

```bash
cargo test -p tttg_forge_optimizer --test tech_optimizer_performance
cargo test -p tttg_forge_wasm --test tech_parts_exports
cargo test --workspace
cd tttg_forge_wasm && wasm-pack build --target web --release -- --features compat-exports
ALLOW_MISMATCH=1 node frontend/scripts/sio_tech_optimizer_parity_check.mjs
```

Observed: optimizer tests passed with `16 passed`, wasm export tests passed with `7 passed`, workspace passed, wasm rebuild passed, and full parity guard remains `0/3`.

- [x] **Step 4: Measure row-mode overlap**

Observed after S16:

```text
default_normal_legend2_epic8_chips100: 6/6
default_normal_legend1_epic6_chips40: 6/6
default_normal_legend3_epic12_chips180: 6/6
```

## Chunk S17: Parity Report Split

### Task S17.1: Separate row-signature and multiplier parity

**Files:**
- Modify: `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/scripts/sio_tech_optimizer_parity_check.mjs`

- [x] **Step 1: Update report shape**

Added per-case `rowSignaturePass`, `multiplierPass`, and `multiplierRelativeError`, plus summary counts for row-signature and multiplier parity.

- [x] **Step 2: Verify**

Run:

```bash
ALLOW_MISMATCH=1 node frontend/scripts/sio_tech_optimizer_parity_check.mjs
```

Observed:

```json
{
  "passed": 0,
  "failed": 3,
  "rowSignaturePassed": 3,
  "rowSignatureFailed": 0,
  "multiplierPassed": 0,
  "multiplierFailed": 3
}
```

## Chunk S18: Live Worker Message Capture

### Task S18.1: Capture internal worker inputs and outputs

**Files:**
- Modify: `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/scripts/sio_tech_optimizer_live_capture.mjs`
- Generated: `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/artifacts/td11/sio-tech-live-worker-messages/*.json`

- [x] **Step 1: Install Worker recorder**

Patched `window.Worker` before page load and recorded `postMessage` payloads in both directions.

- [x] **Step 2: Recapture live cases**

Run:

```bash
node frontend/scripts/sio_tech_optimizer_live_capture.mjs
```

Observed: recaptured 3 live cases and wrote per-case worker message artifacts.

- [x] **Step 3: Verify parity report still distinguishes remaining gap**

Run:

```bash
ALLOW_MISMATCH=1 node frontend/scripts/sio_tech_optimizer_parity_check.mjs
```

Observed: full parity `0/3`, row signature parity `3/3`, multiplier parity `0/3`.

- [x] **Step 4: Identify next useful data**

Skills worker requests now expose `configString`, `tasks`, `skillsMap`, `robotNames`, `modes`, and `skillsCount`; these are the live inputs needed to port/compare the `lm()` multiplier objective.

### Task 0.1: Confirm launch conditions

**Files:**
- Read: `/Users/woosung/Desktop/Dev/Woosdom_Brain/00_System/Templates/to_codex_2.md`
- Read: `/Users/woosung/Desktop/Dev/Woosdom_Brain/00_System/Brainstorm/pareto_v3_vs_sio_handoff_to_codex_2026-05-19.md`
- Write later: `/Users/woosung/Desktop/Dev/Woosdom_Brain/00_System/Templates/from_codex_2.md`

- [ ] **Step 1: Confirm that TD-11 is approved to launch**

Required human/Brain signal:

```text
TD-11 launch approved. Codex#2 may overwrite from_codex_2.md. Run continuously through M1/M2/M3 unless Plan B triggers.
```

- [ ] **Step 2: Record launch status**

Do not edit source yet. Record in notes:

```text
status_at_launch=[S2-RESUME]
scope=TD-11 plus performance track
deployment_excluded=true
domain_purchase_excluded=true
```

### Task 0.2: Capture clean worktree and baseline evidence

**Files:**
- Read: `/Users/woosung/Desktop/Dev/Projects/pareto/.git`
- Create: `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/artifacts/td11-tech-parts-performance/00_git_status.log`
- Create: `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/artifacts/td11-tech-parts-performance/00_baseline_counts.log`

- [ ] **Step 1: Create artifacts directory**

Run:

```bash
mkdir -p /Users/woosung/Desktop/Dev/Projects/pareto/frontend/artifacts/td11-tech-parts-performance
```

- [ ] **Step 2: Capture git status**

Run:

```bash
git -C /Users/woosung/Desktop/Dev/Projects/pareto branch --show-current
git -C /Users/woosung/Desktop/Dev/Projects/pareto log -1 --oneline
git -C /Users/woosung/Desktop/Dev/Projects/pareto status --short
```

Expected:

```text
branch feature/v3-data-model-full-redesign-2026-05-19
HEAD 6e54ef9 or later
status clean unless user made new changes
```

- [ ] **Step 3: Capture current Tech gap grep**

Run:

```bash
rg -n "attack_1|attack_2|attack_3|defense_1|defense_2|defense_3|TechSelectArray|equipped_slots" /Users/woosung/Desktop/Dev/Projects/pareto
```

Expected:

```text
Hits exist before work. This is the red baseline.
```

### Task 0.3: Baseline verification before code changes

**Files:**
- Create: `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/artifacts/td11-tech-parts-performance/00_cargo_baseline.log`
- Create: `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/artifacts/td11-tech-parts-performance/00_playwright_baseline.log`
- Create: `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/artifacts/td11-tech-parts-performance/00_wasm_size_baseline.log`

- [ ] **Step 1: Run Rust baseline**

Run:

```bash
cd /Users/woosung/Desktop/Dev/Projects/pareto
cargo test --workspace
```

Expected:

```text
425 passed / 0 failed or explain exact current delta.
```

- [ ] **Step 2: Run V3 Playwright baseline**

Run:

```bash
cd /Users/woosung/Desktop/Dev/Projects/pareto/frontend
PLAYWRIGHT_PORT=3037 npx playwright test e2e/v3_smoke_test.spec.ts e2e/v3_optimizer_routes.spec.ts e2e/v3_sio_live_fixture.spec.ts --project=chromium-desktop
```

Expected:

```text
27 passed / 0 failed or explain exact current delta.
```

- [ ] **Step 3: Capture WASM size**

Run:

```bash
wc -c /Users/woosung/Desktop/Dev/Projects/pareto/tttg_forge_wasm/pkg/tttg_forge_wasm_bg.wasm
```

Expected:

```text
<= 400000 bytes.
```

---

## Chunk 1: M1 Diagnosis And Data Model Redesign

### Task 1.1: Write diagnosis document

**Files:**
- Read: `/Users/woosung/Desktop/Dev/Woosdom_Brain/01_Domains/시오툴/sio_tools_gt_master.md`
- Read: `/Users/woosung/Desktop/Dev/Woosdom_Brain/01_Domains/시오툴/sio_tools_formulas_and_defaults.md`
- Read: `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/app/lib/pareto-store/schemas/index.ts`
- Read: `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/app/lib/pareto-store/slices/index.ts`
- Read: `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/components/v3/index.tsx`
- Create: `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/artifacts/td11-tech-parts-performance/01_diagnosis_v3_current_state.md`

- [ ] **Step 1: Cite GT counts**

Run:

```bash
nl -ba /Users/woosung/Desktop/Dev/Woosdom_Brain/01_Domains/시오툴/sio_tools_gt_master.md | sed -n '95,172p'
nl -ba /Users/woosung/Desktop/Dev/Woosdom_Brain/01_Domains/시오툴/sio_tools_gt_master.md | sed -n '296,300p'
nl -ba /Users/woosung/Desktop/Dev/Woosdom_Brain/01_Domains/시오툴/sio_tools_formulas_and_defaults.md | sed -n '351,359p'
nl -ba /Users/woosung/Desktop/Dev/Woosdom_Brain/01_Domains/시오툴/sio_tools_formulas_and_defaults.md | sed -n '551,599p'
```

- [ ] **Step 2: Cite current Pareto code**

Run:

```bash
nl -ba /Users/woosung/Desktop/Dev/Projects/pareto/frontend/app/lib/pareto-store/schemas/index.ts | sed -n '145,225p'
nl -ba /Users/woosung/Desktop/Dev/Projects/pareto/frontend/app/lib/pareto-store/slices/index.ts | sed -n '135,175p'
nl -ba /Users/woosung/Desktop/Dev/Projects/pareto/frontend/components/v3/index.tsx | sed -n '205,260p'
nl -ba /Users/woosung/Desktop/Dev/Projects/pareto/tttg_forge_core/src/constants.rs | sed -n '45,155p'
```

- [ ] **Step 3: Write gap table**

Include these rows:

```markdown
| Area | sio-tools authority | Pareto current | Plan |
|---|---|---|---|
| Catalog | Twinborn 10, Active 18, Mode 12 | Catalog mostly present | Preserve and normalize |
| State | Multidimensional config | Flat equipped_slots attack/defense | Replace with TechPartConfig |
| UI | 7-element modal + hex cards | Select boxes + four-row preview | Replace with grid/modal |
| Formula | Matrix 4 base x 37 targets | Constants exist in frontend/Rust but duplicated | Centralize in Rust |
| Optimizer | User-visible optimizer schema | Synthetic search and JS cap | Rust/WASM exact/beam engine |
```

### Task 1.2: Add TypeScript Tech model tests

**Files:**
- Create: `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/app/lib/pareto-store/tech/types.ts`
- Create: `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/app/lib/pareto-store/tech/defaults.ts`
- Create: `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/app/lib/pareto-store/tech/migration.ts`
- Create: `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/scripts/tech_model_unit_test.mjs`

- [ ] **Step 1: Write failing JS test**

Add a script that imports/transpiles through existing project conventions, or use Node assertions against exported JS-compatible data after TypeScript build.

Test assertions:

```javascript
assert.equal(TECH_TWINBORN_PARTS.length, 10);
assert.equal(TECH_ACTIVE_SKILLS.length, 18);
assert.equal(TECH_MODE_VARIANTS.length, 12);
assert.equal(TECH_RARITIES.length, 10);
assert.equal(defaultTechConfigs.energyGuidanceSystem.mode, 'droneMode');
assert.equal(defaultTechConfigs.energyGuidanceSystem.resonance, 3000);
assert.equal(migrateLegacyTechState({ equipped_slots: { attack_1: 'drone' } }).legacyWarnings.length >= 1, true);
```

- [ ] **Step 2: Run it red**

Run:

```bash
cd /Users/woosung/Desktop/Dev/Projects/pareto/frontend
node scripts/tech_model_unit_test.mjs
```

Expected:

```text
FAIL because new exports do not exist yet.
```

### Task 1.3: Implement TypeScript model

**Files:**
- Modify: `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/app/lib/pareto-store/types/index.ts`
- Modify: `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/app/lib/pareto-store/schemas/index.ts`
- Create: `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/app/lib/pareto-store/tech/types.ts`
- Create: `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/app/lib/pareto-store/tech/defaults.ts`
- Create: `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/app/lib/pareto-store/tech/migration.ts`

- [ ] **Step 1: Define TS model**

Minimum shape:

```typescript
export type TechRarity =
  | 'legend' | 'epic1' | 'epic' | 'excellent1' | 'excellent'
  | 'better' | 'good' | 'advanced' | 'super' | 'all';

export type TwinbornCategory =
  | 'energyGuidanceSystem' | 'antimatterMaintainer' | 'quantumNanobot'
  | 'phaseDriver' | 'energyDiffuser' | 'hiMaintainer'
  | 'precisionDevice' | 'antimatterGenerator' | 'exoRadicator'
  | 'hiGravityPulser';

export type TechMode =
  | 'molotovMode' | 'durianMode' | 'soccerMode' | 'droneMode'
  | 'forcefieldMode' | 'drillShotMode' | 'rocketMode' | 'lightningMode'
  | 'boomerangMode' | 'guardianMode' | 'laserMode' | 'brickMode';

export interface TechPartConfig {
  id: TwinbornCategory;
  rarity: TechRarity;
  mode: TechMode | null;
  resonance: number;
  overload: number;
  supportParts: boolean;
  twinbornLevel: 0 | 1 | 2 | 3 | 4 | 5;
  equipped: boolean;
}
```

- [ ] **Step 2: Add defaults from GT**

Defaults must include:

```typescript
energyGuidanceSystem: { rarity: 'legend', mode: 'droneMode', resonance: 3000, equipped: true }
antimatterMaintainer: { rarity: 'legend', mode: null, resonance: 3000, equipped: true }
quantumNanobot: { rarity: 'legend', mode: 'durianMode', resonance: 3000, equipped: true }
energyDiffuser: { rarity: 'legend', mode: null, resonance: 2100, equipped: true }
```

If GT says Eternal rather than legend in the final line cite, use `eternal` only after adding it to the agreed rarity enum. Do not silently coerce.

- [ ] **Step 3: Run model test green**

Run:

```bash
cd /Users/woosung/Desktop/Dev/Projects/pareto/frontend
node scripts/tech_model_unit_test.mjs
```

Expected:

```text
PASS all model assertions.
```

### Task 1.4: Add Rust Tech model tests

**Files:**
- Create: `/Users/woosung/Desktop/Dev/Projects/pareto/tttg_forge_core/tests/tech_parts_model.rs`
- Create: `/Users/woosung/Desktop/Dev/Projects/pareto/tttg_forge_core/src/tech_parts.rs`
- Modify: `/Users/woosung/Desktop/Dev/Projects/pareto/tttg_forge_core/src/lib.rs`

- [ ] **Step 1: Write failing Rust test**

```rust
use tttg_forge_core::tech_parts::{
    default_tech_parts, TechMode, TechRarity, TwinbornCategory,
};

#[test]
fn default_tech_parts_cover_sio_gt_counts() {
    let parts = default_tech_parts();
    assert_eq!(parts.len(), 10);
    let energy = parts.iter().find(|p| p.id == TwinbornCategory::EnergyGuidanceSystem).unwrap();
    assert_eq!(energy.mode, Some(TechMode::DroneMode));
    assert_eq!(energy.resonance, 3000);
    assert!(energy.equipped);
}

#[test]
fn tech_rarity_has_ten_gt_steps() {
    assert_eq!(TechRarity::ALL.len(), 10);
}
```

- [ ] **Step 2: Run red**

Run:

```bash
cd /Users/woosung/Desktop/Dev/Projects/pareto
cargo test -p tttg_forge_core tech_parts_model --test tech_parts_model
```

Expected:

```text
FAIL unresolved module or missing symbols.
```

### Task 1.5: Implement Rust Tech model

**Files:**
- Create: `/Users/woosung/Desktop/Dev/Projects/pareto/tttg_forge_core/src/tech_parts.rs`
- Modify: `/Users/woosung/Desktop/Dev/Projects/pareto/tttg_forge_core/src/lib.rs`

- [ ] **Step 1: Implement enums and struct**

Minimum Rust shape:

```rust
#[derive(Clone, Copy, Debug, Eq, PartialEq, Hash, serde::Serialize, serde::Deserialize)]
pub enum TwinbornCategory { EnergyGuidanceSystem, AntimatterMaintainer, QuantumNanobot, PhaseDriver, EnergyDiffuser, HiMaintainer, PrecisionDevice, AntimatterGenerator, ExoRadicator, HiGravityPulser }

#[derive(Clone, Copy, Debug, Eq, PartialEq, Hash, serde::Serialize, serde::Deserialize)]
pub enum TechMode { MolotovMode, DurianMode, SoccerMode, DroneMode, ForcefieldMode, DrillShotMode, RocketMode, LightningMode, BoomerangMode, GuardianMode, LaserMode, BrickMode }

#[derive(Clone, Copy, Debug, Eq, PartialEq, Hash, serde::Serialize, serde::Deserialize)]
pub enum TechRarity { Legend, Epic1, Epic, Excellent1, Excellent, Better, Good, Advanced, Super, All }

#[derive(Clone, Debug, PartialEq, serde::Serialize, serde::Deserialize)]
pub struct TechPart {
    pub id: TwinbornCategory,
    pub rarity: TechRarity,
    pub mode: Option<TechMode>,
    pub resonance: u32,
    pub overload: u32,
    pub support_parts: bool,
    pub twinborn_level: u8,
    pub equipped: bool,
}
```

- [ ] **Step 2: Add validation**

Rules:

```text
twinborn_level <= 5
resonance <= 999999
overload <= 999
id must be one of 10 categories
mode must be null or one of 12 variants
```

- [ ] **Step 3: Run tests green**

Run:

```bash
cd /Users/woosung/Desktop/Dev/Projects/pareto
cargo test -p tttg_forge_core tech_parts_model --test tech_parts_model
```

Expected:

```text
PASS.
```

### Task 1.6: M1 checkpoint report

**Files:**
- Create or overwrite: `/Users/woosung/Desktop/Dev/Woosdom_Brain/00_System/Templates/from_codex_2.md`

- [ ] **Step 1: Write M1 checkpoint only after T1/T2 verification**

Required frontmatter:

```yaml
status: "[S1-CHECKPOINT]"
milestone_completed: "M1"
task_id: "E-PARETO-V3-TD11-TECH-PARTS-UI-SIO-MULTIDIMENSIONAL-MIRROR-2026-05-19"
tech_catalog_current: "Twinborn 10 / Active Skills 18 / Mode variants 12 already present in schema"
data_model_dimension_recovered_from_1d_to_md: true
fabricated_categories_removed_scope: "not yet final until M2/M3 full rg"
continue_without_human_pause: true
```

- [ ] **Step 2: Continue automatically**

Continue into M2 immediately unless a Plan B critical stop has triggered.

---

## Chunk 2: M2 UI Parity

### Task 2.1: Write Playwright red test for sio-style Tech UI

**Files:**
- Create: `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/e2e/v3_tech_parts_ui.spec.ts`
- Modify later: `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/components/v3/index.tsx`

- [ ] **Step 1: Add UI expectations**

Test must assert:

```typescript
await expect(page.getByTestId('v3-tech-parts-panel')).toBeVisible();
await expect(page.getByTestId('tech-twinborn-grid').locator('[data-testid^="tech-card-"]')).toHaveCount(10);
await expect(page.getByTestId('tech-active-skills-grid').locator('[data-testid^="tech-card-"]')).toHaveCount(18);
await expect(page.getByTestId('tech-mode-variants-grid').locator('[data-testid^="tech-card-"]')).toHaveCount(12);
await page.getByTestId('tech-card-energyGuidanceSystem').click();
await expect(page.getByRole('dialog', { name: /Tech parts Configuration/i })).toBeVisible();
await expect(page.getByLabel(/Equip Energy Guidance System/i)).toBeVisible();
await expect(page.getByLabel(/Drone Mode/i)).toBeVisible();
await expect(page.getByLabel(/Total Resonance Energy/i)).toHaveValue('3000');
await expect(page.getByLabel(/Enter support parts manually/i)).toBeVisible();
await expect(page.getByLabel(/Overload/i)).toBeVisible();
await expect(page.getByTestId('tech-mode-hexagon-preview')).toBeVisible();
```

- [ ] **Step 2: Run red**

Run:

```bash
cd /Users/woosung/Desktop/Dev/Projects/pareto/frontend
PLAYWRIGHT_PORT=3037 npx playwright test e2e/v3_tech_parts_ui.spec.ts --project=chromium-desktop
```

Expected:

```text
FAIL because components do not exist yet.
```

### Task 2.2: Create Tech Parts UI components

**Files:**
- Create: `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/components/v3/tech/TechPartsPanel.tsx`
- Create: `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/components/v3/tech/TechPartsGrid.tsx`
- Create: `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/components/v3/tech/TechPartConfigModal.tsx`
- Create: `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/components/v3/tech/TechHexagonCard.tsx`
- Modify: `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/components/v3/index.tsx`

- [ ] **Step 1: Replace `TechSelectArray` render**

Keep the public route `/en/v3`. Replace the section content, not the whole page.

- [ ] **Step 2: Build `TechPartsPanel`**

Structure:

```tsx
<section data-testid="v3-tech-parts-panel">
  <TechPartsGrid kind="twinborn" />
  <TechPartsGrid kind="activeSkill" />
  <TechPartsGrid kind="modeVariant" />
  <TechPartConfigModal ... />
</section>
```

- [ ] **Step 3: Build modal 7 elements**

Required:

```text
1. title: Tech parts Configuration
2. equip checkbox
3. mode radio group
4. hexagon preview
5. Total Resonance Energy input
6. Enter support parts manually toggle
7. Overload input plus progression label
```

- [ ] **Step 4: Run UI test green**

Run:

```bash
cd /Users/woosung/Desktop/Dev/Projects/pareto/frontend
PLAYWRIGHT_PORT=3037 npx playwright test e2e/v3_tech_parts_ui.spec.ts --project=chromium-desktop
```

Expected:

```text
PASS.
```

### Task 2.3: Remove fabricated UI/state surface

**Files:**
- Modify: `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/app/lib/pareto-store/types/index.ts`
- Modify: `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/app/lib/pareto-store/slices/index.ts`
- Modify: `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/components/v3/index.tsx`
- Modify tests/fixtures that still hard-code old slots.

- [ ] **Step 1: Red scan**

Run:

```bash
rg -n "attack_1|attack_2|attack_3|defense_1|defense_2|defense_3" /Users/woosung/Desktop/Dev/Projects/pareto/frontend /Users/woosung/Desktop/Dev/Projects/pareto/tttg_forge_wasm
```

Expected before cleanup:

```text
Hits exist.
```

- [ ] **Step 2: Convert old tests to new model**

Replace old slot examples with:

```json
{
  "tech_configs": {
    "energyGuidanceSystem": {
      "rarity": "legend",
      "mode": "droneMode",
      "resonance": 3000,
      "overload": 0,
      "support_parts": false,
      "twinborn_level": 0,
      "equipped": true
    }
  }
}
```

- [ ] **Step 3: Green scan**

Run:

```bash
rg -n "attack_1|attack_2|attack_3|defense_1|defense_2|defense_3" /Users/woosung/Desktop/Dev/Projects/pareto/frontend /Users/woosung/Desktop/Dev/Projects/pareto/tttg_forge_wasm
```

Expected:

```text
0 hits except historical artifacts, if artifacts are excluded explicitly.
```

### Task 2.4: M2 checkpoint report

**Files:**
- Overwrite: `/Users/woosung/Desktop/Dev/Woosdom_Brain/00_System/Templates/from_codex_2.md`
- Create: `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/artifacts/td11-tech-parts-performance/04_grid_component.md`
- Create: `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/artifacts/td11-tech-parts-performance/03_modal_component.md`

- [ ] **Step 1: Write component evidence**

Include Playwright trace paths if available. If sio-tools screenshots are not yet available, record `screenshots_deferred_to_visual_qa: true` and continue.

- [ ] **Step 2: Set checkpoint status**

Frontmatter:

```yaml
status: "[S1-CHECKPOINT]"
milestone_completed: "M2"
twinborn_parts_count: 10
active_skills_count: 18
mode_variants_count: 12
modal_required_elements_count: 7
fabricated_categories_removed: 6
continue_without_human_pause: true
screenshots_deferred_to_visual_qa: true
```

---

## Chunk 3: M3 Formula Parity

### Task 3.1: Centralize Tech Modifier Matrix in Rust

**Files:**
- Create: `/Users/woosung/Desktop/Dev/Projects/pareto/tttg_forge_core/src/tech_modifier.rs`
- Modify: `/Users/woosung/Desktop/Dev/Projects/pareto/tttg_forge_core/src/lib.rs`
- Modify: `/Users/woosung/Desktop/Dev/Projects/pareto/tttg_forge_core/src/constants.rs`
- Create: `/Users/woosung/Desktop/Dev/Projects/pareto/tttg_forge_core/tests/tech_modifier_matrix.rs`

- [ ] **Step 1: Write failing matrix tests**

Use GT values from `sio_tools_gt_master.md` §4.4 and formulas §9.

```rust
use tttg_forge_core::tech_modifier::compute_tech_modifier;

#[test]
fn exo_bracer_drill_uses_gt_coefficient() {
    assert!((compute_tech_modifier("Exo Bracer", "Drill", 5.0) - (1.0 + 0.3636 * 5.0)).abs() < 0.000001);
}

#[test]
fn energy_cube_modes_return_level_multiplier() {
    assert!((compute_tech_modifier("Energy Cube", "Laser Mode", 3.0) - 3.0).abs() < 0.000001);
}
```

- [ ] **Step 2: Run red**

Run:

```bash
cd /Users/woosung/Desktop/Dev/Projects/pareto
cargo test -p tttg_forge_core tech_modifier_matrix --test tech_modifier_matrix
```

Expected:

```text
FAIL unresolved module or missing function.
```

- [ ] **Step 3: Implement matrix**

Implementation should use a static match or static table. Avoid runtime JSON parsing in hot paths.

- [ ] **Step 4: Run green**

Run:

```bash
cd /Users/woosung/Desktop/Dev/Projects/pareto
cargo test -p tttg_forge_core tech_modifier_matrix --test tech_modifier_matrix
```

Expected:

```text
PASS.
```

### Task 3.2: Add WASM exports for Tech Parts

**Files:**
- Create: `/Users/woosung/Desktop/Dev/Projects/pareto/tttg_forge_wasm/src/tech_parts.rs`
- Modify: `/Users/woosung/Desktop/Dev/Projects/pareto/tttg_forge_wasm/src/lib.rs`
- Modify: `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/app/lib/wasm.ts`
- Create: `/Users/woosung/Desktop/Dev/Projects/pareto/tttg_forge_wasm/tests/tech_parts_exports.rs`

- [ ] **Step 1: Write failing export tests**

Exports:

```text
get_tech_parts_full_js()
validate_tech_part_config_js(config)
compute_tech_modifier_js(base, target, level)
tech_optimizer_run_js(player_state, options)
```

- [ ] **Step 2: Build WASM red or fail at compile**

Run:

```bash
cd /Users/woosung/Desktop/Dev/Projects/pareto/tttg_forge_wasm
wasm-pack build --target web --release
```

Expected:

```text
FAIL until exports exist.
```

- [ ] **Step 3: Implement exports**

Export JSON-friendly values. Keep browser API stable:

```typescript
getTechPartsFull(): TechCatalogPayload
validateTechPartConfig(config): ValidationResult
computeTechModifier(baseTechId, targetId, twinbornLevel): number
runTechOptimizer(playerState, options): TechOptimizerResult
```

- [ ] **Step 4: Build green**

Run:

```bash
cd /Users/woosung/Desktop/Dev/Projects/pareto/tttg_forge_wasm
wasm-pack build --target web --release
```

Expected:

```text
Build succeeds and wasm <= 400000 bytes.
```

---

## Chunk 4: Performance Upgrade

### Task 4.1: Benchmark the current bottleneck

**Files:**
- Create: `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/scripts/tech_optimizer_benchmark.mjs`
- Create: `/Users/woosung/Desktop/Dev/Projects/pareto/tttg_forge_optimizer/tests/tech_optimizer_performance.rs`
- Create: `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/artifacts/td11-tech-parts-performance/05_performance_baseline.md`

- [ ] **Step 1: Add scenario definitions**

Benchmark scenarios:

```text
S: 10 Twinborn, 12 modes, topK 5, exact
M: 10 Twinborn, 12 modes, resonance allocation 0..3000 step 100, topK 10
L: full Tech Parts + resource constraints + topK 20, bounded exact where possible
XL: stress case, anytime beam mode, first answer target under 3s
```

- [ ] **Step 2: Run current benchmark**

Run:

```bash
cd /Users/woosung/Desktop/Dev/Projects/pareto/frontend
node scripts/tech_optimizer_benchmark.mjs --mode baseline
```

Expected:

```text
Produces JSON with scenario, search_space_size, latency_ms, exact, visited_nodes, pruned_nodes.
```

- [ ] **Step 3: Write baseline report**

Include current evidence. If current code cannot run realistic Tech scenarios, state:

```text
Baseline blocked: optimizer uses synthetic search and cannot represent full sio Tech config yet.
```

### Task 4.2: Replace JS exhaustive enumeration with Rust/WASM optimizer

**Files:**
- Modify: `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/app/lib/wasm-worker.ts`
- Create: `/Users/woosung/Desktop/Dev/Projects/pareto/tttg_forge_optimizer/src/tech_search.rs`
- Create: `/Users/woosung/Desktop/Dev/Projects/pareto/tttg_forge_optimizer/src/tech_upper_bound.rs`
- Create: `/Users/woosung/Desktop/Dev/Projects/pareto/tttg_forge_optimizer/src/tech_cache.rs`
- Modify: `/Users/woosung/Desktop/Dev/Projects/pareto/tttg_forge_optimizer/src/lib.rs`

- [ ] **Step 1: Write optimizer API test**

```rust
use tttg_forge_optimizer::tech_search::{run_tech_optimizer, TechOptimizerOptions};

#[test]
fn tech_optimizer_returns_first_answer_under_budget_for_small_case() {
    let options = TechOptimizerOptions { top_k: 5, exact: true, time_budget_ms: 3000, ..Default::default() };
    let result = run_tech_optimizer(&Default::default(), &options).unwrap();
    assert!(!result.builds.is_empty());
    assert!(result.metrics.visited_nodes > 0);
}
```

- [ ] **Step 2: Implement core search**

Architecture:

```text
Input normalization:
  player_state -> TechSearchState
  resource options -> compact integer domains

Precompute:
  coefficient vectors per mode
  active skill damage weights
  resonance/overload marginal gains

Search:
  exact branch-and-bound for small/medium
  bounded beam for large
  top-k min-heap
  dominance pruning by normalized config key
  upper bound by remaining max marginal gain

Output:
  exact flag
  top builds
  metrics
  first_answer_ms
  total_latency_ms
```

- [ ] **Step 3: Remove hot-path serde_json loops**

In Rust hot path, do not repeatedly index `serde_json::Value`. Convert once into typed structs.

- [ ] **Step 4: Keep UI responsive**

Worker result should support:

```typescript
type TechOptimizerMode = 'exact' | 'beam' | 'auto';
type TechOptimizerResult = {
  exact: boolean;
  firstAnswerMs: number;
  latencyMs: number;
  visitedNodes: number;
  prunedNodes: number;
  builds: TechBuild[];
  reason?: 'time_budget' | 'search_space_cap' | 'exact_complete';
}
```

### Task 4.3: Add anytime/progressive behavior

**Files:**
- Modify: `/Users/woosung/Desktop/Dev/Projects/pareto/tttg_forge_optimizer/src/tech_search.rs`
- Modify: `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/app/lib/wasm-worker.ts`
- Create: `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/components/v3/tech/TechOptimizerStatus.tsx`

- [ ] **Step 1: Add time budget options**

Options:

```rust
pub struct TechOptimizerOptions {
    pub top_k: usize,
    pub mode: TechOptimizerMode,
    pub first_answer_budget_ms: u64,
    pub total_budget_ms: u64,
    pub beam_width: usize,
    pub max_exact_nodes: usize,
}
```

- [ ] **Step 2: Add progressive metrics**

Minimum metrics:

```text
first_answer_ms
latency_ms
visited_nodes
pruned_nodes
frontier_size
dominance_cache_hits
mode_used
exact
```

- [ ] **Step 3: Add cancel/version guard**

In worker/client:

```typescript
let requestVersion = 0;
const version = ++requestVersion;
const result = await worker.optimizeTech(...);
if (version !== requestVersion) return;
```

If Comlink cancellation is not trivial, implement logical cancellation first and physical abort later.

### Task 4.4: Verify performance targets

**Files:**
- Modify: `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/scripts/tech_optimizer_benchmark.mjs`
- Create: `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/artifacts/td11-tech-parts-performance/05_tech_optimizer_performance.md`

- [ ] **Step 1: Run Rust performance test**

Run:

```bash
cd /Users/woosung/Desktop/Dev/Projects/pareto
cargo test -p tttg_forge_optimizer tech_optimizer_performance --test tech_optimizer_performance -- --nocapture
```

Expected:

```text
PASS. Logs include S/M/L/XL metrics.
```

- [ ] **Step 2: Run browser/Node benchmark**

Run:

```bash
cd /Users/woosung/Desktop/Dev/Projects/pareto/frontend
node scripts/tech_optimizer_benchmark.mjs --mode after
```

Expected:

```text
normal first_answer_ms < 3000
normal latency_ms < 60000
huge first_answer_ms < 3000
huge total latency <= 180000 or exact=false with reason
```

- [ ] **Step 3: Compare baseline vs after**

Report:

```markdown
| Scenario | Before | After | Exact | Notes |
|---|---:|---:|---|---|
| S | ... | ... | true | ... |
| M | ... | ... | true | ... |
| L | ... | ... | true/false | ... |
| XL | ... | ... | false allowed | progressive answer |
```

---

## Chunk 5: Integration, Regression, And Release-Ready Local Build

### Task 5.1: Full regression suite

**Files:**
- Create: `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/artifacts/td11-tech-parts-performance/06_cargo_test_workspace.log`
- Create: `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/artifacts/td11-tech-parts-performance/06_playwright_v3.log`
- Create: `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/artifacts/td11-tech-parts-performance/06_npm_build.log`
- Create: `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/artifacts/td11-tech-parts-performance/06_wasm_pack_build.log`

- [ ] **Step 1: Rust tests**

Run:

```bash
cd /Users/woosung/Desktop/Dev/Projects/pareto
cargo test --workspace
```

Expected:

```text
425 existing tests plus new TD-11 tests pass. 0 failed.
```

- [ ] **Step 2: WASM build**

Run:

```bash
cd /Users/woosung/Desktop/Dev/Projects/pareto/tttg_forge_wasm
wasm-pack build --target web --release
```

Expected:

```text
success
tttg_forge_wasm_bg.wasm <= 400000 bytes
```

- [ ] **Step 3: Next build**

Run:

```bash
cd /Users/woosung/Desktop/Dev/Projects/pareto/frontend
npm run build
```

Expected:

```text
success
```

- [ ] **Step 4: Playwright V3 tests**

Run:

```bash
cd /Users/woosung/Desktop/Dev/Projects/pareto/frontend
PLAYWRIGHT_PORT=3037 npx playwright test e2e/v3_smoke_test.spec.ts e2e/v3_optimizer_routes.spec.ts e2e/v3_sio_live_fixture.spec.ts e2e/v3_tech_parts_ui.spec.ts --project=chromium-desktop
```

Expected:

```text
existing 27 plus new Tech UI tests pass.
```

### Task 5.2: Pattern gates

**Files:**
- Create: `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/artifacts/td11-tech-parts-performance/07_pattern_gates.log`

- [ ] **Step 1: Fabricated slot scan**

Run:

```bash
rg -n "attack_1|attack_2|attack_3|defense_1|defense_2|defense_3" /Users/woosung/Desktop/Dev/Projects/pareto/frontend /Users/woosung/Desktop/Dev/Projects/pareto/tttg_forge_core /Users/woosung/Desktop/Dev/Projects/pareto/tttg_forge_optimizer /Users/woosung/Desktop/Dev/Projects/pareto/tttg_forge_wasm
```

Expected:

```text
0 source hits.
```

- [ ] **Step 2: Test bypass scan**

Run:

```bash
rg -n "\\bTODO\\b|\\bFIXME\\b|skip_test|xfail|todo!\\(\\)|unimplemented!\\(\\)" /Users/woosung/Desktop/Dev/Projects/pareto/frontend /Users/woosung/Desktop/Dev/Projects/pareto/tttg_forge_core /Users/woosung/Desktop/Dev/Projects/pareto/tttg_forge_optimizer /Users/woosung/Desktop/Dev/Projects/pareto/tttg_forge_wasm
```

Expected:

```text
0 new hits in TD-11 touched source.
```

- [ ] **Step 3: Hedging scan in reports**

Run:

```bash
rg -n "not attempted|beyond embedded|not claimed|partial PASS" /Users/woosung/Desktop/Dev/Projects/pareto/frontend/artifacts/td11-tech-parts-performance /Users/woosung/Desktop/Dev/Woosdom_Brain/00_System/Templates/from_codex_2.md
```

Expected:

```text
0 hits, unless status is [S1-STOP] and the phrase is part of quoted input.
```

### Task 5.3: Final report

**Files:**
- Overwrite: `/Users/woosung/Desktop/Dev/Woosdom_Brain/00_System/Templates/from_codex_2.md`
- Create: `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/artifacts/td11-tech-parts-performance/07_codex_self_check.md`
- Create: `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/artifacts/td11-tech-parts-performance/references.md`

- [ ] **Step 1: Fill final frontmatter**

Required fields:

```yaml
status: "[S2-DONE]"
milestone_completed: "M3"
twinborn_parts_count: 10
active_skills_count: 18
mode_variants_count: 12
tech_rarity_count: 10
tech_modifier_matrix_targets: 37
fabricated_categories_removed: 6
wasm_exports_added: 4
rust_tests_failed: 0
playwright_tests_failed: 0
wasm_bundle_size_after: "<bytes>"
wasm_bundle_size_cap: 400000
normal_first_answer_ms: "<measured>"
normal_final_latency_ms: "<measured>"
huge_first_answer_ms: "<measured>"
huge_final_latency_ms: "<measured or bounded>"
data_model_dimension_recovered_from_1d_to_md: true
deployment_excluded: true
domain_purchase_excluded: true
```

- [ ] **Step 2: Include evidence paths**

Include:

```text
cargo test output path
Playwright output path
WASM build output path
WASM size output path
performance benchmark output path
GT line cites
screenshots/traces if generated
```

- [ ] **Step 3: Final user review request**

Ask for review of:

```text
Tech Parts UI parity
optimizer latency and exact/beam labeling
remaining sio-tools gap backlog
```

---

## Plan B Critical Stops

Stop immediately and write `[S1-STOP]` to `/Users/woosung/Desktop/Dev/Woosdom_Brain/00_System/Templates/from_codex_2.md` if any of these occur:

1. Rust struct + WASM exports + TypeScript binding conflicts exceed 3 independent integration blockers.
2. UI rewrite causes any existing Rust or Playwright regression that cannot be fixed in the same milestone.
3. WASM bundle exceeds 400000 bytes after optimization and no safe size reduction is available.
4. Fabricated slot names remain in source after M2 cleanup.
5. GT line cites are missing from reports.
6. Performance target cannot be met honestly and result labeling would mislead users about exactness.

Stop report shape:

```yaml
status: "[S1-STOP]"
plan_b_triggered_reason: "<specific blocker>"
latest_verified_command: "<command>"
latest_verified_result: "<result>"
recommended_next_decision: "<human choice needed>"
```

---

## Commit Plan

Use frequent commits only if user approves committing:

```bash
git add <files>
git commit -m "docs(td11): capture sio parity and performance plan"
git commit -m "test(td11): add tech model and ui red tests"
git commit -m "feat(td11): add multidimensional tech parts model"
git commit -m "feat(td11): add sio-style tech parts configuration ui"
git commit -m "feat(td11): add rust tech modifier matrix exports"
git commit -m "perf(td11): add tech optimizer exact and beam search"
git commit -m "test(td11): verify tech parity performance and regressions"
```

No push without explicit approval.

---

## Execution Note S19: Worker Tuple Rows Matched

Status: `[S19-SIO-WORKER-TUPLE-ROWS-VERIFIED_NOT-FULL-SIO]`

Completed after the original plan:

- Added `frontend/scripts/sio_worker_message_summary.mjs`.
- Added `frontend/scripts/sio_worker_golden_parity_check.mjs`.
- Generated:
  - `frontend/artifacts/td11/sio_worker_decoded_summary_2026-05-20.json`
  - `frontend/artifacts/td11/sio_worker_golden_parity_check_2026-05-20.json`
- Corrected the Rust SIO adapter to match live worker behavior for captured fixtures:
  - normal `lookupDepth=2`
  - live `extraLegends` semantics
  - Heap-order robot permutation
  - exported optimize path permutation
  - live-tuple-tuned surrogate scoring

Fresh verification:

- `cargo test -p tttg_forge_optimizer --test tech_optimizer_performance`: `17 passed`
- `cargo test -p tttg_forge_wasm --test tech_parts_exports`: `7 passed`
- `cargo test --workspace`: passed
- `wasm-pack build --target web --release -- --features compat-exports`: passed
- `node frontend/scripts/tech_optimizer_benchmark.mjs`: passed, `240` runs
- `ALLOW_MISMATCH=1 node frontend/scripts/sio_worker_golden_parity_check.mjs`: command passed, worker row parity `3/3`, multiplier parity `0/3`
- `ALLOW_MISMATCH=1 node frontend/scripts/sio_tech_optimizer_parity_check.mjs`: command passed, DOM row signature parity `3/3`, multiplier parity `0/3`

Current gate:

- Worker row assignment parity is green.
- Full SIO replacement is still gated by replacing the surrogate score with the live `lm()` multiplier objective.
