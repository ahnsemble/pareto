# Tangtang Additional Set Threshold Capture Audit

generatedAtKst: 2026-05-23 22:20:00 KST
status: [TANGTANG-ADDITIONAL-SET-THRESHOLD-CAPTURE-AUDIT-GREEN]
claim: `additional-direct-capture-set-threshold-audit`
behaviorChange: `false`

## Summary

- Submitted raw images: 4
- Raw images with imported atom rows: 2
- Raw images without imported atom rows: 2
- Imported atom rows from batch: 2
- Matched SIO/Tangtang rows from batch: 0
- Description/SIO divergence rows from batch: 2
- Correction candidate rows from batch: 2
- Non-imported evidence groups: 1
- Formula/scoring behavior change: `false`

## Imported Rows

| Capture | Atom row | Verdict | Condition | Value | Stat channel | Raw artifacts |
|---|---|---|---|---:|---|---|
| td11-capture-20260523-additional-dream-or-reality-gold-atk-percent | collectible-set:dreamOrReality:gold:15:atkPercent | description-sio-divergent-needs-confirmation | gold >= 19 | 4 | atkPercent | frontend/artifacts/td11/captures/2026-05-23-additional-set-thresholds/2.jpg |
| td11-capture-20260523-additional-dream-or-reality-red-atk-percent | collectible-set:dreamOrReality:red:15:atkPercent | description-sio-divergent-needs-confirmation | red >= 19 | 6 | atkPercent | frontend/artifacts/td11/captures/2026-05-23-additional-set-thresholds/1.jpg |

## Correction Candidate Rows

| Atom row | Current source condition | Direct description condition | Value | Channel | Eligible now? |
|---|---|---|---:|---|---|
| collectible-set:dreamOrReality:gold:15:atkPercent | gold >= 15 | gold >= 19 | 4 | atkPercent | false |
| collectible-set:dreamOrReality:red:15:atkPercent | red >= 15 | red >= 19 | 6 | atkPercent | false |

## Preserved Non-Imported Evidence

| Images | Domain | Reason | Sample effects |
|---|---|---|---|
| 3.jpg, 4.jpg | collectible-set-hp-only-or-unmapped | The visible set rows show HP +4/+6% and generic final attack/HP bonuses. HP percent is not a current damage-formula atom in the 221-row ledger, so this pass preserves the raw evidence without promoting it to a damage correction candidate. | 누적으로 19개의 금 별 획득 / HP +4%; 누적으로 19개의 빨간 별 획득 / HP +6%; 8/16/24-star final attack and HP bonuses |

## Decision

- Imported as damage formula candidates:
  - `collectible-set:dreamOrReality:gold:15:atkPercent`
  - `collectible-set:dreamOrReality:red:15:atkPercent`
- Preserved outside damage formula ledger: The HP-only set screenshots are retained as raw direct evidence but are not promoted to damage formula correction candidates in this pass.
- Can apply Tangtang formula correction now: `false`
- Can claim official in-game formula verification: `false`

Dream or Reality? has direct first-party threshold divergence evidence against current source-derived atom rows. The HP-only set evidence does not alter the damage formula ledger.

## Evidence Artifacts

- `frontend/artifacts/td11/tangtang_description_capture_import_matrix.json`
- `frontend/artifacts/td11/tangtang_description_capture_inbox.json`
- `frontend/artifacts/td11/tangtang_formula_correction_candidates.json`
- `frontend/artifacts/td11/captures/2026-05-23-additional-set-thresholds/1.jpg`
- `frontend/artifacts/td11/captures/2026-05-23-additional-set-thresholds/2.jpg`
- `frontend/artifacts/td11/captures/2026-05-23-additional-set-thresholds/3.jpg`
- `frontend/artifacts/td11/captures/2026-05-23-additional-set-thresholds/4.jpg`

## Verification Commands

- `node scripts/tangtang_additional_set_threshold_capture_audit_unit_test.mjs`
- `node scripts/tangtang_description_capture_import_unit_test.mjs`
- `node scripts/tangtang_formula_correction_candidates_unit_test.mjs`
- `SIO_FULL_EQUIVALENCE_REQUIRED=1 node scripts/sio_full_equivalence_gate.mjs`
- `git diff --check`
