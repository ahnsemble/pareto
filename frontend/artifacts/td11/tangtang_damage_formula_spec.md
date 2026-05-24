# Tangtang Damage Formula Derivation

generatedAtKst: 2026-05-23
status: [TANGTANG-DAMAGE-FORMULA-SPEC-GREEN]
claim: `sio-tools-equivalent`
behaviorChange: `false`

## Executive Summary

This is a source/live SIO Tools-equivalent Tangtang damage formula derivation. It documents the current scorer contract and evidence-backed multiplier-stage mapping without changing formula semantics, scoring core, Rust formula code, WASM scoring behavior, optimizer ranking, or product UI.

This is not a claim that every in-game description line was independently captured from first-party game UI and verified as an official formula. Source-derived evidence and direct in-game verified evidence remain separate.

Contract:

- `fullSioEquivalent=true`
- `currentScorer=sio_full_lm_equivalence`
- `scorer=sio_full_lm_equivalence`
- `liveCaptureCount=26`
- `workerParity.arbitraryGeneratedLiveExpected=26/26`

Key source/live counts:

- Raw current source stat leaves: 4650
- Raw leaves with direct multiplier stage mapping: 3878
- Mount normalized claims: 26
- Target survivor normalized claims: 11
- Collectible threshold rows: 170
- Collectible special Rust mappings: 14
- Direct in-game description verified rows: 0

## Formula Stage Table

| Stage | Stat channels | Source evidence count | Source domains | Multiplier role | Known caveats |
|---|---|---:|---|---|---|
| en0 attack aggregate | atkBase, atkEquip, atkEquipPercent, atkHero, atkHeroPercent, atkPercent, atkFinal | 253 | evoTree, heroes, items, sets | Attack aggregate over base, equipment, hero, percent, and final attack channels before downstream multipliers. | SIO Tools-equivalent stage mapping only; not an independently captured first-party in-game formula.<br>Source-derived rows must not be promoted to direct in-game-description-verified evidence.<br>Formula input channel(s) outside SIO_STATS_FIXED_ORDER: atkBase.<br>Attack aggregation depends on upstream compact stat reconstruction and is not a standalone in-game text claim. |
| en1 crit expectation | critRate, critDamage | 970 | baseStats, collectibles, customSets, ee, evoTree, harmony, heroes, items, lme, mounts, petSkills, pets, sets, synergy, techs | Expected critical hit multiplier from crit rate and crit damage channels. | SIO Tools-equivalent stage mapping only; not an independently captured first-party in-game formula.<br>Source-derived rows must not be promoted to direct in-game-description-verified evidence. |
| en2 vulnerability | vulnerability | 355 | harmony, heroes, items, lme, pets, techs | Positive vulnerability channel multiplier. | SIO Tools-equivalent stage mapping only; not an independently captured first-party in-game formula.<br>Source-derived rows must not be promoted to direct in-game-description-verified evidence.<br>The first live trace stage at the same numeric index is skillDamage; this spec keeps the requested Tangtang/Rust provenance label en2 vulnerability. |
| en3 shield damage uptime | shieldDamage, shieldDamageUptime | 468 | baseStats, ee, heroes, items, lme, mounts, pets, sets, synergy, techs | Shield damage channel weighted by uptime. | SIO Tools-equivalent stage mapping only; not an independently captured first-party in-game formula.<br>Source-derived rows must not be promoted to direct in-game-description-verified evidence. |
| en4 target status damage | poisoned, poisonedUptime, weakened, weakenedUptime, chilled, chilledUptime, exposedDamage | 1222 | baseStats, customSets, ee, harmony, heroes, items, lme, mounts, pets, sets, synergy, techs | Poisoned, weakened, chilled, and exposed status damage contribution. | SIO Tools-equivalent stage mapping only; not an independently captured first-party in-game formula.<br>Source-derived rows must not be promoted to direct in-game-description-verified evidence. |
| en5 clarity | clarity | 3 | items | Clarity percentage multiplier. | SIO Tools-equivalent stage mapping only; not an independently captured first-party in-game formula.<br>Source-derived rows must not be promoted to direct in-game-description-verified evidence. |
| en6 eternal multiplier | eternalMultiplier | 8 | items | Eternal multiplier channel. | SIO Tools-equivalent stage mapping only; not an independently captured first-party in-game formula.<br>Source-derived rows must not be promoted to direct in-game-description-verified evidence. |
| en7 glacial bloodline | glacialBloodline | 3 | items | Glacial Bloodline multiplier channel. | SIO Tools-equivalent stage mapping only; not an independently captured first-party in-game formula.<br>Source-derived rows must not be promoted to direct in-game-description-verified evidence. |
| en8 laceration/divine fire | laceration, lacerationUptime, divineFire, divineFireUptime | 253 | baseStats, harmony, heroes, items, lme, mounts, sets, synergy, techs | Laceration and Divine Fire damage channels weighted by uptime. | SIO Tools-equivalent stage mapping only; not an independently captured first-party in-game formula.<br>Source-derived rows must not be promoted to direct in-game-description-verified evidence. |
| en9 Joey weak spot | joeyWeakSpot | 8 | heroes | Joey weak spot multiplier channel. | SIO Tools-equivalent stage mapping only; not an independently captured first-party in-game formula.<br>Source-derived rows must not be promoted to direct in-game-description-verified evidence. |
| en10 SS gloves laser | ssGlovesLaser | 3 | items | SS gloves laser multiplier channel. | SIO Tools-equivalent stage mapping only; not an independently captured first-party in-game formula.<br>Source-derived rows must not be promoted to direct in-game-description-verified evidence. |
| en11 flashrift rip | flashriftRip | 0 | none in current source leaves | Flashrift rip multiplier channel. | SIO Tools-equivalent stage mapping only; not an independently captured first-party in-game formula.<br>Source-derived rows must not be promoted to direct in-game-description-verified evidence.<br>No raw current source stat leaf was present for this stage in the captured source evidence matrix. |
| en12 Taloxa overload | taloxaOverload | 9 | heroes | Taloxa overload multiplier channel. | SIO Tools-equivalent stage mapping only; not an independently captured first-party in-game formula.<br>Source-derived rows must not be promoted to direct in-game-description-verified evidence. |
| en13 Eternal Suit boost | eternalSuitBoost | 2 | items | Eternal Suit optional boost multiplier. | SIO Tools-equivalent stage mapping only; not an independently captured first-party in-game formula.<br>Source-derived rows must not be promoted to direct in-game-description-verified evidence. |
| en14 Voidwaker Emblem boost | voidNeckBoost, voidNeckBoostUptime | 5 | baseStats, items | Voidwaker Emblem optional boost multiplied by uptime. | SIO Tools-equivalent stage mapping only; not an independently captured first-party in-game formula.<br>Source-derived rows must not be promoted to direct in-game-description-verified evidence.<br>Voidwaker Emblem uptime remains governed by SIO LM/source equivalence evidence. |
| en15 Voidwaker Handguards instakill | voidGlovesInstakill | 1 | items | Voidwaker Handguards instakill optional multiplier. | SIO Tools-equivalent stage mapping only; not an independently captured first-party in-game formula.<br>Source-derived rows must not be promoted to direct in-game-description-verified evidence. |
| en16 Voidwaker Treads boost | voidBootsBoost | 1 | items | Voidwaker Treads optional boost multiplier. | SIO Tools-equivalent stage mapping only; not an independently captured first-party in-game formula.<br>Source-derived rows must not be promoted to direct in-game-description-verified evidence. |
| en17 chaos belt boost | chaosBeltBoost | 0 | none in current source leaves | Chaos belt optional boost multiplier. | SIO Tools-equivalent stage mapping only; not an independently captured first-party in-game formula.<br>Source-derived rows must not be promoted to direct in-game-description-verified evidence.<br>No raw current source stat leaf was present for this stage in the captured source evidence matrix. |
| en18 HP Bullet boost | hpBulletBoost | 1 | skills | HP Bullet optional boost multiplier. | SIO Tools-equivalent stage mapping only; not an independently captured first-party in-game formula.<br>Source-derived rows must not be promoted to direct in-game-description-verified evidence. |
| en19 damage dealt | damageDealt | 223 | ee, lme | Damage dealt percentage multiplier. | SIO Tools-equivalent stage mapping only; not an independently captured first-party in-game formula.<br>Source-derived rows must not be promoted to direct in-game-description-verified evidence. |
| en20 adrenaline | adrenaline | 9 | heroes | Adrenaline percentage multiplier. | SIO Tools-equivalent stage mapping only; not an independently captured first-party in-game formula.<br>Source-derived rows must not be promoted to direct in-game-description-verified evidence. |
| en21 xeno transmute damage | damageTransmute | 0 | none in current source leaves | Xeno transmute damage percentage multiplier. | SIO Tools-equivalent stage mapping only; not an independently captured first-party in-game formula.<br>Source-derived rows must not be promoted to direct in-game-description-verified evidence.<br>No raw current source stat leaf was present for this stage in the captured source evidence matrix. |
| en22 boss damage | damageBoss | 81 | customSets, harmony, heroes, items, lme, mounts, pets, sets, synergy, techs | Boss damage percentage multiplier. | SIO Tools-equivalent stage mapping only; not an independently captured first-party in-game formula.<br>Source-derived rows must not be promoted to direct in-game-description-verified evidence. |
| en23 xeno resonance multiplier | xenoResMultiplier | 0 | none in current source leaves | Xeno resonance percentage multiplier. | SIO Tools-equivalent stage mapping only; not an independently captured first-party in-game formula.<br>Source-derived rows must not be promoted to direct in-game-description-verified evidence.<br>No raw current source stat leaf was present for this stage in the captured source evidence matrix. |
| en24 LME phase damage | lme1Damage | 0 | none in current source leaves | LME phase damage percentage multiplier. | SIO Tools-equivalent stage mapping only; not an independently captured first-party in-game formula.<br>Source-derived rows must not be promoted to direct in-game-description-verified evidence.<br>No raw current source stat leaf was present for this stage in the captured source evidence matrix.<br>LME phase damage is mode-dependent and represented here only as the requested en24 channel. |

## Domain Coverage

| Domain | Status | Source evidence count | Stage refs | Evidence artifacts | Caveat |
|---|---|---:|---|---|---|
| attack/base | source/live SIO Tools-equivalent | 8 | en0 | frontend/artifacts/td11/sio_tools_formula_source_evidence_matrix.json | Base attack rows are source-derived and rely on compact input reconstruction. |
| equipment | implemented-live-covered | 383 | en0, en10, en13, en14, en15, en16, en17, en18, en19, en21, en22 | frontend/artifacts/td11/sio_lm_equivalence_matrix.json<br>frontend/artifacts/td11/damage_formula_provenance_matrix.md | SS equipment is live-equivalent; non-SS weapons remain catalog-only and unsupported as formula inputs. |
| survivor | implemented-live-covered | 440 | en0, en1, en2, en8, en12, en20 | frontend/artifacts/td11/in_game_description_evidence_matrix.json<br>frontend/artifacts/td11/targeted_live_evidence/targeted_live_evidence_matrix.json | SpongeBob/Squidward/Yelena remain source/live backed without direct first-party description capture. |
| pet | implemented-live-covered | 56 | en23 | frontend/artifacts/td11/sio_lm_equivalence_matrix.json | Pet and xeno effects are covered through compact SIO LM equivalence, not a direct per-skill in-game text audit. |
| tech | implemented-live-covered | 914 | en1, en2, en3, en4, en8, en19, en22 | frontend/artifacts/td11/sio_lm_equivalence_matrix.json<br>frontend/artifacts/td11/damage_formula_provenance_matrix.md | Tech modifier and active-skill behavior remains governed by SIO LM/source equivalence gates. |
| mount | implemented-live-covered | 52 | en1, en3, en4, en8, en22 | frontend/artifacts/td11/mount_damage_source_fixture.json<br>frontend/artifacts/td11/sio_tools_live_evidence_matrix.json | mountDamage source/live evidence exists; 9 direct first-party Doomsteed line capture atom rows match current handling, while complete mount line capture coverage remains incomplete. |
| collectible | implemented-live-covered | 170 | en1, en2, en3, en4, en8, en19, en22 | frontend/artifacts/td11/collectible_effect_mapping_matrix.json | Item/set mapping is source/Rust backed; item/set-level in-game description capture is incomplete and 46 catalog-only rows stay isolated. |
| custom-set | implemented-live-covered | 215 | en0, en1, en2, en3, en4, en8, en19, en22 | frontend/artifacts/td11/sio_lm_equivalence_matrix.json | Custom-set rows are source/live equivalent through compact replay, not direct in-game text claims. |
| LME | implemented-live-covered | 2074 | en24 | frontend/artifacts/td11/sio_lm_trace_summary_2026-05-20.json | LME phase damage is mode-dependent and remains a SIO Tools-equivalent derivation. |
| effect | source/live SIO Tools-equivalent | 338 | en1, en2, en3, en4, en8, en19, en20, en22 | frontend/artifacts/td11/sio_tools_formula_source_evidence_matrix.json | Effect rows feed stat channels through source/live gates and are not standalone official in-game formula proof. |
| status | source/live SIO Tools-equivalent | 1943 | en3, en4, en8 | frontend/artifacts/td11/sio_tools_formula_source_evidence_matrix.json | Status damage uses source-derived channels plus uptime channels; direct first-party text verification remains incomplete. |

## Caveats And Blockers

- This spec claims only SIO Tools-equivalent Tangtang damage formula derivation, not a full direct first-party in-game text verification.
- The requested Tangtang/Rust provenance en0-en24 labels are documented as the current local formula stage labels; live SIO trace factors include a standalone skillDamage factor, so trace indices must not be treated as direct official in-game stage labels.
- non-SS weapons remain catalog-only and unsupported as formula inputs until fixture evidence exists.
- SpongeBob/Squidward/Yelena are source/live backed but do not have direct first-party in-game description capture.
- Mounts have source/live mountDamage evidence and 9 direct first-party Doomsteed line capture atom rows, but complete exact per-line mount text coverage is still incomplete.
- Collectible item/set mapping is source/Rust backed, but item/set-level in-game description capture is incomplete.
- Four collectible set threshold rows have direct first-party 15-to-19 description correction evidence, but remain candidate-only because there are zero observed damage trials.
- Catalog-only collectible rows remain isolated.
- No formula semantics, scoring core, Rust damage formula, WASM scoring behavior, optimizer ranking, or product UI changed.

## Description Formula Validation Gate

- Validation matrix: `frontend/artifacts/td11/tangtang_description_formula_validation_matrix.json`
- Validation protocol: `frontend/artifacts/td11/tangtang_description_formula_validation_protocol.md`
- Status: `[TANGTANG-DESCRIPTION-FORMULA-VALIDATION-PROTOCOL-READY]`
- Claim: `description-derived-formula-validation-protocol`
- Primary validation layer: `description-derived-formula-validation`
- Current description-derived formula correctness claim: `not-established`
- Formula atom rows: 221
- Stage bucket taxonomy rows: 25
- Mount atom rows: 26
- Survivor atom rows: 11
- Collectible threshold atom rows: 170
- Collectible special Rust mapping atom rows: 14
- Graph mode: `deterministic-atom-ledger-not-graphrag`
- Direct first-party description-derived formula rows in formula-validation gate before capture import: 0
- Description/SIO divergence rows: 0
- Observed damage validation role: Observed damage validation is secondary confirmation for description-vs-SIO divergences, not the first validation layer.
- Can claim SIO formula description-correct: `false`
- Can apply Tangtang formula correction: `false`

## Description Capture Import Gate

- Capture inbox: `frontend/artifacts/td11/tangtang_description_capture_inbox.json`
- Import matrix: `frontend/artifacts/td11/tangtang_description_capture_import_matrix.json`
- Import protocol: `frontend/artifacts/td11/tangtang_description_capture_import_protocol.md`
- Status: `[TANGTANG-DESCRIPTION-CAPTURE-IMPORT-GATE-READY]`
- Claim: `description-capture-import-gate`
- Capture inbox rows: 14
- Direct first-party description capture rows: 14
- Parsed description formula rows: 14
- Matched SIO rows: 10
- Description/SIO divergence rows: 4
- Observed damage follow-up rows: 4
- Captured atom rows: 14
- Formula atom rows remaining without direct capture: 207
- Can run observed damage follow-up: `true`
- Can apply Tangtang formula correction: `false`

## First-Party Description Source Inventory

- Source inventory: `frontend/artifacts/td11/tangtang_first_party_description_source_inventory.json`
- Source inventory protocol: `frontend/artifacts/td11/tangtang_first_party_description_source_inventory.md`
- Status: `[TANGTANG-FIRST-PARTY-DESCRIPTION-SOURCE-INVENTORY-READY]`
- Claim: `first-party-description-source-inventory`
- Official/public source candidates checked: 8
- Official/public sources with structured formula rows: 0
- Official/public rows promoted to direct capture: 0
- Local app resource artifacts found: 0
- Rows requiring direct description capture: 221
- Direct first-party description-derived formula rows in formula-validation gate before capture import: 0
- Direct first-party description capture rows: 14
- Parsed description formula rows: 14
- Matched SIO rows: 10
- Formula atom rows remaining without direct capture: 207
- User one-by-one capture required: `true`
- Public official web sufficient for formula validation: `false`

## In-Game Damage Validation Gate

- Validation matrix: `frontend/artifacts/td11/tangtang_in_game_damage_validation_matrix.json`
- Validation protocol: `frontend/artifacts/td11/tangtang_in_game_damage_validation_protocol.md`
- Status: `[TANGTANG-IN-GAME-DAMAGE-VALIDATION-PROTOCOL-READY]`
- Claim: `in-game-validation-protocol`
- Primary validation layer: `description-derived-formula-validation`
- Observed damage validation layer: `follow-up-divergence-check-only`
- Current in-game correctness claim: `not-established`
- Direct first-party description-derived formula rows in formula-validation gate before capture import: 0
- Description/SIO divergence rows: 0
- Direct observed in-game damage trials: 0
- Can claim SIO formula in-game correct: `false`
- Can apply Tangtang formula correction: `false`
- Can run observed damage follow-up without description divergence: `false`
- Current correction status: `blocked-description-derived-formula-validation-incomplete`

## Collectible Threshold Correction Spec Gate

- Correction spec: `frontend/artifacts/td11/tangtang_collectible_threshold_correction_spec.json`
- Correction spec protocol: `frontend/artifacts/td11/tangtang_collectible_threshold_correction_spec.md`
- Status: `[TANGTANG-COLLECTIBLE-THRESHOLD-CORRECTION-SPEC-GREEN]`
- Claim: `tangtang-description-corrected-candidate`
- Decision status: `candidate-only-not-applied`
- Behavior change: `false`
- Scoring changed: `false`
- Corrected mode implemented: `false`
- Correction eligible now: `false`
- Direct confirmed correction rows: 4
- Threshold-only mismatch rows: 4
- Source threshold 15 rows: 4
- Direct threshold 19 rows: 4
- Inferred-family pending rows: 30
- Direct observed damage trials: 0
- Proposed corrected scorer: `tangtang_description_corrected_thresholds`
- Corrected contract status: `not-implemented-blocked-by-evidence-policy`
- Full SIO-equivalent contract preserved: `true`
- Default SIO behavior changed: `false`
- UI changed: `false`
- Raw SIO LM JSON exposed: `false`

## Unsupported Formula Inputs

- non-SS weapons remain catalog-only and unsupported as formula inputs: 8 rows.
- Catalog-only collectible rows remain isolated: 46 rows.

## Evidence Artifacts

- `frontend/artifacts/td11/sio_tools_formula_source_evidence_matrix.json`
- `frontend/artifacts/td11/damage_formula_provenance_matrix.md`
- `frontend/artifacts/td11/sio_tools_live_evidence_matrix.json`
- `frontend/artifacts/td11/targeted_live_evidence/targeted_live_evidence_matrix.json`
- `frontend/artifacts/td11/in_game_description_evidence_matrix.json`
- `frontend/artifacts/td11/collectible_effect_mapping_matrix.json`
- `frontend/artifacts/td11/mount_damage_source_fixture.json`
- `frontend/artifacts/td11/sio_lm_trace_summary_2026-05-20.json`
- `frontend/artifacts/td11/sio_lm_input_summary_2026-05-20.json`
- `frontend/artifacts/td11/sio_lm_equivalence_matrix.json`
- `frontend/artifacts/td11/tangtang_description_formula_validation_matrix.json`
- `frontend/artifacts/td11/tangtang_description_formula_validation_protocol.md`
- `frontend/artifacts/td11/tangtang_description_capture_inbox.json`
- `frontend/artifacts/td11/tangtang_description_capture_import_matrix.json`
- `frontend/artifacts/td11/tangtang_description_capture_import_protocol.md`
- `frontend/artifacts/td11/tangtang_first_party_description_source_inventory.json`
- `frontend/artifacts/td11/tangtang_first_party_description_source_inventory.md`
- `frontend/artifacts/td11/tangtang_in_game_damage_validation_matrix.json`
- `frontend/artifacts/td11/tangtang_in_game_damage_validation_protocol.md`
- `frontend/artifacts/td11/tangtang_collectible_threshold_correction_spec.json`
- `frontend/artifacts/td11/tangtang_collectible_threshold_correction_spec.md`
- `frontend/app/lib/pareto-store/schemas/index.ts`
- `frontend/scripts/sio_tools_formula_source_evidence_unit_test.mjs`
- `frontend/scripts/damage_formula_provenance_matrix_unit_test.mjs`

## Verification Commands

- `node scripts/tangtang_damage_formula_spec_unit_test.mjs`
- `node scripts/tangtang_first_party_description_source_inventory_unit_test.mjs`
- `node scripts/tangtang_description_capture_import_unit_test.mjs`
- `node scripts/tangtang_description_formula_validation_unit_test.mjs`
- `node scripts/tangtang_in_game_damage_validation_unit_test.mjs`
- `node scripts/tangtang_collectible_threshold_correction_spec_unit_test.mjs`
- `node scripts/sio_tools_formula_source_evidence_unit_test.mjs`
- `node scripts/damage_formula_provenance_matrix_unit_test.mjs`
- `node scripts/in_game_description_evidence_unit_test.mjs`
- `node scripts/sio_tools_live_evidence_matrix_unit_test.mjs`
- `node scripts/sio_tools_targeted_live_evidence_unit_test.mjs`
- `node scripts/mount_damage_source_fixture_unit_test.mjs`
- `node scripts/collectible_effect_mapping_matrix_unit_test.mjs`
- `node scripts/generic_aggregate_non_authority_gate.mjs`
- `npx tsc --noEmit`
- `SIO_FULL_EQUIVALENCE_REQUIRED=1 node scripts/sio_full_equivalence_gate.mjs`
- `git diff --check`
