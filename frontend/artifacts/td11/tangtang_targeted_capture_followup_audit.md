# Tangtang Targeted Direct Capture Follow-Up Audit

generatedAtKst: 2026-05-23 20:15:00 KST
status: [TANGTANG-TARGETED-CAPTURE-FOLLOWUP-AUDIT-GREEN]
claim: `targeted-direct-capture-followup-audit`
behaviorChange: `false`

## Summary

- Submitted raw images: 27
- Raw images with imported atom rows: 2
- Raw images without imported atom rows: 25
- Imported atom rows from batch: 2
- Matched SIO/Tangtang rows from batch: 0
- Description/SIO divergence rows from batch: 2
- Reinforced existing atom rows from batch: 2
- Observed damage follow-up rows from batch: 2
- Cumulative direct first-party capture rows: 14
- Cumulative description/SIO divergence rows: 4
- Formula/scoring behavior change: `false`

## Imported / Reinforced Rows

| Capture | Atom row | Verdict | Condition | Value | Stat channel | Raw artifacts |
|---|---|---|---|---:|---|---|
| td11-capture-20260523-random-sample-genesis-gold-atk-percent | collectible-set:genesis:gold:15:atkPercent | description-sio-divergent-needs-confirmation | gold >= 19 | 4 | atkPercent | frontend/artifacts/td11/captures/2026-05-23-targeted-followup/2.jpg |
| td11-capture-20260523-random-sample-genesis-red-atk-percent | collectible-set:genesis:red:15:atkPercent | description-sio-divergent-needs-confirmation | red >= 19 | 6 | atkPercent | frontend/artifacts/td11/captures/2026-05-23-targeted-followup/1.jpg |

## Non-Imported Evidence Groups

| Images | Domain | Reason | Sample effects |
|---|---|---|---|
| 3.jpg, 4.jpg, 5.jpg, 6.jpg, 7.jpg, 8.jpg, 9.jpg, 10.jpg | tech-part-energy-guidance-system | Energy Guidance System / dual resonance and grade skill text is direct evidence, but no current 221-row description atom ledger row exists for this subsystem. | dual drone single-shot damage tiers; vulnerability/status damage rows; skill damage rows; dual part grade skill text |
| 11.jpg | mount-tech-hoverboard-tooltip | Skateboard/Tech Hoverboard tooltip is direct evidence, but the visible tooltip is not a clean row-level match to the current mount line atom rows. | shield stack tooltip; damage reduction text; freeze-status wording |
| 12.jpg, 13.jpg, 14.jpg, 15.jpg, 16.jpg | custom-collection-set | Custom collection set slot/upgrade rows are preserved as direct evidence, but are outside the current collectible set threshold atom ids. | custom collection final attack/HP rows; crit damage / weakened / poisoned / chilled rows; slot upgrade explanation |
| 17.jpg | collectible-set-important-day-record | Important Day Record set rows are direct evidence, but no current atom row id was confidently mapped in this pass. | gold/red 15-star final attack/HP rows |
| 18.jpg, 19.jpg | locked-collectible-item-unknown | Locked unknown collectible rows are direct evidence, but item identity and atom id are not established. | Twisting Belt HP rows; crit rate row; skill max-bound row |
| 20.jpg, 21.jpg, 22.jpg, 26.jpg, 27.jpg | survivor-taloxia | Taloxia skill/passive/awakening text is direct survivor evidence, but the current 221-row description atom ledger does not include Taloxia rows. | sync link tooltip; transform tooltip; firepower armament tooltip; awakening passive rows |
| 23.jpg, 24.jpg, 25.jpg | collaboration-battle | Collaboration battle upgrade rows are direct evidence, but no current formula atom ledger rows exist for this subsystem. | assist collaboration skill level upgrades; rage gain rows |

## Decision

- Can apply Tangtang formula correction now: `false`
- Can claim official in-game formula verification: `false`
- Direct observed damage follow-up opened for:
  - `collectible-set:genesis:gold:15:atkPercent`
  - `collectible-set:genesis:red:15:atkPercent`

The targeted follow-up strengthens the existing Genesis threshold divergence candidates with additional direct first-party captures. No scoring correction is applied until follow-up confirmation and a correction spec exist.

## Evidence Artifacts

- `frontend/artifacts/td11/tangtang_description_capture_import_matrix.json`
- `frontend/artifacts/td11/tangtang_description_capture_inbox.json`
- `frontend/artifacts/td11/captures/2026-05-23-targeted-followup/1.jpg`
- `frontend/artifacts/td11/captures/2026-05-23-targeted-followup/2.jpg`
- `frontend/artifacts/td11/captures/2026-05-23-targeted-followup/3.jpg`
- `frontend/artifacts/td11/captures/2026-05-23-targeted-followup/4.jpg`
- `frontend/artifacts/td11/captures/2026-05-23-targeted-followup/5.jpg`
- `frontend/artifacts/td11/captures/2026-05-23-targeted-followup/6.jpg`
- `frontend/artifacts/td11/captures/2026-05-23-targeted-followup/7.jpg`
- `frontend/artifacts/td11/captures/2026-05-23-targeted-followup/8.jpg`
- `frontend/artifacts/td11/captures/2026-05-23-targeted-followup/9.jpg`
- `frontend/artifacts/td11/captures/2026-05-23-targeted-followup/10.jpg`
- `frontend/artifacts/td11/captures/2026-05-23-targeted-followup/11.jpg`
- `frontend/artifacts/td11/captures/2026-05-23-targeted-followup/12.jpg`
- `frontend/artifacts/td11/captures/2026-05-23-targeted-followup/13.jpg`
- `frontend/artifacts/td11/captures/2026-05-23-targeted-followup/14.jpg`
- `frontend/artifacts/td11/captures/2026-05-23-targeted-followup/15.jpg`
- `frontend/artifacts/td11/captures/2026-05-23-targeted-followup/16.jpg`
- `frontend/artifacts/td11/captures/2026-05-23-targeted-followup/17.jpg`
- `frontend/artifacts/td11/captures/2026-05-23-targeted-followup/18.jpg`
- `frontend/artifacts/td11/captures/2026-05-23-targeted-followup/19.jpg`
- `frontend/artifacts/td11/captures/2026-05-23-targeted-followup/20.jpg`
- `frontend/artifacts/td11/captures/2026-05-23-targeted-followup/21.jpg`
- `frontend/artifacts/td11/captures/2026-05-23-targeted-followup/22.jpg`
- `frontend/artifacts/td11/captures/2026-05-23-targeted-followup/23.jpg`
- `frontend/artifacts/td11/captures/2026-05-23-targeted-followup/24.jpg`
- `frontend/artifacts/td11/captures/2026-05-23-targeted-followup/25.jpg`
- `frontend/artifacts/td11/captures/2026-05-23-targeted-followup/26.jpg`
- `frontend/artifacts/td11/captures/2026-05-23-targeted-followup/27.jpg`

## Verification Commands

- `node scripts/tangtang_targeted_capture_followup_audit_unit_test.mjs`
- `node scripts/tangtang_description_capture_import_unit_test.mjs`
- `node scripts/tangtang_random_capture_sample_audit_unit_test.mjs`
- `node scripts/tangtang_in_game_damage_validation_unit_test.mjs`
- `SIO_FULL_EQUIVALENCE_REQUIRED=1 node scripts/sio_full_equivalence_gate.mjs`
- `git diff --check`
