# Tangtang In-Game Damage Validation Protocol

generatedAtKst: 2026-05-23
status: [TANGTANG-IN-GAME-DAMAGE-VALIDATION-PROTOCOL-READY]
claim: `in-game-validation-protocol`
behaviorChange: `false`

## Purpose

This gate is for validating whether the current SIO Tools-equivalent damage formula matches direct in-game observed damage. It is separate from the existing Tangtang=SIO equivalence gates.

Current decision:

- SIO formula in-game correctness claim: `not-established`
- Direct observed in-game damage trials: 0
- Direct first-party description verified rows: 0
- Tangtang formula correction allowed now: `false`
- Current Tangtang formula may remain: `true`

## Validation Method

Use ratio-first validation. Each trial changes one controlled variable while holding the rest of the build, mode, target, crit/non-crit path, skill tick identity, and buff uptime constant. Absolute damage validation is allowed only after target defense, rounding, RNG, and hit identity are isolated.

If SIO and observed damage diverge, Tangtang can improve beyond SIO only after repeated controlled evidence exists and a correction spec documents the exact divergence. Until then, Tangtang remains limited to the SIO Tools-equivalent claim.

## Observation Schema

Required fields:

- `trialId`
- `captureDateKst`
- `gameVersion`
- `mode`
- `targetType`
- `controlledVariable`
- `baselineStateSnapshot`
- `variantStateSnapshot`
- `observedBaselineDamageSamples`
- `observedVariantDamageSamples`
- `predictedBaselineDamage`
- `predictedVariantDamage`
- `predictedRatio`
- `observedRatio`
- `relativeError`
- `rawCaptureArtifactPaths`
- `verdict`

Verdicts:

- `pending`
- `matches-sio-within-tolerance`
- `sio-divergent-needs-replication`
- `invalid-uncontrolled-trial`

Default ratio tolerance: 1%

Replication requirement: A SIO-divergent finding needs at least three independent controlled trials for the same variable before Tangtang formula correction can be proposed.

## Trial Groups

| Priority | Trial group | Variable | Minimum trials | Current trials | Status | Method |
|---:|---|---|---:|---:|---|---|
| 1 | baseline-attack-aggregate | attack/base aggregate | 3 | 0 | needs-direct-in-game-damage-observations | Hold all damage multipliers constant, change only attack/base inputs, compare observed damage ratio to predicted attack ratio. |
| 1 | skill-damage-stage-order | skillDamage stage ordering | 5 | 0 | needs-direct-in-game-damage-observations | Use one active skill and vary only skillDamage-producing inputs to determine whether in-game ordering matches SIO trace behavior. |
| 1 | vulnerability-and-status-uptime | vulnerability/status/uptime multipliers | 5 | 0 | needs-direct-in-game-damage-observations | Capture paired trials with and without each status effect; use ratio validation before attempting absolute damage validation. |
| 1 | boss-damage | damageBoss | 3 | 0 | needs-direct-in-game-damage-observations | Compare boss-target damage with controlled non-boss baseline where possible, isolating only boss damage changes. |
| 1 | lme-phase-damage | lme1Damage | 3 | 0 | needs-direct-in-game-damage-observations | Run LME phase-specific paired observations and compare LME damage ratios against non-LME baseline predictions. |
| 1 | mount-damage-ce-contribution | mountDamage contribution | 3 | 0 | needs-direct-in-game-damage-observations | Use active mount rows with non-zero mountDamage and compare isolated mount-on/mount-off observed ratios. |
| 2 | collectible-thresholds | collectible item/set threshold effects | 5 | 0 | needs-direct-in-game-damage-observations | Cross threshold boundaries one at a time and compare observed ratios against the mapped source/Rust stat channel. |
| 2 | collaboration-survivors | target survivor transforms | 3 | 0 | needs-direct-in-game-damage-observations | Capture direct first-party survivor description and paired damage observations for each source/live-backed survivor. |
| 3 | non-ss-weapons | non-SS weapon formula contribution | 3 | 0 | blocked-catalog-only | Keep non-SS weapons catalog-only until direct source/description and observed damage fixtures establish formula inputs. |

## Current Evidence Summary

- Formula spec claim: `sio-tools-equivalent`
- Formula behavior change: `false`
- Raw source stat leaves: 4650
- Live capture count: 26
- Worker parity: 26/26
- Target survivor live rows: 3
- Mount normalized claims: 26
- Non-zero mountDamage live rows: 2
- Collectible threshold rows: 170
- Collectible special Rust mappings: 14
- Direct in-game description verified rows: 0
- Stage label caveat: Live SIO trace factors include standalone skillDamage; local Tangtang/Rust provenance labels keep en2 as vulnerability and en24 as LME phase damage.

## Blockers

- No direct in-game observed damage trial pack exists yet.
- Direct first-party in-game description verified rows remain 0.
- SIO Tools source/live equivalence is not the same as proving SIO formula correctness against game damage.
- non-SS weapons remain catalog-only unsupported as formula inputs.
- Mount exact per-line in-game text capture remains missing.
- Collectible item/set direct description capture remains incomplete.

## Correction Policy

Tangtang may improve beyond SIO in principle, but not from source/live equivalence evidence alone. A correction is blocked until all of these are true:

- direct observed in-game damage trials exist for the affected variable
- paired ratio-first observations isolate a single variable
- at least three independent controlled trials reproduce a SIO divergence
- a Tangtang correction spec documents the difference from SIO and the in-game evidence
- existing SIO-equivalence behavior is intentionally superseded behind an explicit gate

Current correction status: `blocked-no-direct-observed-damage-trials`

## Evidence Artifacts

- `frontend/artifacts/td11/tangtang_damage_formula_spec.json`
- `frontend/artifacts/td11/tangtang_damage_formula_spec.md`
- `frontend/artifacts/td11/damage_formula_provenance_matrix.md`
- `frontend/artifacts/td11/sio_tools_formula_source_evidence_matrix.json`
- `frontend/artifacts/td11/sio_tools_live_evidence_matrix.json`
- `frontend/artifacts/td11/targeted_live_evidence/targeted_live_evidence_matrix.json`
- `frontend/artifacts/td11/in_game_description_evidence_matrix.json`
- `frontend/artifacts/td11/collectible_effect_mapping_matrix.json`
- `frontend/artifacts/td11/mount_damage_source_fixture.json`
- `frontend/artifacts/td11/sio_lm_trace_summary_2026-05-20.json`
- `frontend/artifacts/td11/sio_lm_equivalence_matrix.json`

## Verification Commands

- `node scripts/tangtang_in_game_damage_validation_unit_test.mjs`
- `node scripts/tangtang_damage_formula_spec_unit_test.mjs`
- `node scripts/damage_formula_provenance_matrix_unit_test.mjs`
- `node scripts/in_game_description_evidence_unit_test.mjs`
- `node scripts/sio_tools_live_evidence_matrix_unit_test.mjs`
- `SIO_FULL_EQUIVALENCE_REQUIRED=1 node scripts/sio_full_equivalence_gate.mjs`
- `git diff --check`
