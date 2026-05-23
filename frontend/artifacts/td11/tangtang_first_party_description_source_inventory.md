# Tangtang First-Party Description Source Inventory

generatedAtKst: 2026-05-23
status: [TANGTANG-FIRST-PARTY-DESCRIPTION-SOURCE-INVENTORY-READY]
claim: `first-party-description-source-inventory`
behaviorChange: `false`

## Executive Summary

The current official/public web search did not find a first-party public source with complete structured item/effect in-game description rows for the Tangtang formula atom ledger.

Official pages and announcements can support release or existence provenance, but they do not populate direct first-party description capture rows. Direct formula validation still needs in-game UI captures or lawful first-party app-resource text that preserves the original description.

No formula semantics, scoring core, Rust damage formulas, WASM scoring behavior, optimizer ranking, or product UI changed.

## Summary

- Official/public source candidates checked: 8
- Official/public sources with structured formula rows: 0
- Official/public rows promoted to direct capture: 0
- Local app resource artifacts found: 0
- Formula atom rows requiring direct description capture: 221
- Direct first-party description-derived formula rows in formula-validation gate before capture import: 0
- Capture inbox rows: 14
- Direct first-party description capture rows: 14
- Parsed description formula rows: 14
- Matched SIO rows: 10
- Description/SIO divergence rows: 4
- Observed damage follow-up rows: 4
- Formula atom rows remaining without direct capture: 207
- Can apply Tangtang formula correction now: `false`
- Public official web sufficient for formula validation: `false`

## Official/Public Source Inventory

| Source | Kind | Structured formula rows? | Direct capture rows now? | Eligible use | URL |
|---|---|---:|---:|---|---|
| Habby official game page | official-public-page | false | false | release/existence provenance only | https://www.habby.com/game |
| Habby Store Survivor.io page | official-public-store-page | false | false | release/store provenance only | https://store.habby.com/game/3 |
| Apple App Store listing | official-platform-listing | false | false | version/release provenance only | https://apps.apple.com/us/app/survivor-io/id1528941310 |
| Google Play listing | official-platform-listing | false | false | version/release provenance only | https://play.google.com/store/apps/details?id=com.dxx.firenow&hl=en-US |
| Official Discord public landing | official-community-public-landing | false | false | community provenance only; authenticated first-party channel captures would need a separate raw artifact | https://discord.com/servers/survivor-io-1008984622941601882 |
| Official Facebook Energy Guidance System announcement | official-social-announcement | false | false | announcement-level provenance only | https://www.facebook.com/SurvivorHabby/posts/-greetings-survivorsthe-twinborn-parts-energy-guidance-system-forcefield-mode-is/692695606793477/ |
| Official Facebook Antimatter Maintainer announcement | official-social-announcement | false | false | announcement-level provenance only | https://www.facebook.com/SurvivorHabby/posts/-greetings-survivorsthe-twinborn-part-antimatter-maintainer-launches-july-13-at-/734749099254794/ |
| Official X account | official-social-account | false | false | announcement provenance only if direct original posts are captured | https://x.com/Survivor_io |

## Source Routes

| Route | Qualifies now? | Current rows | Policy |
|---|---:|---:|---|
| Official public web/social announcements | false | 0 | Use as release or existence provenance only unless the official page itself exposes exact row-level original description text. |
| Direct in-game UI screenshot/video capture | true | 14 | Preferred route for one-by-one validation: preserve raw screenshot/video plus exact original description text and map it to an atomRowId. |
| Lawful app resource/localization inspection | false | 0 | Potentially valid only for lawfully obtained first-party static text resources; do not bypass encryption, DRM, auth, or protections. |
| Third-party guides, wiki, Reddit, public mirrors | false | 0 | Corroboration and triage only; never promote to direct first-party description capture. |

## Local App Resource Scan

- Scanned roots: `frontend`, `docs`
- Candidate app/resource artifacts found: 0
- Candidate paths:
  - none

Policy: Static app-resource text can count only when lawfully obtained first-party text is preserved with version and resource path.

## Capture Template

Required fields:

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

Recommended extra fields:

- `entityDisplayNameCaptured`
- `screenContext`
- `devicePlatform`
- `ocrTextRaw`
- `descriptionTextManualTranscription`
- `descriptionTextEnglishTranslation`
- `transcriptionConfidence`
- `transcriptionNotes`

Atom mapping: explicit formulaAtomRows[].rowId only; no fuzzy name matching

Raw artifact policy: OCR/manual transcription is assistive only; raw screenshot/video/resource artifact must be retained.

## Validation Policy

- Public web promotion allowed: `false`
- Official announcement promotion allowed: `false`
- Automatic formula/scoring change allowed: `false`
- Accepted source kind: `direct-first-party-in-game`
- Accepted capture evidence tier: `direct-first-party-description`
- Observed damage follow-up allowed only for: `description-sio-divergent-needs-confirmation`

Rejected evidence kinds:

- `public-web`
- `sio-source-derived`
- `manual-inference`
- `ocr-only-without-raw-artifact`
- `translated-only-without-original`
- `third-party-corroboration-only`

## Evidence Artifacts

- `frontend/artifacts/td11/tangtang_description_formula_validation_matrix.json`
- `frontend/artifacts/td11/tangtang_description_formula_validation_protocol.md`
- `frontend/artifacts/td11/tangtang_description_capture_inbox.json`
- `frontend/artifacts/td11/tangtang_description_capture_import_matrix.json`
- `frontend/artifacts/td11/tangtang_description_capture_import_protocol.md`
- `frontend/artifacts/td11/tangtang_damage_formula_spec.json`
- `frontend/artifacts/td11/in_game_description_evidence_matrix.json`

## Verification Commands

- `node scripts/tangtang_first_party_description_source_inventory_unit_test.mjs`
- `node scripts/tangtang_description_capture_import_unit_test.mjs`
- `node scripts/tangtang_description_formula_validation_unit_test.mjs`
- `node scripts/damage_formula_provenance_matrix_unit_test.mjs`
- `SIO_FULL_EQUIVALENCE_REQUIRED=1 node scripts/sio_full_equivalence_gate.mjs`
- `git diff --check`
