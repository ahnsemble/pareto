# Tangtang Description Formula Validation Protocol

generatedAtKst: 2026-05-23
status: [TANGTANG-DESCRIPTION-FORMULA-VALIDATION-PROTOCOL-READY]
claim: `description-derived-formula-validation-protocol`
behaviorChange: `false`

## Purpose

This is the primary next validation layer after SIO Tools-equivalent derivation. It derives formulas from item/effect in-game descriptions, compares those description-derived formulas to SIO Tools/Tangtang source-live formula behavior, and sends only divergences to targeted confirmation.

Current decision:

- Description-derived formula correctness claim: `not-established`
- Direct first-party description-derived formula rows: 0
- Public/source corroborated rows: 3
- Can claim SIO formula description-correct: `false`
- Can apply Tangtang formula correction now: `false`
- Observed damage validation role: Observed damage validation is secondary confirmation for description-vs-SIO divergences, not the first validation layer.

## Derivation Method

For every captured item/effect description, parse the original text into a formula operation. Then map it to the SIO source key, Tangtang schema key, Rust/stat channel, multiplier stage, and SIO formula role. Only after that comparison can a row be marked as matching SIO or divergent.

Public-web text, SIO source rows, and live SIO worker parity can support triage, but they do not count as direct first-party description-derived formula rows.

## Required Row Fields

- `rowId`
- `captureDateKst`
- `gameVersion`
- `domain`
- `entityId`
- `entityDisplayName`
- `descriptionTextOriginal`
- `descriptionLanguage`
- `parsedFormulaOperation`
- `parsedFormulaValue`
- `conditionOrUptime`
- `sioSourceKey`
- `tangtangSchemaKey`
- `rustStatChannel`
- `multiplierStage`
- `sioFormulaRole`
- `comparisonVerdict`
- `rawCaptureArtifactPaths`

## Comparison Verdicts

- `pending-description-capture`
- `matches-sio-description-derived`
- `description-sio-divergent-needs-confirmation`
- `invalid-ambiguous-description`

Promotion policy: Only direct first-party item/effect description captures parsed into formula operations may increment directFirstPartyDescriptionFormulaRows.

Divergence policy: A description-derived divergence does not immediately change Tangtang scoring; it opens a targeted confirmation task and correction spec.

## Description Groups

| Priority | Group | Scope | Current evidence | Required next evidence |
|---:|---|---|---|---|
| 1 | ss-equipment-and-twin-lance | SS equipment and Twin Lance formula-affecting descriptions | SIO source/live equivalent; direct per-line in-game formula descriptions not fully captured. | Capture first-party item descriptions and parse each damage-affecting phrase into stat channel, operation, stage role, and SIO comparison. |
| 1 | skill-damage-stage-order | skillDamage description phrases and SIO trace standalone factor | SIO live trace exposes skillDamage as a standalone factor; local provenance labels keep en2 as vulnerability. | Parse skill damage descriptions separately from vulnerability and compare their intended operation against SIO trace factor ordering. |
| 1 | status-and-uptime-descriptions | vulnerability, shield, poison, weaken, chill, laceration, Divine Fire descriptions | Source/live stat channels exist; direct description-to-uptime operation mapping remains incomplete. | Capture description text for each status/uptime source and derive whether the phrase implies additive percent, uptime weighting, or conditional multiplier. |
| 1 | mount-line-descriptions | Mount stat lines and mountDamage contribution | mountDamage source/live evidence exists; exact per-line in-game text capture is missing. | Capture exact mount line descriptions and derive stat line formula plus mountDamage CE contribution before any formula correction. |
| 1 | collectible-item-set-descriptions | Collectible item/set threshold descriptions | 170 threshold rows and 14 special Rust mappings are source/Rust backed; item/set-level direct descriptions are incomplete. | Capture item/set descriptions and map description threshold -> SIO source key -> Rust stat channel -> multiplier stage. |
| 2 | collaboration-survivor-descriptions | SpongeBob, Squidward, Yelena descriptions | source/live backed with public-web corroboration, but no direct first-party description capture. | Capture direct survivor descriptions and parse each passive/star/level phrase into formula channels before claiming correctness. |
| 2 | lme-ee-mode-descriptions | LME/EE mode-specific descriptions | SIO source/live equivalent; mode-specific description semantics remain separate from direct formula verification. | Parse phase/mode descriptions and compare whether SIO applies them in the same mode boundary implied by the text. |
| 3 | non-ss-weapon-descriptions | non-SS weapon descriptions | catalog-only and unsupported as formula inputs. | Do not promote non-SS weapons until direct descriptions and SIO/source formula paths exist. |

## Current Evidence Summary

- Direct in-game description verified rows: 0
- Public rows with any stat claim: 3
- Public rows with all source claims corroborated: 2
- Partial public rows: 1
- Mount rows with exact in-game descriptions: 0
- Collectible threshold rows: 170
- Collectible direct description verified rows: 0
- Catalog-only collectible rows: 46
- Non-zero mountDamage live rows: 2
- Stage label caveat: Description-derived skillDamage formulas must be compared to SIO trace skillDamage as a standalone factor, not collapsed into local en2 vulnerability labels.

## Blockers

- No direct first-party item/effect description-derived formula rows exist yet.
- Existing public-web rows are corroboration only and cannot prove official formula semantics.
- Mount exact per-line description text remains missing.
- Collectible item/set-level direct description capture remains incomplete.
- non-SS weapons remain catalog-only unsupported as formula inputs.

## Evidence Artifacts

- `frontend/artifacts/td11/tangtang_damage_formula_spec.json`
- `frontend/artifacts/td11/tangtang_damage_formula_spec.md`
- `frontend/artifacts/td11/damage_formula_provenance_matrix.md`
- `frontend/artifacts/td11/in_game_description_evidence_matrix.json`
- `frontend/artifacts/td11/collectible_effect_mapping_matrix.json`
- `frontend/artifacts/td11/mount_damage_source_fixture.json`
- `frontend/artifacts/td11/sio_tools_formula_source_evidence_matrix.json`
- `frontend/artifacts/td11/sio_tools_live_evidence_matrix.json`
- `frontend/artifacts/td11/sio_lm_trace_summary_2026-05-20.json`
- `frontend/artifacts/td11/sio_lm_equivalence_matrix.json`

## Verification Commands

- `node scripts/tangtang_description_formula_validation_unit_test.mjs`
- `node scripts/tangtang_damage_formula_spec_unit_test.mjs`
- `node scripts/tangtang_in_game_damage_validation_unit_test.mjs`
- `node scripts/damage_formula_provenance_matrix_unit_test.mjs`
- `SIO_FULL_EQUIVALENCE_REQUIRED=1 node scripts/sio_full_equivalence_gate.mjs`
- `git diff --check`
