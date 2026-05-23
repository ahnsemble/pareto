# Tangtang Description Capture Import Protocol

generatedAtKst: 2026-05-23
status: [TANGTANG-DESCRIPTION-CAPTURE-IMPORT-GATE-READY]
claim: `description-capture-import-gate`
behaviorChange: `false`

## Purpose

This gate imports direct first-party item/effect in-game description captures into the deterministic formula atom ledger. It does not change formula semantics, scoring core, Rust damage formulas, WASM scoring behavior, optimizer ranking, or product UI.

Current decision:

- Capture inbox rows: 12
- Direct first-party description capture rows: 12
- Parsed description formula rows: 12
- Matched SIO rows: 10
- Description/SIO divergence rows: 2
- Observed damage follow-up rows: 2
- Can claim SIO formula description-correct: `false`
- Can apply Tangtang formula correction: `false`

## Input Schema

Capture rows must be direct first-party in-game evidence and must include:

- `captureId`
- `atomRowId`
- `captureDateKst`
- `gameVersion`
- `sourceKind`
- `captureEvidenceTier`
- `language`
- `descriptionTextOriginal`
- `rawCaptureArtifactPaths`
- `parsedFormulaOperation`
- `parsedFormulaValue`
- `operationBucket`
- `conditionOrThreshold`
- `rustStatChannel`
- `multiplierStage`

Rejected source kinds: `public-web`, `sio-source-derived`, `manual-inference`

Rejected capture evidence tiers: `public-web-corroborated`, `sio-tools-current-source-derived`, `ocr-only-without-raw-artifact`, `translated-only-without-original`

Matching mode: explicit atomRowId only

## Atom Ledger Contract

- Formula atom rows: 221
- Stage bucket taxonomy rows: 25
- Mount atom rows: 26
- Survivor atom rows: 11
- Collectible threshold atom rows: 170
- Collectible special Rust mapping atom rows: 14
- Graph mode: `deterministic-atom-ledger-not-graphrag`
- Imported rows store `atomSnapshotBeforeCaptureImport` for the pre-import ledger state; direct screenshot evidence is stored separately on the imported row and does not mutate the source/live atom ledger.

## Import Outcomes

| Outcome | Count |
|---|---:|
| imported capture rows | 12 |
| accepted capture rows | 12 |
| rejected capture rows | 0 |
| matched SIO rows | 10 |
| ambiguous rows | 0 |
| description/SIO divergence rows | 2 |
| observed damage follow-up rows | 2 |
| correction-eligible rows | 0 |

## First-Party Capture Coverage

- Captured atom rows: 12
- Matched SIO atom rows: 10
- Formula atom rows remaining without direct capture: 209
- Imported entity display names: `종말의 전투마`, `창세기`, `천체 초월 행렬 도면`
- Imported raw artifacts:
  - `frontend/artifacts/td11/captures/2026-05-23-doomsteed-lines-1-4.jpg`
  - `frontend/artifacts/td11/captures/2026-05-23-doomsteed-lines-5-8.jpg`
  - `frontend/artifacts/td11/captures/2026-05-23-random-sample/1.jpg`
  - `frontend/artifacts/td11/captures/2026-05-23-random-sample/2.jpg`
  - `frontend/artifacts/td11/captures/2026-05-23-random-sample/6.jpg`

## Evidence Artifacts

- `frontend/artifacts/td11/tangtang_description_formula_validation_matrix.json`
- `frontend/artifacts/td11/tangtang_description_formula_validation_protocol.md`
- `frontend/artifacts/td11/tangtang_damage_formula_spec.json`
- `frontend/artifacts/td11/sio_lm_equivalence_matrix.json`
- `frontend/artifacts/td11/tangtang_description_capture_inbox.json`

## Verification Commands

- `node scripts/tangtang_description_capture_import_unit_test.mjs`
- `node scripts/tangtang_description_formula_validation_unit_test.mjs`
- `node scripts/tangtang_damage_formula_spec_unit_test.mjs`
- `node scripts/damage_formula_provenance_matrix_unit_test.mjs`
- `SIO_FULL_EQUIVALENCE_REQUIRED=1 node scripts/sio_full_equivalence_gate.mjs`
- `git diff --check`
