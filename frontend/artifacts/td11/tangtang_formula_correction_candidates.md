# Tangtang Formula Correction Candidates

generatedAtKst: 2026-05-23
status: [TANGTANG-FORMULA-CORRECTION-CANDIDATES-GREEN]
claim: `description-derived-correction-candidates`
behaviorChange: `false`

## Scope

This artifact records description-derived Tangtang formula correction candidates. It does not change formula semantics, scoring core, Rust damage formulas, WASM scoring behavior, optimizer ranking, or product UI.

Current decision:

- Correction candidate rows: 2
- Genesis threshold mismatch rows: 2
- Threshold-only mismatch rows: 2
- Value mismatch rows: 0
- Stat-channel mismatch rows: 0
- Multiplier-stage mismatch rows: 0
- Direct observed damage trials: 0
- Candidate rows ready for scoring change: 0
- Can apply Tangtang correction now: `false`
- Can change scoring now: `false`
- Current Tangtang formula may remain now: `true`

## Candidates

| Atom row | Current SIO condition | Direct description condition | Value | Channel | Raw capture evidence | Status |
|---|---|---|---:|---|---|---|
| collectible-set:genesis:gold:15:atkPercent | gold >= 15 | gold >= 19 | 4 | atkPercent | random-sample, targeted-followup | Documented correction candidate only. Do not change Tangtang scoring until correction spec plus observed-damage confirmation exists. |
| collectible-set:genesis:red:15:atkPercent | red >= 15 | red >= 19 | 6 | atkPercent | random-sample, targeted-followup | Documented correction candidate only. Do not change Tangtang scoring until correction spec plus observed-damage confirmation exists. |

## Decision Policy

Current correction status: `candidate-documented-not-applied`

Why not applied: The direct first-party description captures repeatedly show a Genesis threshold mismatch, but no correction spec with observed-damage confirmation has been applied yet.

Required before application:

- keep the candidate isolated from SIO-equivalent source/live claims
- write an explicit Tangtang correction spec that supersedes SIO only for the affected rows
- add controlled observed-damage follow-up or an approved decision that description text alone is sufficient for this threshold-only input correction
- update Rust/WASM scoring semantics behind a dedicated RED/GREEN behavior test
- make the equivalence contract explicit because full SIO equivalence would no longer be the applicable claim for corrected rows

## Evidence Artifacts

- `frontend/artifacts/td11/tangtang_description_capture_import_matrix.json`
- `frontend/artifacts/td11/tangtang_description_capture_import_protocol.md`
- `frontend/artifacts/td11/tangtang_random_capture_sample_audit.json`
- `frontend/artifacts/td11/tangtang_random_capture_sample_audit.md`
- `frontend/artifacts/td11/tangtang_targeted_capture_followup_audit.json`
- `frontend/artifacts/td11/tangtang_targeted_capture_followup_audit.md`
- `frontend/artifacts/td11/tangtang_in_game_damage_validation_matrix.json`
- `frontend/artifacts/td11/tangtang_in_game_damage_validation_protocol.md`
- `frontend/artifacts/td11/tangtang_damage_formula_spec.json`
- `frontend/artifacts/td11/sio_lm_equivalence_matrix.json`

## Verification Commands

- `node scripts/tangtang_formula_correction_candidates_unit_test.mjs`
- `node scripts/tangtang_description_capture_import_unit_test.mjs`
- `node scripts/tangtang_targeted_capture_followup_audit_unit_test.mjs`
- `node scripts/tangtang_in_game_damage_validation_unit_test.mjs`
- `SIO_FULL_EQUIVALENCE_REQUIRED=1 node scripts/sio_full_equivalence_gate.mjs`
- `git diff --check`
