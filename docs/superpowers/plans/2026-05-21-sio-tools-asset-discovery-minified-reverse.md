# SIO Tools Asset Discovery And Minified Reverse Plan

> **For agentic workers:** REQUIRED: Use superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Discover whether deployed `sio-tools` assets expose source maps or readable source, mirror the relevant JS assets locally, and prepare a minified-bundle analysis index if source maps are unavailable.

**Architecture:** Keep the work evidence-first and non-destructive. A frontend script will crawl the public `sio-tools` page, discover Next.js chunks and worker/imported chunks, probe source map candidates, mirror relevant JS assets under `frontend/artifacts/td11/sio_tools_asset_discovery/`, and write a rollup JSON/Markdown summary. Existing full-equivalence gates remain conservative; this work must not flip `fullSioEquivalent`.

**Tech Stack:** Node.js ESM scripts, built-in `fetch`, Rust integration tests for script/artifact contract checks, existing TD-11 artifact directory.

---

## Files

- Create: `frontend/scripts/sio_tools_asset_discovery.mjs`
- Modify: `tttg_forge_optimizer/tests/tech_optimizer_performance.rs`
- Create: `frontend/artifacts/td11/sio_tools_asset_discovery/asset_discovery_summary.json`
- Create: `frontend/artifacts/td11/sio_tools_asset_discovery/asset_discovery_report.md`
- Modify: `frontend/artifacts/td11/s63_local_blocker_full_equivalence.md`
- Modify: `/Users/woosung/Desktop/Dev/Woosdom_Brain/00_System/Templates/from_codex.md`

## Task 1: RED Contract For Asset Discovery

- [x] Add a Rust test `sio_tools_asset_discovery_script_declares_source_map_probe`.
- [x] The test should fail until `frontend/scripts/sio_tools_asset_discovery.mjs` exists and includes:
  - `sourceMapCandidates`
  - `workerAssetCandidates`
  - `asset_discovery_summary.json`
  - `asset_discovery_report.md`
- [x] Run:
  - `cargo test -p tttg_forge_optimizer --test tech_optimizer_performance sio_tools_asset_discovery_script_declares_source_map_probe`
- [x] Expected RED:
  - fails because the script does not exist yet.

## Task 2: GREEN Asset Discovery Script

- [x] Implement `frontend/scripts/sio_tools_asset_discovery.mjs`.
- [x] Inputs:
  - `SIO_TOOLS_URL`, default `https://sio-tools.vercel.app`
  - `OUTPUT_DIR`, default `frontend/artifacts/td11/sio_tools_asset_discovery`
- [x] Fetch the HTML page.
- [x] Extract JS chunk URLs from `src="..."`, `href="..."`, and inline Next.js payload strings.
- [x] Fetch JS assets that are same-origin `_next/static/chunks/*`.
- [x] Detect worker/imported chunks by scanning for `worker`, `importScripts`, `t.u(`, `static/chunks/`, and known local worker names.
- [x] Probe source map candidates:
  - URL from `sourceMappingURL=...`
  - `${assetUrl}.map`
  - queryless `${assetPath}.map`
- [x] Write mirrored JS/source-map assets using hashed safe file names.
- [x] Write `asset_discovery_summary.json` with:
  - `sourceUrl`
  - `fetchedAt`
  - `htmlBytes`
  - `jsAssetsDiscovered`
  - `jsAssetsFetched`
  - `workerAssetCandidates`
  - `sourceMapCandidates`
  - `sourceMapsFound`
  - `notFoundSourceMaps`
  - `errors`
  - `decision`
- [x] Write `asset_discovery_report.md` with:
  - concise human-readable findings
  - exact files mirrored
  - whether source maps were found
  - next action.
- [x] Re-run RED test; expected GREEN.

## Task 3: Execute Discovery Against Public Site

- [x] Run:
  - `cd frontend && node scripts/sio_tools_asset_discovery.mjs`
- [x] If source maps are found:
  - record map paths and mark the blocker as partially unblocked.
- [x] If no source maps are found:
  - record that public homepage assets are downloadable, but source maps are not exposed by the probed candidates.
- [x] Do not fail the task solely because source maps are absent; absence is a valid discovery result.

## Task 4: Minified Bundle Index

- [x] Extend the discovery script or add a later focused pass to index mirrored minified JS for:
  - `lm(`
  - `collectibles`
  - `customSets`
  - `petSkills`
  - `xeno`
  - `mounts`
  - `evo`
  - `lme`
  - `ee`
  - `items`
  - `stats`
- [x] Write candidate offsets/snippets to the summary without claiming source equivalence.
- [x] Use this index to guide future formula extraction slices.

## Task 5: Verification And Documentation

- [x] Run:
  - `cargo fmt --check`
  - `cargo test -p tttg_forge_optimizer --test tech_optimizer_performance sio_tools_asset_discovery_script_declares_source_map_probe`
  - `cd frontend && node scripts/sio_tools_asset_discovery.mjs`
  - `git diff --check`
- [x] Update `s63_local_blocker_full_equivalence.md` with the discovery result.
- [x] Update `from_codex.md` with:
  - estimated time used
  - source maps found/not found
  - mirrored asset paths
  - next recommended extraction target.

## Result

Status: `[PUBLIC-ASSETS-MIRRORED-SOURCE-MAPS-NOT-FOUND-NOT-FULL-SIO]`

- Expected time before work: `45-90 minutes` for the first asset-discovery and indexing pass.
- Public `sio-tools` homepage fetch succeeded.
- JS assets fetched: `30`.
- Worker/import-script candidates: `6`.
- Source map candidates probed: `57`.
- Source maps found: `0`.
- Keyword index was written to `frontend/artifacts/td11/sio_tools_asset_discovery/asset_discovery_summary.json`.
- The strongest next minified reverse targets are:
  - `37fba390a534-page-302a7882b4a7125b.js`
  - `9730c42f92d7-797-9e5ce5eee251b4e4.js`
  - `e9fc87171255-2203-ed472d11cc68b886.js`
  - `d8b9b69f6d25-3474-079d00884c87a83c.js`
- `fullSioEquivalent` remains `false`.

## Follow-Up Slice: Webpack Module Domain Index

Status: `[MINIFIED-DOMAIN-MODULE-INDEX-GREEN-NOT-FULL-SIO]`

- Added RED-first test: `sio_minified_domain_index_script_declares_module_keyword_extraction`.
- Expected RED occurred before the script existed.
- Added script: `frontend/scripts/sio_minified_domain_index.mjs`.
- Output JSON: `frontend/artifacts/td11/sio_tools_minified_domain_index/domain_keyword_module_index.json`.
- Output Markdown: `frontend/artifacts/td11/sio_tools_minified_domain_index/domain_keyword_module_index.md`.
- Assets scanned: `30`.
- Domain-keyword Webpack modules indexed: `118`.
- Source maps found in discovery input: `0`.
- Top extraction targets:
  - `37fba390a534-page-302a7882b4a7125b.js` module `63016`
  - `9730c42f92d7-797-9e5ce5eee251b4e4.js` module `73755`
  - `9730c42f92d7-797-9e5ce5eee251b4e4.js` module `37013`
  - `9730c42f92d7-797-9e5ce5eee251b4e4.js` module `91252`
- Verification:
  - `cargo test -p tttg_forge_optimizer --test tech_optimizer_performance sio_minified_domain_index_script_declares_module_keyword_extraction`: failed RED, then passed.
  - `cd frontend && node scripts/sio_minified_domain_index.mjs`: passed.
  - Final `cargo fmt --check`: passed.
  - Final `cargo test -p tttg_forge_optimizer --test tech_optimizer_performance`: passed, `81` tests.
  - Final `cd frontend && node scripts/sio_full_equivalence_gate.mjs`: passed as not-full-sio gate.
  - Final `git diff --check`: passed.

This module index guides formula/table extraction only. It still does not prove arbitrary `sio-tools lm()` equivalence.

## Follow-Up Slice: Runtime Formula/Table Extraction

Status: `[MINIFIED-FORMULA-TABLE-RUNTIME-EXPORTS-GREEN-NOT-FULL-SIO]`

- Added RED-first tests:
  - `sio_minified_formula_table_extractor_declares_runtime_exports`
  - `sio_minified_formula_table_extractor_declares_module32085_formula_snippets`
  - `sio_minified_formula_table_extractor_declares_module32085_internal_formula_candidates`
  - `sio_minified_formula_table_extractor_declares_key_formula_modules`
- Added script: `frontend/scripts/sio_minified_formula_table_extract.mjs`.
- Runtime-loaded mirrored deployed Webpack modules: `1125`.
- Extracted deployed data table module `37013`:
  - heroes `23`
  - collectibles `118`
  - items `11`
  - techs `10`
  - customSets `4`
  - sets `38`
  - pets `8`
  - mounts `3`
- Extracted damage coefficient table module `32085.mg`: `34` entries.
- Extracted key formula modules:
  - `5005` synergy threshold stats
  - `5834` percent multiplier helper
  - `40498` LME threshold stats
  - `42806` customSets stats
  - `57223` collectibles stats
  - `24804` equipment/item stats
  - `30396` cooldown reduction
  - `67727` final score product
- Added translation notes: `frontend/artifacts/td11/sio_tools_formula_table_extract/formula_translation_notes.md`.
- `fullSioEquivalent` remains `false`.

## Guardrails

- Do not modify `fullSioEquivalent`.
- Do not claim minified bundle reverse engineering is equivalent to source-map or source-level proof.
- Do not delete existing TD-11 artifacts.
- Keep downloaded public assets under `frontend/artifacts/td11/sio_tools_asset_discovery/`.
