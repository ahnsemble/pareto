# SIO lm Full Equivalence True Gate Implementation Plan

> **For agentic workers:** REQUIRED: Use `superpowers:subagent-driven-development` if subagents are explicitly requested/available for implementation, otherwise use `superpowers:executing-plans`. Track progress by updating each checkbox in this file.

**Goal:** Reach `fullSioEquivalent=true` only after arbitrary compact account/config/active-skill `sio-tools lm()` equivalence is generalized, independently verified, and no longer dependent on captured fixture residuals.

**Current Baseline:** S59 is green but not full equivalent. `fullSioEquivalent=false`, current scorer is `sio_compact_base_stats_transformer`, `tech_optimizer_performance` has `73 passed`, compact matrix parity is green, and arbitrary compact local stage replay is `8/8`. The generated arbitrary cases still do not have independent live expected multipliers, so they are not sufficient to justify `true`.

**Architecture:** Convert the compact bridge from fixture-matched residual patches into domain formula modules, backed by live-captured arbitrary compact fixtures. The final gate must be source-enforced, artifact-enforced, parity-enforced, and benchmarked before the flag flips.

**Tech Stack:** Rust optimizer and wasm crates, `serde_json` compact decoding, Node ESM parity/capture scripts, wasm-pack compat exports, `frontend/artifacts/td11` rollups, Woosdom `from_codex.md` reporting.

---

## Why The Previous Loop Kept Slipping

The repeated failure mode was treating a green slice as a complete proof. A domain slice can pass while another captured residual still masks missing `lm()` behavior. Local stage-product replay also proves internal consistency of our formulas, not equivalence to `sio-tools`, unless the expected multiplier came from an independent live worker/UI capture.

The new rule is: no statement like "one more thing and true" is valid unless it maps to the closed gate below. If any gate is red or unknown, `fullSioEquivalent` remains `false`.

## Non-Negotiable True Gate

`fullSioEquivalent=true` is allowed only when all gates are green.

| Gate | Required Evidence |
| --- | --- |
| G0 independent oracle | Generated arbitrary compact fixtures have live-captured expected multipliers and decoded row/stat signatures. `best.multiplier` must not be `null`, `decodedResults` must not be empty, and capture metadata must identify source/version/time. Synthetic stage replay alone is not accepted. |
| G1 no account residual | Production scoring no longer depends on `default_live_compact_account_base_stats`, `captured_default_compact_account_base_stats`, `CompactEndgameConditionProfile`, `apply_compact_endgame_account_profile`, or `compact_matches_captured_account_surface`. Test-only fixture data may remain only under explicit test modules/artifacts. |
| G2 no equipment profile residual | Production scoring no longer depends on fixture profile transforms or matchers such as `apply_shared_fixture_equipment_transform`, `apply_zcppvi_advanced_equipment_transform`, `apply_*_equipment_profile`, `EquipmentProfileStats`, `is_*_equipment_profile`, or passive-pool profile constants. |
| G3 matrix complete | `frontend/artifacts/td11/sio_lm_equivalence_matrix.json` marks every domain implemented and live-covered: account/baseStats, equipment, collectibles/customSets, pets/petSkills/xeno, survivors/passives/harmony/teamwork, mounts, evo, LME, EE, active skill slots/enabledSkills. |
| G4 parity complete | Worker and optimizer parity pass for default compact, shared/zcp compact, and generated arbitrary compact fixtures. Generated cases must use live expected values, not local replay expected values. |
| G5 full verification | Rust tests, wasm tests/build, frontend build, parity runners, arbitrary capture validation, benchmark, and `git diff --check` all pass after the flag/scorer change. |
| G6 final flag change | Only after G0-G5, change the reported scorer away from `sio_compact_base_stats_transformer` and set `fullSioEquivalent=true`. |

## Domain Coverage Matrix

| Domain | Current S59 State | Missing Work Before True |
| --- | --- | --- |
| Account/baseStats | Generic formula exists for many compact fields; default/endgame surface still uses captured residuals. | Replace `known_compact_account_base_stats` and default/shared/qn5n40/endgame baseStats with formula-derived values; remove captured account-surface fallback. |
| Equipment | Several compact equipment features are formula-backed, including S56/S57 additions; large profile transforms remain. | Decode and calculate all slot item stats, rarity/star/evolve/AF/V/C/X/CFP/transmute effects, set/passive pools, and conditional equipment effects generically. Remove profile matchers. |
| Collectibles/customSets | Generic custom set Legend and advanced thresholds added; individual/folding coverage partial. | Implement individual collectible star tables, upgraded collectible multiplier behavior, item/tech collectible-set folding, customSets threshold edges, and live arbitrary cases. |
| Pets/petSkills/xeno | Non-synergy xeno row counts and active/global xeno pet stats added. | Implement arbitrary active/support pet skills, petSkills folding, xeno damage/res chance/res damage/res multiplier/res duration/sync rate formulas, and remove endgame xeno residuals. |
| Survivors/passives/harmony/teamwork | Non-synergy survivor level/star/main passive thresholds added. | Implement full survivor passive tables, transformed S-hero post-processing, harmony formulas, teamwork, survivor-specific passive interactions, and remove harmony residuals. |
| Mounts | Partial mount formula coverage exists. | Implement equipped/owned mount stat lines, level/star/rarity scaling, mount damage, puzzle/line thresholds, and arbitrary live fixtures. |
| Evo | Covered only for existing fixture surface. | Implement arbitrary evo compact input effects and edge interactions with skills/equipment/account stats. |
| LME | S56 threshold deltas and LME2 testament debuff threshold deltas added. | Cover all LME dynamic entries, threshold edges, active/inactive combinations, and interactions with equipment transforms. |
| EE | S57 generic EE skill stats added. | Cover all EE groups, dynamic entries, omnipower behavior, and arbitrary live fixtures. |
| Active skills | Current parity covers existing worker/optimizer fixtures. | Implement arbitrary `activeSkills`, `enabledSkills`, slots, `skillsMap`, forced/disabled skills, and mode-condition combinations with live expected captures. |

---

## Execution Plan

### Phase S60: Gate Inventory And Independent Capture Harness

**Purpose:** Stop circular proof first. Before more formulas are trusted, generated arbitrary compact cases must be capturable against an independent `sio-tools` worker/UI result.

**Files:**
- Modify: `frontend/scripts/sio_arbitrary_compact_fixture_generator.mjs`
- Modify: `frontend/scripts/sio_arbitrary_compact_worker_summary.mjs`
- Create: `frontend/scripts/sio_arbitrary_compact_live_capture.mjs`
- Create: `frontend/scripts/sio_full_equivalence_gate.mjs`
- Modify: `tttg_forge_optimizer/tests/tech_optimizer_performance.rs`
- Modify: `frontend/artifacts/td11/sio_lm_equivalence_matrix.json`
- Create: `frontend/artifacts/td11/s60_*_rollup.json`

**RED:**
- [x] Add a test that fails if arbitrary generated fixture summaries contain `best.multiplier=null` or empty `decodedResults`.
- [x] Add a test that fails if a generated fixture lacks capture metadata: source, version/hash if available, capturedAt, fixture id, compact payload hash.
- [x] Add a source-gate test that records known residual names and fails only when `fullSioEquivalent=true` is attempted while residuals remain.

**GREEN:**
- [x] Make the generator emit stable compact payloads, case ids, domain tags, expected capture paths, payload hashes, and reproducible fixture manifests.
- [x] Add a live capture script that can take generated compact payloads and persist independent expected multiplier plus decoded result signatures.
- [x] Add a validator that separates three states: `live-captured`, `synthetic-replay-only`, and `missing`.
- [x] Keep `fullSioEquivalent=false` until live capture exists for every generated domain case.

**Commands:**
```bash
cargo test -p tttg_forge_optimizer --test tech_optimizer_performance sio_arbitrary_compact_generated_cases_require_live_expected
cd frontend && node scripts/sio_arbitrary_compact_fixture_generator.mjs
cd frontend && node scripts/sio_arbitrary_compact_live_capture.mjs
cd frontend && node scripts/sio_arbitrary_compact_worker_summary.mjs
cd frontend && node scripts/sio_full_equivalence_gate.mjs
```

**Blocker Rule:** If the independent live `sio-tools` oracle cannot be captured from local code/data, that is a real blocker. Do not flip `true` based on synthetic replay.

### Phase S61: Account/BaseStats Residual Removal

**Purpose:** Replace fixture-specific default/shared/qn5n40/endgame account baseStats with formula-derived compact decoding.

**Files:**
- Modify: `tttg_forge_optimizer/src/tech/sio_config.rs`
- Modify: `tttg_forge_optimizer/src/tech/sio_lm.rs`
- Modify: `tttg_forge_optimizer/tests/tech_optimizer_performance.rs`
- Create/modify: `frontend/artifacts/td11/s61_*_rollup.json`

**RED:**
- [ ] Add focused parity tests for default, shared, qn5n40, zcp, and generated account-only compact fixtures with captured live expected multipliers.
- [ ] Add a source test that fails if account production paths call captured baseStats helpers after this phase.

**GREEN:**
- [ ] Extend `derive_generic_compact_base_stats` to cover all account stat contributors currently hidden in `CompactEndgameConditionProfile`.
- [ ] Move each residual stat into a named formula source with input provenance and parity fixture.
- [ ] Remove `compact_surface_matches_default_live_fixture` and `compact_matches_captured_account_surface` from production scoring.
- [ ] Keep old fixture constants only as test expected fixtures if still useful.

**Commands:**
```bash
cargo test -p tttg_forge_optimizer --test tech_optimizer_performance sio_compact_account_base_stats_are_formula_derived
cargo test -p tttg_forge_optimizer --test tech_optimizer_performance
cd frontend && node scripts/sio_compact_parity_matrix_check.mjs
```

**Progress Note (2026-05-21 S61 partial):**
- [x] Added RED/GREEN coverage for generated default-live-account-surface baseStats deltas using live trace expected `baseStats`.
- [x] Fixed the default live account surface path so it composes generated compact custom-set, enabled mount line, LME2 testament, and EE skill deltas instead of returning a bare captured baseline.
- [x] Kept pets/xeno out of the S61 GREEN scope after RED exposed xeno-specific live trace stats; that domain remains assigned to S65.
- [ ] Full S61 is still incomplete: captured default/endgame account baseline helpers remain in production and must not allow `fullSioEquivalent=true`.

### Phase S62: Generic Equipment Transform

**Purpose:** Collapse fixture-specific equipment transforms into generic equipment formula logic.

**Files:**
- Modify: `tttg_forge_optimizer/src/tech/sio_lm/equipment_transform.rs`
- Modify: `tttg_forge_optimizer/src/tech/sio_config.rs`
- Modify: `tttg_forge_optimizer/tests/tech_optimizer_performance.rs`
- Modify: `frontend/artifacts/td11/sio_lm_equivalence_matrix.json`
- Create/modify: `frontend/artifacts/td11/s62_*_rollup.json`

**RED:**
- [ ] Add live parity fixtures for every slot and representative rarity/evolve/AF/V/C/X/CFP/transmute state.
- [ ] Add RED tests for each known fixture profile currently matched by `is_*_equipment_profile`.
- [ ] Add a source test that fails when production transform uses fixture equipment profile matchers after the phase.

**GREEN:**
- [ ] Implement generic item stat calculation for weapon, necklace, gloves, chest, belt, and boots.
- [ ] Implement passive pool formulas from actual equipment inputs instead of captured passive-pool profile constants.
- [ ] Implement conditional equipment effects generically: Voidwaker Emblem void neck boost/uptime, Twisting Belt min/max energy flux and chaos boost, LME2 testament debuff, Judgment/Sash/Void/Twisting interactions, and any remaining S56/S57 fixture-specific deltas.
- [ ] Delete or test-only quarantine `apply_shared_fixture_equipment_transform`, `apply_zcppvi_advanced_equipment_transform`, `apply_*_equipment_profile`, `EquipmentProfileStats`, and `is_*_equipment_profile`.

**Progress Note (2026-05-21 S62 partial):**
- [x] Added RED/GREEN coverage requiring generated equipment profile cases to have independent live expected multipliers, decoded results, and decoded row/stat signatures.
- [x] Added generated arbitrary compact live cases for Judgment+Sash, Void+Sash, Void+Twisting, LME2 Judgment+Sash, and advanced Void+Twisting equipment loadouts; live capture is 5/5 for equipment and 13/13 overall.
- [x] Removed the legacy `apply_*_equipment_profile`, `EquipmentProfileStats`, and `is_*_equipment_profile` helper names from production source.
- [ ] Full S62 is still incomplete: calibrated equipment loadout residuals remain tracked by the full-equivalence gate and must be decomposed into generic item/passive formulas.

**Commands:**
```bash
cargo test -p tttg_forge_optimizer --test tech_optimizer_performance sio_equipment_transform_is_generic_for_compact_profiles
cargo test -p tttg_forge_optimizer --test tech_optimizer_performance
cd frontend && node scripts/sio_compact_parity_matrix_check.mjs
```

### Phase S63: Collectibles And CustomSets

**Purpose:** Cover arbitrary collectible/custom set compact inputs without profile residuals.

**Files:**
- Modify: `tttg_forge_optimizer/src/tech/sio_config.rs`
- Add module if needed: `tttg_forge_optimizer/src/tech/sio_lm/collectibles.rs`
- Modify: `tttg_forge_optimizer/tests/tech_optimizer_performance.rs`
- Modify: `frontend/scripts/sio_arbitrary_compact_fixture_generator.mjs`
- Create/modify: `frontend/artifacts/td11/s63_*_rollup.json`

**RED:**
- [ ] Add generated live cases for individual collectible stars, upgraded collectible multiplier behavior, item collectible sets, tech collectible sets, and customSets thresholds.
- [ ] Add parity tests that isolate collectibles/customSets with minimal unrelated stats.

**GREEN:**
- [ ] Port individual collectible star tables and per-item stat outputs.
- [ ] Port item/tech collectible-set folding and threshold formulas.
- [ ] Port customSets threshold formulas across low, boundary, and high star sums.
- [ ] Update matrix status to complete only after live-covered generated cases pass.

**Progress Note (2026-05-21 S63 partial):**
- [x] Added RED/GREEN coverage requiring S63 generated collectibles/customSets cases to have independent live expected multipliers, decoded results, and decoded row/stat signatures.
- [x] Added generated arbitrary compact live cases for individual collectible stars, upgraded collectible behavior, item collectible-set folding, tech collectible-set folding, and customSets threshold edges; live capture is 5/5 for S63 and 18/18 overall.
- [ ] Full S63 is still incomplete: individual collectible star tables and item/tech collectible-set folding formulas are not yet ported to Rust parity.

**Commands:**
```bash
cargo test -p tttg_forge_optimizer --test tech_optimizer_performance sio_collectibles_custom_sets_match_live_compact
cd frontend && node scripts/sio_arbitrary_compact_fixture_generator.mjs
cd frontend && node scripts/sio_arbitrary_compact_live_capture.mjs
cd frontend && node scripts/sio_full_equivalence_gate.mjs
```

### Phase S64: Survivors, Passives, Harmony, Teamwork

**Purpose:** Remove survivor and harmony captured residuals by porting the full compact formula surface.

**Files:**
- Modify: `tttg_forge_optimizer/src/tech/sio_config.rs`
- Add module if needed: `tttg_forge_optimizer/src/tech/sio_lm/survivors.rs`
- Modify: `tttg_forge_optimizer/tests/tech_optimizer_performance.rs`
- Modify: `frontend/scripts/sio_arbitrary_compact_fixture_generator.mjs`
- Create/modify: `frontend/artifacts/td11/s64_*_rollup.json`

**RED:**
- [ ] Add live fixtures for multiple survivors, level/star boundaries, main passive, secondary passive, transformed S-hero passive post-processing, harmony, and teamwork.
- [ ] Add tests that fail while harmony stats remain residual-only.

**GREEN:**
- [ ] Implement survivor level/star/base passive tables.
- [ ] Implement transformed S-hero post-processing stats and named interactions currently hidden in endgame residuals.
- [ ] Implement harmony formulas for active and inactive survivor combinations.
- [ ] Implement teamwork and party passive folding.
- [ ] Remove residual harmony stats such as fixture-only `harmonyMetalia`/`harmonyTaloxa` production injections.

**Commands:**
```bash
cargo test -p tttg_forge_optimizer --test tech_optimizer_performance sio_survivor_harmony_teamwork_match_live_compact
cd frontend && node scripts/sio_full_equivalence_gate.mjs
```

### Phase S65: Pets, PetSkills, Xeno Awakening

**Purpose:** Generalize active/support pets, petSkills, and xeno-derived stats.

**Files:**
- Modify: `tttg_forge_optimizer/src/tech/sio_config.rs`
- Add module if needed: `tttg_forge_optimizer/src/tech/sio_lm/pets.rs`
- Modify: `tttg_forge_optimizer/tests/tech_optimizer_performance.rs`
- Modify: `frontend/scripts/sio_arbitrary_compact_fixture_generator.mjs`
- Create/modify: `frontend/artifacts/td11/s65_*_rollup.json`

**RED:**
- [ ] Add live fixtures for active pet, support pets, petSkills, xeno awakening row counts, xeno resonance chance/damage/multiplier/duration/sync, and pet/equipment interactions.
- [ ] Add tests that fail while endgame xeno values are production residuals.

**GREEN:**
- [ ] Implement active and support pet skill folding from arbitrary compact config.
- [ ] Implement xeno awakening stat tables and row/threshold behavior generically.
- [ ] Implement xeno resonance formulas and interactions with collectibles/equipment where applicable.
- [ ] Remove residual xeno production injections such as fixture-only `xenoDamage`, `xenoResChance`, `xenoResDamage`, and `xenoResMultiplier`.

**Progress Note (2026-05-21 S65 partial):**
- [x] Added RED/GREEN coverage for deployed module `30396` Rex cooldown interaction with `Battle Lust` and `Gary` pet skills.
- [x] Added RED/GREEN coverage for default pet skill stats: `Motivation`, `Inspiration`, and `Encouragement`.
- [x] Fixed compact pet skill decoding so `skillSettings` no longer disappear when the compact pet inventory object is absent.
- [x] Updated xeno awakening count tables from deployed module `37013`, including count>=2 behavior.
- [ ] Full S65 is still incomplete: endgame xeno residuals remain in `CompactEndgameConditionProfile`, and broad support-pet interactions are not residual-free.

**Commands:**
```bash
cargo test -p tttg_forge_optimizer --test tech_optimizer_performance sio_pets_pet_skills_xeno_match_live_compact
cd frontend && node scripts/sio_full_equivalence_gate.mjs
```

### Phase S66: Mounts And Evo

**Purpose:** Cover arbitrary mount and evo compact inputs.

**Files:**
- Modify: `tttg_forge_optimizer/src/tech/sio_config.rs`
- Add modules if needed: `tttg_forge_optimizer/src/tech/sio_lm/mounts.rs`, `tttg_forge_optimizer/src/tech/sio_lm/evo.rs`
- Modify: `tttg_forge_optimizer/tests/tech_optimizer_performance.rs`
- Modify: `frontend/scripts/sio_arbitrary_compact_fixture_generator.mjs`
- Create/modify: `frontend/artifacts/td11/s66_*_rollup.json`

**RED:**
- [ ] Add live fixtures for equipped mount, owned mount variants, line thresholds, level/star/rarity changes, mount damage, puzzle/line stats, and evo input combinations.
- [ ] Add parity tests for mount-only and evo-only generated compact cases.

**GREEN:**
- [ ] Implement mount stat line formulas and mount damage scaling.
- [ ] Implement mount threshold and puzzle/line contributions.
- [ ] Implement evo formulas and interactions that affect `lm()` multiplier.
- [ ] Mark mounts/evo complete in the matrix only after live arbitrary cases pass.

**Progress Note (2026-05-21 S66 partial):**
- [x] Added RED/GREEN coverage for deployed module `70324`/`37013` direct evoTree stat folds: `Expose Weakness`, `Viva la Materia`, and `Watchmaker`.
- [x] Added RED/GREEN coverage for mount line fallback stats from deployed module `37013` when compact mount `bK` stat payload is absent.
- [ ] Full S66 is still incomplete: mount damage formulas, broader line variants, and residual-free endgame validation remain open.

**Commands:**
```bash
cargo test -p tttg_forge_optimizer --test tech_optimizer_performance sio_mounts_evo_match_live_compact
cd frontend && node scripts/sio_full_equivalence_gate.mjs
```

### Phase S67: LME And EE Dynamic Coverage

**Purpose:** Move from known threshold deltas to complete arbitrary LME/EE behavior.

**Files:**
- Modify: `tttg_forge_optimizer/src/tech/sio_config.rs`
- Add modules if needed: `tttg_forge_optimizer/src/tech/sio_lm/lme.rs`, `tttg_forge_optimizer/src/tech/sio_lm/ee.rs`
- Modify: `tttg_forge_optimizer/tests/tech_optimizer_performance.rs`
- Modify: `frontend/scripts/sio_arbitrary_compact_fixture_generator.mjs`
- Create/modify: `frontend/artifacts/td11/s67_*_rollup.json`

**RED:**
- [ ] Add live fixtures for LME active/inactive combinations, threshold edges, LME2 testament debuff variants, EE group entries, EE skill stats, and omnipower.
- [ ] Add tests that fail when only known compact fixture deltas are covered.

**GREEN:**
- [ ] Implement complete LME dynamic formulas and threshold behavior.
- [ ] Implement complete EE dynamic formulas, grouped stat entries, and omnipower.
- [ ] Validate LME/EE interactions against equipment/account formula outputs.

**Commands:**
```bash
cargo test -p tttg_forge_optimizer --test tech_optimizer_performance sio_lme_ee_dynamic_entries_match_live_compact
cd frontend && node scripts/sio_full_equivalence_gate.mjs
```

### Phase S68: Active Skill Slots, EnabledSkills, SkillsMap

**Purpose:** Prove arbitrary compact active skill configuration, not just existing fixtures.

**Files:**
- Modify: `tttg_forge_optimizer/src/tech/sio_lm.rs`
- Modify: `tttg_forge_optimizer/src/tech/sio_config.rs`
- Modify: `tttg_forge_optimizer/tests/tech_optimizer_performance.rs`
- Modify: `frontend/scripts/sio_arbitrary_compact_fixture_generator.mjs`
- Create/modify: `frontend/artifacts/td11/s68_*_rollup.json`

**RED:**
- [ ] Add live fixtures for active skill slots, missing slots, disabled skills, forced skills, `enabledSkills`, `skillsMap`, and mode-condition combinations.
- [ ] Add worker/optimizer parity tests where generated active skill cases change optimizer ranking, not only raw multiplier.

**GREEN:**
- [ ] Decode active skill slots and enabled/disabled state from arbitrary compact config.
- [ ] Make worker and optimizer parity loops consume generated active skill fixtures automatically.
- [ ] Validate skill-specific conditions and multiplier rows against live capture.

**Commands:**
```bash
cargo test -p tttg_forge_optimizer --test tech_optimizer_performance sio_active_skill_slots_match_live_compact
cd frontend && node scripts/sio_worker_golden_parity_check.mjs
cd frontend && node scripts/sio_tech_optimizer_parity_check.mjs
cd frontend && node scripts/sio_full_equivalence_gate.mjs
```

### Phase S69: Automated Parity Loop And Residual Source Gate

**Purpose:** Make the final evidence repeatable in one command and prevent future regression.

**Files:**
- Modify: `frontend/scripts/sio_compact_parity_matrix_check.mjs`
- Modify: `frontend/scripts/sio_full_equivalence_gate.mjs`
- Modify: `tttg_forge_optimizer/tests/tech_optimizer_performance.rs`
- Modify: `frontend/artifacts/td11/sio_lm_equivalence_matrix.json`
- Create/modify: `frontend/artifacts/td11/s69_*_rollup.json`

**RED:**
- [ ] Add a final source-gate test that fails if any production residual helper remains reachable.
- [ ] Add a final artifact-gate test that fails if any matrix domain is partial, unknown, or not live-covered.
- [ ] Add a final generated-fixture test that fails if any arbitrary compact case is synthetic-only.

**GREEN:**
- [ ] Make `sio_full_equivalence_gate.mjs` run generator, live capture validation, worker parity, optimizer parity, matrix validation, and rollup generation.
- [ ] Ensure default compact, shared/zcp compact, and generated arbitrary compact cases all run in both worker and optimizer loops.
- [ ] Remove or quarantine residual helpers from production modules.

**Commands:**
```bash
cargo test -p tttg_forge_optimizer --test tech_optimizer_performance sio_full_equivalence_gate_rejects_residual_profiles
cd frontend && node scripts/sio_full_equivalence_gate.mjs
cd frontend && node scripts/sio_compact_parity_matrix_check.mjs
```

### Phase S70: Flip `fullSioEquivalent=true`

**Purpose:** Change the flag only after all prior gates prove equivalence.

**Files:**
- Modify: `tttg_forge_optimizer/src/tech/sio_lm.rs`
- Modify: `tttg_forge_optimizer/src/tech/sio_config.rs`
- Modify: wasm/frontend schema export files if the flag is surfaced there
- Modify: `frontend/artifacts/td11/release_readiness_audit.md`
- Modify: `frontend/artifacts/td11/verification_summary.txt`
- Create: `frontend/artifacts/td11/s70_full_sio_equivalence_true_rollup.json`
- Modify: `/Users/woosung/Desktop/Dev/Woosdom_Brain/00_System/Templates/from_codex.md`

**RED:**
- [ ] Add a test that expects `fullSioEquivalent=true` and a non-compact-bridge scorer name only when the full gate artifact is green.
- [ ] Run it before changing the flag and confirm it fails.

**GREEN:**
- [ ] Set `fullSioEquivalent=true`.
- [ ] Rename or update the scorer label from `sio_compact_base_stats_transformer` to the final full-equivalence scorer name.
- [ ] Generate final rollup with exact fixture counts, pass counts, source residual scan, matrix status, benchmark p95s, and remaining risk.

**Final Verification Suite:**
```bash
cargo fmt --check
cargo test -p tttg_forge_optimizer --test tech_optimizer_performance
cargo test -p tttg_forge_wasm --test tech_parts_exports
cargo test --workspace
wasm-pack build tttg_forge_wasm --target web --release -- --features compat-exports
cd frontend && npm run build
cd frontend && node scripts/sio_lm_context_unit_test.mjs
cd frontend && node scripts/sio_worker_golden_parity_check.mjs
cd frontend && node scripts/sio_tech_optimizer_parity_check.mjs
cd frontend && USE_SIO_LM_CONTEXT=1 SIO_LM_COMPACT_ONLY=1 node scripts/sio_worker_golden_parity_check.mjs
cd frontend && USE_SIO_LM_CONTEXT=1 SIO_LM_COMPACT_ONLY=1 node scripts/sio_tech_optimizer_parity_check.mjs
cd frontend && node scripts/sio_compact_parity_matrix_check.mjs
cd frontend && node scripts/sio_full_equivalence_gate.mjs
cd frontend && node scripts/tech_optimizer_benchmark.mjs
git diff --check
```

## Evidence Artifacts Required Per Phase

## Progress Log

### S64 Collectibles/CustomSets Formula Port Partial

Status: `[S64-COLLECTIBLES-CUSTOMSETS-FORMULA-PORT-PARTIAL-GREEN-NOT-FULL-SIO]`

Completed:

- RED-first tests added for live customSet selected-count semantics, individual collectible star stats, upgraded collectible multiplier, live fixture customSet encoding, and stale live capture hash rejection.
- Ported module `42806` customSets behavior for generic non-synergy compact configs.
- Ported module `57223` individual collectible star stats and upgraded `1.33` multiplier for generic non-synergy compact configs.
- Corrected arbitrary compact fixture customSet encoding and re-captured local live SIO worker VM cases.
- Added worker summary hash validation to prevent stale live capture reuse by fixture id only.
- Preserved captured default/endgame trace parity by isolating legacy residual customSet deltas; this remains a blocker, not a proof of full equivalence.

Verification:

- `cargo test -p tttg_forge_optimizer --test tech_optimizer_performance`: passed, `90` tests.
- `node scripts/sio_arbitrary_compact_fixture_generator.mjs`: passed, `18` cases.
- `node scripts/sio_arbitrary_compact_live_capture.mjs`: passed, `18/18` live captured.
- `node scripts/sio_arbitrary_compact_worker_summary.mjs`: passed, `liveCaptured=18`, `staleLiveCapture=0`.
- `WORKER_SUMMARY_PATH=artifacts/td11/arbitrary_compact_s59/worker_decoded_summary.json OUTPUT_PATH=artifacts/td11/arbitrary_compact_s59/lm_trace_summary.json node scripts/sio_lm_trace_summary.mjs`: passed, `18/18` replay.
- `node scripts/sio_full_equivalence_gate.mjs`: passed as not-full-sio; `G0=true`, `G1/G2/G3/G6=false`.

Remaining:

- Item/tech collectible set folding is not yet ported generically.
- Synergy=true generic collectible/customSet application is still constrained by shared trace expectations.
- Captured default/endgame account residuals and calibrated equipment residuals remain production blockers.
- `fullSioEquivalent=false` remains required.

### S65-S66 Blocker Burndown Partial

Status: `[S65-S66-BLOCKER-BURNDOWN-PARTIAL-GREEN-NOT-FULL-SIO]`

Completed:

- RED-first tests added for `Battle Lust`/`Gary` Rex cooldown, default pet skill stats, xeno awakening count>=2 tables, direct evoTree stats, missing-payload mount line fallback, global collectible set thresholds, focused item/tech collectible folds, low-level synergy collectible/customSet behavior, and Venato main passive.
- Ported additional deployed minified table/formula behavior from modules `30396`, `37013`, `70324`, and `89505`.
- Preserved captured default/endgame trace parity by keeping high-level synergy and endgame residual paths gated.

Verification:

- `cargo fmt --check`: passed.
- `cargo test -p tttg_forge_optimizer --test tech_optimizer_performance`: passed, `100` tests.
- `node scripts/sio_full_equivalence_gate.mjs`: passed as not-full-sio; `G0=true`, `G1/G2/G3/G6=false`.

Remaining:

- Production calibrated equipment residual helpers remain.
- Harmony, full equipment formula decomposition, mount damage, LME/EE dynamic entries, active-skill combinatorics, and residual-free endgame paths remain incomplete.
- `fullSioEquivalent=false` remains required.

### S67 Residual Blocker Burndown Partial

Status: `[S67-RESIDUAL-BLOCKER-BURNDOWN-PARTIAL-NOT-FULL-SIO]`

Completed:

- Split the full-equivalence source gate into account residual hits and equipment residual hits.
- Removed the named production account residual helper blockers from the source scan result; `G1_noAccountResidual=true` is now green.
- Added and verified a RED attempt for removing calibrated equipment helper names, then reverted the generic equipment attempt because it broke default/qN live trace reconstruction.
- Preserved the calibration-first equipment path so S54-S59 compact parity behavior is not hidden behind a broken residual removal.

Verification:

- `cargo test -p tttg_forge_optimizer --test tech_optimizer_performance sio_lm_compact_only_reconstructs_default_live_traces_without_supplied_context -- --nocapture`: passed.
- `cargo test -p tttg_forge_optimizer --test tech_optimizer_performance sio_lm_compact_generic -- --nocapture`: passed, `36` tests.
- `cargo test -p tttg_forge_optimizer --test tech_optimizer_performance sio_lm_compact_only_reconstructs_qn5n40_live_trace_without_supplied_context -- --nocapture`: remains RED with missing `atkPercent +2`, `critDamage +83.3`, `critRate +45`, `critRateFlux +4064550`, `poisoned +10`, `shieldDamage +50`, `skillDamage +95`, `ssMiscPath +38`.
- `node scripts/sio_full_equivalence_gate.mjs`: passed as not-full-sio; `G0=true`, `G1=true`, `G2=false`, `G3=false`, `G6=false`.

Remaining:

- Calibrated equipment residual helpers remain and block G2.
- qN5n40 proves the residual removal is coupled to high-resonance active-mode/tech stat tables, equipment dynamic formulas, item optimizer/transmute behavior, and residual-free endgame coverage.
- `fullSioEquivalent=false` remains required.

### S68 High-Resonance / Equipment / Endgame Partial

Status: `[S68-HIGH-RESONANCE-EQUIPMENT-ENDGAME-PARTIAL-NOT-FULL-SIO]`

Completed:

- Added RED/GREEN coverage for high-resonance active/deployed/overload Tech stat tables from deployed module `37013`.
- Added RED/GREEN coverage for SS equipment transmute condition/effect and `damageTransmute` formula behavior.
- Ported focused dynamic SS equipment tables for Twin Lance and all currently covered SS slots, including dynamic attack caps.
- Ported focused `itemsOptimizer`/zP total-core specials for Twin/Moonscar/Glacial paths and selected item collectible-set bonuses.
- Fixed EE xeno resonance coverage by applying LME testament debuffs only in `lme2`.
- Gated HGP Wind Totem Tech set behavior to the captured live `basic` `lme1` compact path; advanced shared fixtures prove it cannot be applied broadly yet.
- Cleaned decoded compact equipment summaries so zero transmute fields are not emitted unless compact `bh`/`bo` exists.

Verification:

- `cargo test -p tttg_forge_optimizer --test tech_optimizer_performance sio_lm_ -- --nocapture`: `68/70` passed.
- `cargo test -p tttg_forge_optimizer --test tech_optimizer_performance sio_lm_compact_only_reconstructs_default_live_traces_without_supplied_context -- --nocapture`: passed.
- `node scripts/sio_full_equivalence_gate.mjs`: passed as not-full-sio; `G0=true`, `G1=true`, `G2=false`, `G3=false`, `G6=false`.
- `cargo fmt --check`: passed.
- `git diff --check`: passed.

Remaining:

- qN5n40 compact-only still misses `atkPercent +2`, `critDamage +83.3`, `critRate +45`, `critRateFlux +4064550`, `poisoned +10`, `shieldDamage +50`, `skillDamage +95`, `ssMiscPath +38`.
- Shared 4ZgaBw first failure has the same residual shape with `critRateFlux +1556670`.
- Disabling calibrated equipment residuals makes qN5n40 farther from live; applying dynamic zP specials over calibration overcorrects. The next slice must decompose the calibrated baseline into source formulas rather than stack another residual patch.
- `fullSioEquivalent=false` remains required.

Every phase after S60 must produce a rollup JSON with:

- `status`
- `fullSioEquivalent`
- `scorer`
- `domain`
- `redTests`
- `greenTests`
- `liveCaptureCount`
- `syntheticOnlyCount`
- `workerParity`
- `optimizerParity`
- `sourceResidualsBefore`
- `sourceResidualsAfter`
- `blockers`
- `verificationCommands`

The following files must be updated whenever their meaning changes:

- `frontend/artifacts/td11/sio_lm_equivalence_matrix.json`
- `frontend/artifacts/td11/release_readiness_audit.md`
- `frontend/artifacts/td11/verification_summary.txt`
- `/Users/woosung/Desktop/Dev/Woosdom_Brain/00_System/Templates/from_codex.md`

## Stop Conditions

Stop only in one of these states:

| State | Meaning |
| --- | --- |
| Complete | G0-G6 are green, final verification passes, and `fullSioEquivalent=true` is set with final rollup. |
| Blocked | Independent live expected multipliers cannot be captured from available local code/data, or a required `sio-tools lm()` formula source cannot be recovered without external data. The blocker must list exact missing domain, attempted commands, and why local evidence is insufficient. |

## Implementation Discipline

- Keep `fullSioEquivalent=false` until Phase S70.
- For every domain, add RED parity or source-gate tests before formula implementation.
- Do not count local stage-product replay as live equivalence evidence.
- Do not remove residuals until the corresponding formula has live parity.
- Do not mark a matrix domain complete unless arbitrary generated live fixtures cover it.
- Preserve S54/S55/S56/S57/S58/S59 green checks after each GREEN.
- After each phase, update rollup, audit, verification summary, and `from_codex.md`.
