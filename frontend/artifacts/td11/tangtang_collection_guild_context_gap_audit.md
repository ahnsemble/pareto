# Tangtang Collection / Guild Expedition Context Gap Audit

Date: 2026-05-27

## Decision

Tangtang keeps the public product surface free of raw source/debug wording and exposes the missing Korean/product context through localized display names, clearer review-needed copy, and a Guild Expedition context input.

## Source Comparison

- Source table artifact: `artifacts/td11/sio_tools_formula_table_extract/extracted_tables/module37013_c_deployed_data_table.json`
- Collection rows in source: 119 collectible keys, 38 set keys, and 4 `customSets` slots.
- Existing taxonomy audit reports no missing source-backed collection rows, but event placeholders remain pending until source exposes real names/effects.
- No dedicated `guild` or `guildExpedition` table key is present in the deployed data table.
- Guild Expedition-equivalent context is represented by the LME2 path:
  - compact metadata uses game mode `lme2`
  - the numeric `lmeTestaments` / `lme.testaments` value feeds thresholded debuff deltas
  - Rust source applies those deltas through the compact LME testament table

## Tangtang Gaps Before This Pass

- Korean locale still rendered collection set/item source display names directly in the account context collection selector and rows.
- Imported/review-needed fields used the ambiguous Korean label `검토`.
- Saved profile slots existed for `종말의 메아리` and `길드원정`, but the account/game context had no Guild Expedition testament/debuff input.
- External calculation profile import read LME turf, but not LME2 testament count.

## Implemented Scope

- Added Korean display overrides for named collection items/sets and the account selectors for survivor, pet, mount, and SS equipment.
- Changed Korean review-needed copy to `확인 필요`.
- Added `guildExpeditionTestaments` to account context, profile import aliases, profile save/share state, and Guild Expedition preset overrides.
- Added a Guild Expedition-only UI input and calculation-context wiring.
- Guild Expedition mode emits `gameMode: lme2` and applies the source-backed LME testament debuff delta table.

## Scoring Impact

- Default Ender's Echo mode remains `gameMode: lme1` and ignores Guild Expedition testament debuffs.
- Guild Expedition preset switches the active profile slot and applies testament debuffs only in that mode.
- This is a mode-context input wiring change, not a change to the existing SIO-equivalent scorer contract.
