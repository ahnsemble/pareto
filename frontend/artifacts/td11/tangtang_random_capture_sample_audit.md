# Tangtang Random Direct Capture Sample Audit

generatedAtKst: 2026-05-23 19:30:00 KST
status: [TANGTANG-RANDOM-CAPTURE-SAMPLE-AUDIT-GREEN]
claim: `random-direct-capture-sample-audit`
behaviorChange: `false`

## Summary

- Submitted raw images: 30
- Raw images with imported atom rows: 3
- Raw images without imported atom rows: 27
- Imported atom rows from batch: 3
- Matched SIO/Tangtang rows from batch: 1
- Description/SIO divergence rows from batch: 2
- Observed damage follow-up rows from batch: 2
- Formula/scoring behavior change: `false`

## Imported Rows

| Capture | Atom row | Verdict | Condition | Value | Stat channel | Raw artifacts |
|---|---|---|---|---:|---|---|
| td11-capture-20260523-random-sample-genesis-gold-atk-percent | collectible-set:genesis:gold:15:atkPercent | description-sio-divergent-needs-confirmation | gold >= 19 | 4 | atkPercent | frontend/artifacts/td11/captures/2026-05-23-random-sample/2.jpg |
| td11-capture-20260523-random-sample-genesis-red-atk-percent | collectible-set:genesis:red:15:atkPercent | description-sio-divergent-needs-confirmation | red >= 19 | 6 | atkPercent | frontend/artifacts/td11/captures/2026-05-23-random-sample/1.jpg |
| td11-capture-20260523-random-sample-instellar-transition-matrix-crit-rate | collectible-item:instellarTransitionMatrixDesign:stars:8:critRate | matches-sio-description-derived | stars >= 8 | 10 | critRate | frontend/artifacts/td11/captures/2026-05-23-random-sample/6.jpg |

## Non-Imported Evidence Groups

| Images | Domain | Reason | Sample effects |
|---|---|---|---|
| 3.jpg, 4.jpg | collectible-aggregate-stats | aggregate stat summary screen; not a row-level item/set formula description | critRate 50%; critDamage 165%; skillDamage 110%; poisoned/weakened/chilled damage 35% |
| 5.jpg, 7.jpg, 8.jpg, 9.jpg, 29.jpg, 30.jpg | collectible-item-non-ledger-rows | Instellar Transition Matrix Design rows for drone/system effects are not represented as current formula atom rows | guided-system attack +3/+4%; drone missile count +5/+10%; drone missile single damage +5/+10% |
| 10.jpg, 23.jpg, 24.jpg, 25.jpg, 26.jpg, 27.jpg, 28.jpg | sync-level-rows | commander synchronization rows are direct descriptions, but no current formula atom ledger rows exist for this subsystem | critDamage/skillDamage/status damage tiers; shield damage +5%; elite/boss damage +5% |
| 11.jpg, 12.jpg, 13.jpg, 14.jpg, 15.jpg, 16.jpg, 17.jpg, 18.jpg | equipment-and-divine-forge-rows | SS equipment, forge, and belt skill text is important direct evidence but outside the current 221-row description atom ledger | skill attack +30% max 2 stacks; damage received +10%; energy-level damage/skill/crit/shield bonuses |
| 19.jpg | equipment-non-atom-row | Belt grade-skill text is direct evidence, but no current formula atom ledger row exists for this item text | skill damage random 80% to 150% +20%; HP +15/+25% |
| 20.jpg, 21.jpg, 22.jpg | pet-rows | pet resonance/support skill rows are direct descriptions, but no current formula atom ledger rows exist for this subsystem | pet resonance damage +1.5%; 13% proc for owner damage +15.5% for 4s; poison/weaken support skill text |

## Decision

- Can apply Tangtang formula correction now: `false`
- Can claim official in-game formula verification: `false`
- Direct observed damage follow-up opened for:
  - `collectible-set:genesis:gold:15:atkPercent`
  - `collectible-set:genesis:red:15:atkPercent`

The random sample found direct first-party rows that compare against the current atom ledger, including Genesis condition divergences. No scoring correction is applied until follow-up confirmation and a correction spec exist.

## Evidence Artifacts

- `frontend/artifacts/td11/tangtang_description_capture_import_matrix.json`
- `frontend/artifacts/td11/tangtang_description_capture_inbox.json`
- `frontend/artifacts/td11/captures/2026-05-23-random-sample/1.jpg`
- `frontend/artifacts/td11/captures/2026-05-23-random-sample/2.jpg`
- `frontend/artifacts/td11/captures/2026-05-23-random-sample/3.jpg`
- `frontend/artifacts/td11/captures/2026-05-23-random-sample/4.jpg`
- `frontend/artifacts/td11/captures/2026-05-23-random-sample/5.jpg`
- `frontend/artifacts/td11/captures/2026-05-23-random-sample/6.jpg`
- `frontend/artifacts/td11/captures/2026-05-23-random-sample/7.jpg`
- `frontend/artifacts/td11/captures/2026-05-23-random-sample/8.jpg`
- `frontend/artifacts/td11/captures/2026-05-23-random-sample/9.jpg`
- `frontend/artifacts/td11/captures/2026-05-23-random-sample/10.jpg`
- `frontend/artifacts/td11/captures/2026-05-23-random-sample/11.jpg`
- `frontend/artifacts/td11/captures/2026-05-23-random-sample/12.jpg`
- `frontend/artifacts/td11/captures/2026-05-23-random-sample/13.jpg`
- `frontend/artifacts/td11/captures/2026-05-23-random-sample/14.jpg`
- `frontend/artifacts/td11/captures/2026-05-23-random-sample/15.jpg`
- `frontend/artifacts/td11/captures/2026-05-23-random-sample/16.jpg`
- `frontend/artifacts/td11/captures/2026-05-23-random-sample/17.jpg`
- `frontend/artifacts/td11/captures/2026-05-23-random-sample/18.jpg`
- `frontend/artifacts/td11/captures/2026-05-23-random-sample/19.jpg`
- `frontend/artifacts/td11/captures/2026-05-23-random-sample/20.jpg`
- `frontend/artifacts/td11/captures/2026-05-23-random-sample/21.jpg`
- `frontend/artifacts/td11/captures/2026-05-23-random-sample/22.jpg`
- `frontend/artifacts/td11/captures/2026-05-23-random-sample/23.jpg`
- `frontend/artifacts/td11/captures/2026-05-23-random-sample/24.jpg`
- `frontend/artifacts/td11/captures/2026-05-23-random-sample/25.jpg`
- `frontend/artifacts/td11/captures/2026-05-23-random-sample/26.jpg`
- `frontend/artifacts/td11/captures/2026-05-23-random-sample/27.jpg`
- `frontend/artifacts/td11/captures/2026-05-23-random-sample/28.jpg`
- `frontend/artifacts/td11/captures/2026-05-23-random-sample/29.jpg`
- `frontend/artifacts/td11/captures/2026-05-23-random-sample/30.jpg`

## Verification Commands

- `node scripts/tangtang_random_capture_sample_audit_unit_test.mjs`
- `node scripts/tangtang_description_capture_import_unit_test.mjs`
- `node scripts/tangtang_in_game_damage_validation_unit_test.mjs`
- `SIO_FULL_EQUIVALENCE_REQUIRED=1 node scripts/sio_full_equivalence_gate.mjs`
- `git diff --check`
