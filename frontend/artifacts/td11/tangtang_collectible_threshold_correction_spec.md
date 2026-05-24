# Tangtang Collectible Threshold Correction Spec

generatedAtKst: 2026-05-23
status: [TANGTANG-COLLECTIBLE-THRESHOLD-CORRECTION-SPEC-GREEN]
claim: `tangtang-description-corrected-candidate`
behaviorChange: `false`

## Decision

- Status: `candidate-only-not-applied`
- Scoring changed: `false`
- Corrected mode implemented: `false`
- Correction eligible now: `false`
- Rationale: Direct first-party descriptions repeatedly show four 15-to-19 collectible set threshold mismatches, but there are zero controlled observed damage trials and no approved description-only correction policy.

Required before application:

- observed damage evidence for the affected threshold band or explicit user-approved description-only correction policy
- a dedicated corrected scorer/gate name separate from sio_full_lm_equivalence
- RED/GREEN behavior tests proving 15-18 no longer applies only in corrected mode
- SIO-equivalent mode remains current source/Rust behavior

## SIO-Equivalent Contract

- Full SIO equivalent: `true`
- Current scorer: `sio_full_lm_equivalence`
- Default behavior changed: `false`
- Proposed corrected scorer: `tangtang_description_corrected_thresholds`
- Corrected scorer status: `not-implemented-blocked-by-evidence-policy`

## Summary

- Direct confirmed correction rows: 4
- Threshold-only mismatch rows: 4
- Source threshold 15 rows: 4
- Direct threshold 19 rows: 4
- Value unchanged rows: 4
- Stat/channel unchanged rows: 4
- Multiplier-stage unchanged rows: 4
- Correction eligible rows: 0
- Direct observed damage trials: 0
- 3-item gold/red ATK% universe rows: 34
- Inferred-family pending rows: 30

## Direct Confirmed Rows

| Atom row | Source condition | Direct condition | Value | Channel | Stage unchanged | Eligible now |
|---|---|---|---:|---|---|---|
| collectible-set:dreamOrReality:gold:15:atkPercent | gold >= 15 | gold >= 19 | 4 | atkPercent | true | false |
| collectible-set:dreamOrReality:red:15:atkPercent | red >= 15 | red >= 19 | 6 | atkPercent | true | false |
| collectible-set:genesis:gold:15:atkPercent | gold >= 15 | gold >= 19 | 4 | atkPercent | true | false |
| collectible-set:genesis:red:15:atkPercent | red >= 15 | red >= 19 | 6 | atkPercent | true | false |

## Inferred-Family Pending Rows

| Atom row | Source condition | Inferred condition | Value | Channel | Status |
|---|---|---|---:|---|---|
| collectible-set:cornerOfTheUniverseI:gold:15:atkPercent | gold >= 15 | gold >= 19 | 4 | atkPercent | inferred-family-pending |
| collectible-set:cornerOfTheUniverseI:red:15:atkPercent | red >= 15 | red >= 19 | 6 | atkPercent | inferred-family-pending |
| collectible-set:cornerOfTheUniverseIII:gold:15:atkPercent | gold >= 15 | gold >= 19 | 4 | atkPercent | inferred-family-pending |
| collectible-set:cornerOfTheUniverseIII:red:15:atkPercent | red >= 15 | red >= 19 | 6 | atkPercent | inferred-family-pending |
| collectible-set:deletedMemories:gold:15:atkPercent | gold >= 15 | gold >= 19 | 4 | atkPercent | inferred-family-pending |
| collectible-set:deletedMemories:red:15:atkPercent | red >= 15 | red >= 19 | 6 | atkPercent | inferred-family-pending |
| collectible-set:dreamseekerVoyage:gold:15:atkPercent | gold >= 15 | gold >= 19 | 4 | atkPercent | inferred-family-pending |
| collectible-set:dreamseekerVoyage:red:15:atkPercent | red >= 15 | red >= 19 | 6 | atkPercent | inferred-family-pending |
| collectible-set:dronesAreSafest:gold:15:atkPercent | gold >= 15 | gold >= 19 | 4 | atkPercent | inferred-family-pending |
| collectible-set:dronesAreSafest:red:15:atkPercent | red >= 15 | red >= 19 | 6 | atkPercent | inferred-family-pending |
| collectible-set:extraterrestrialRitual:gold:15:atkPercent | gold >= 15 | gold >= 19 | 4 | atkPercent | inferred-family-pending |
| collectible-set:extraterrestrialRitual:red:15:atkPercent | red >= 15 | red >= 19 | 6 | atkPercent | inferred-family-pending |
| collectible-set:firstMyth:gold:15:atkPercent | gold >= 15 | gold >= 19 | 4 | atkPercent | inferred-family-pending |
| collectible-set:firstMyth:red:15:atkPercent | red >= 15 | red >= 19 | 6 | atkPercent | inferred-family-pending |
| collectible-set:inescapable:gold:15:atkPercent | gold >= 15 | gold >= 19 | 4 | atkPercent | inferred-family-pending |
| collectible-set:inescapable:red:15:atkPercent | red >= 15 | red >= 19 | 6 | atkPercent | inferred-family-pending |
| collectible-set:justEnoughToIgnoreTheFog:gold:15:atkPercent | gold >= 15 | gold >= 19 | 4 | atkPercent | inferred-family-pending |
| collectible-set:justEnoughToIgnoreTheFog:red:15:atkPercent | red >= 15 | red >= 19 | 6 | atkPercent | inferred-family-pending |
| collectible-set:lifeRebootDevice:gold:15:atkPercent | gold >= 15 | gold >= 19 | 4 | atkPercent | inferred-family-pending |
| collectible-set:lifeRebootDevice:red:15:atkPercent | red >= 15 | red >= 19 | 6 | atkPercent | inferred-family-pending |
| collectible-set:luckThroughTheRoof:gold:15:atkPercent | gold >= 15 | gold >= 19 | 4 | atkPercent | inferred-family-pending |
| collectible-set:luckThroughTheRoof:red:15:atkPercent | red >= 15 | red >= 19 | 6 | atkPercent | inferred-family-pending |
| collectible-set:merfolkDisguiseAttempt:gold:15:atkPercent | gold >= 15 | gold >= 19 | 4 | atkPercent | inferred-family-pending |
| collectible-set:merfolkDisguiseAttempt:red:15:atkPercent | red >= 15 | red >= 19 | 6 | atkPercent | inferred-family-pending |
| collectible-set:parallelDimension:gold:15:atkPercent | gold >= 15 | gold >= 19 | 4 | atkPercent | inferred-family-pending |
| collectible-set:parallelDimension:red:15:atkPercent | red >= 15 | red >= 19 | 6 | atkPercent | inferred-family-pending |
| collectible-set:unbreakable:gold:15:atkPercent | gold >= 15 | gold >= 19 | 4 | atkPercent | inferred-family-pending |
| collectible-set:unbreakable:red:15:atkPercent | red >= 15 | red >= 19 | 6 | atkPercent | inferred-family-pending |
| collectible-set:uncontrollableSuperpower:gold:15:atkPercent | gold >= 15 | gold >= 19 | 4 | atkPercent | inferred-family-pending |
| collectible-set:uncontrollableSuperpower:red:15:atkPercent | red >= 15 | red >= 19 | 6 | atkPercent | inferred-family-pending |

## UI Exposure Guard

- User-facing product name: `Tangtang`
- User-facing SIO term exposed: `false`
- Raw SIO LM JSON exposed: `false`
- Debug UI exposed: `false`
- Preselect UI exposed: `false`
- Beam UI exposed: `false`
- Exact node cap UI exposed: `false`
- UI changed: `false`

## Caveats

- No direct observed damage trials exist yet for the 15-18 threshold band.
- Description evidence is strong enough to preserve a corrected candidate spec, but not enough under the current policy to change scoring.
- Inferred-family rows are explicitly pending and must not be applied without exact direct capture evidence.
- The SIO-equivalent scorer remains the active/default contract.

## Evidence Artifacts

- `frontend/artifacts/td11/tangtang_formula_correction_candidates.json`
- `frontend/artifacts/td11/tangtang_formula_correction_candidates.md`
- `frontend/artifacts/td11/tangtang_additional_set_threshold_capture_audit.json`
- `frontend/artifacts/td11/tangtang_additional_set_threshold_capture_audit.md`
- `frontend/artifacts/td11/tangtang_description_capture_import_matrix.json`
- `frontend/artifacts/td11/tangtang_description_capture_inbox.json`
- `frontend/artifacts/td11/tangtang_in_game_damage_validation_matrix.json`
- `frontend/artifacts/td11/tangtang_damage_formula_spec.json`
- `frontend/artifacts/td11/collectible_effect_mapping_matrix.json`
- `frontend/artifacts/td11/sio_lm_equivalence_matrix.json`

## Verification Commands

- `node scripts/tangtang_collectible_threshold_correction_spec_unit_test.mjs`
- `node scripts/tangtang_formula_correction_candidates_unit_test.mjs`
- `node scripts/tangtang_in_game_damage_validation_unit_test.mjs`
- `SIO_FULL_EQUIVALENCE_REQUIRED=1 node scripts/sio_full_equivalence_gate.mjs`
- `git diff --check`
