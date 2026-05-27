# Tangtang / SIO Deep Gap Audit

Date: 2026-05-27

## Executive Decision

Tangtang is still aligned with the current SIO-equivalent scoring contract at the gate level, but the deeper audit found several product and import gaps that should be fixed before treating the deployed UI as fully equivalent to SIO behavior for every user flow.

The highest-risk issue is not the collection copy. It is external calculation profile mode handling: an Ender's Echo SIO link can carry a nonzero `lmeTestaments` value while `gameMode` is `ee`, and Tangtang currently interprets the presence of testaments as Guild Expedition.

## Evidence Base

- Source bundle artifact: `frontend/artifacts/td11/sio_tools_formula_table_extract/formula_table_runtime_exports.json`
- Deployed data table: `frontend/artifacts/td11/sio_tools_formula_table_extract/extracted_tables/module37013_c_deployed_data_table.json`
- Taxonomy audit: `frontend/artifacts/td11/tangtang_sio_taxonomy_gap_audit.md`
- Live matrix: `frontend/artifacts/td11/sio_tools_live_evidence_matrix.json`
- Generated live cases: `frontend/artifacts/td11/arbitrary_compact_s59/worker_decoded_summary.json`
- Trace summary: `frontend/artifacts/td11/arbitrary_compact_s59/lm_trace_summary.json`
- Product flow audit: `frontend/artifacts/td11/sio_product_flow_gap_audit.md`

## Source / Taxonomy Status

SIO current live source was fetched from `https://sio-tools.vercel.app` at `2026-05-27T10:28:14.841Z`.

| Domain | SIO source count | Tangtang status |
|---|---:|---|
| Collectibles | 119 | 118 effect rows covered, 1 no-effect placeholder tracked |
| Sets | 38 | 38 covered |
| Custom sets | 4 | 4 covered |
| Items / SS equipment | 11 | 11 covered |
| Heroes | 23 | 23 covered |
| Pets | 8 | Tangtang has 9 product pets; Gary is extra/default pet-skill side |
| Mounts | 3 | 3 covered at summarized product layer |
| Techs | 10 | 10 covered |
| Turf | 3 | summarized import/context covered |
| LME | 2 top keys | mode/testament behavior needs fixes below |

Current source taxonomy direct gap rows remain `0`.

## Confirmed Alignments

- Full-equivalence gate remains green:
  - `fullSioEquivalent=true`
  - `currentScorer=sio_full_lm_equivalence`
  - `liveCaptureCount=26`
  - `workerParity.arbitraryGeneratedLiveExpected=26/26`
  - `G0/G1/G2/G3/G6=true`
- `Guild Expedition` testament debuff delta table in Tangtang matches Rust `COMPACT_LME_DEBUFF_DELTAS` exactly:
  - Tangtang rows: 270
  - Rust rows: 270
  - Missing/extra rows: 0
- Public WASM build does intentionally rewrite the internal SIO bridge names:
  - `frontend/scripts/build_public_wasm_surface.mjs`
  - generated WASM strings include `appLm`, `app_lm`, and `full_app_equivalent`
  - so `frontend/app/lib/wasm-worker.ts` using `appLm` is not by itself proof of a broken bridge
- Collection set Korean display names are complete:
  - SIO source sets: 38
  - Korean set overrides: 38

## P1 Gaps

### P1-1. External SIO Links Can Misclassify EE as Guild Expedition

Finding:
- Fixture `4ZgaBw` decodes as:
  - `gameMode: "ee"`
  - `lmeTestaments: 86500`
- Tangtang normalization currently imports `lmeTestaments` as `account.guildExpeditionTestaments`.
- `optimizer.tsx` selects `guildExpedition` if `guildExpeditionTestaments !== undefined`.
- Result: an EE SIO profile with nonzero testament metadata can be run as Guild Expedition in Tangtang.

Evidence:
- `frontend/app/lib/pareto-store/external-calculation-profile.ts`
- `frontend/components/v3/optimizer.tsx`
- decoded fixture check showed normalized account includes `guildExpeditionTestaments: 86500` for `gameMode: "ee"`.

Fix:
- Preserve imported external `gameMode` separately.
- Select `guildExpedition` only when imported `gameMode === "lme2"`.
- Do not let nonzero `lmeTestaments` alone switch slots.
- Add regression fixtures:
  - `gameMode: "ee", lmeTestaments: 86500` stays Ender's Echo.
  - `gameMode: "lme1", lmeTestaments: 86500` stays Ender's Echo/LME1 handling.
  - `gameMode: "lme2", lmeTestaments: 600` selects Guild Expedition.

### P1-2. High-Testament Guild Expedition Has a Special SIO Transform Not Represented in Tangtang Context

Finding:
- Tangtang pre-applies the 270-row LME2 testament debuff table into `baseStats`.
- SIO/Rust also has a special generic transform path:
  - if `gameMode == "lme2"`
  - and `accountInputs.lme.testaments >= 73500`
  - and no Judgment SS core profile
  - then add `weakened +30`.
- Tangtang's `buildTechCalculationContext` currently returns `gameMode` and `baseStats`, but not raw compact/account-input `lme.testaments`.

Evidence:
- `frontend/components/v3/tech/techAccountContext.ts`
- `tttg_forge_optimizer/src/tech/sio_lm.rs`
- `tttg_forge_optimizer/src/tech/sio_config.rs`

Fix:
- Add a supplied-context parity test around `73500`.
- Either carry the raw testament value/account input into the public scoring context, or explicitly fold the special transform into Tangtang context when conditions match.
- Keep this behind RED/GREEN because it changes mode-context scoring behavior.

### P1-3. S60 Gate Is Green, But It Is Not Full Optimizer Parity

Finding:
- S60 proves generated live evidence coverage and residual-free matrix predicates.
- It does not run the separate optimizer parity scripts as part of the gate.
- Trace summary reports:
  - `stageProductPassed: 26`
  - `replayedPassed: 0`
  - `calcModes: ["damage"]`
  - `gameModes: ["lme1", "lme2", "ee"]`

Fix:
- Add a non-writing S60 successor gate that runs optimizer parity on arbitrary generated cases:
  - full row signature
  - active skills
  - chips
  - parts
  - overload
  - multiplier error <= `1e-9`
  - scorer/full flag

## P2 Gaps

### P2-1. Korean Collection Item Coverage Is Not Complete

Finding:
- `techLocaleCopy.ts` has Korean overrides for `62 / 119` SIO collectible keys.
- Events are intentionally pending, but 14 source-backed named items plus the no-effect placeholder are not represented in the pending list.

Named source-backed Korean fallback gaps:
- `Aquarius Starlight`
- `Pisces Starlight`
- `Aries Starlight`
- `Taurus Starlight`
- `Golden Cutlery`
- `Safehouse Map`
- `Scientific Luminary's Journal`
- `Golden Horn`
- `Elemental Ring`
- `Superhuman Pill`
- `Gemini Starlight`
- `Cancer Starlight`
- `Leo Starlight`
- `Virgo Starlight`

Sentinel / placeholder:
- `Excellent`
- `Event 1` through `Event 42`

Fix:
- Add Korean overrides for the 14 named source-backed items.
- Treat `Excellent` as a no-display sentinel.
- Keep `Event 1-42` in an explicit pending allowlist.
- Add source-driven tests:
  - all SIO set names must have Korean overrides
  - all source-backed collectible names must have Korean overrides or be explicitly pending

### P2-2. Collection Recommendations Use a Separate Smaller Korean Name Map

Finding:
- `collectible-upgrade-recommendations.ts` has its own Korean name map with only `14 / 76` actionable source-backed items.
- This can produce Korean recommendation sentences containing English item names even when `techLocaleCopy.ts` has a Korean override.

Fix:
- Reuse `localizeTechEntityName('collectibleItem', ...)` in recommendations.
- Add a Korean recommendation test for a currently uncovered item, for example `Memory Editor`.

### P2-3. Public Surface Guards Are Too Narrow

Finding:
- Current public guards block SIO-oriented strings, but not enough broader debug/build vocabulary.
- Candidate exposed terms/surfaces:
  - share URL keeps existing query params such as `debug`, `raw`, or `beam`
  - `/v3` route exposes `window.__useParetoStore`
  - `/v3` route has internal copy such as slice/selector/invariant counts
  - `PlayerStateCoveragePanel` renders raw schema keys
  - optimizer UI has `Iteration cap` and raw iteration counts
  - DOM attributes include `data-raw-label`
  - V3 graph route shows `Nodes`, `matrix`, `debounced`, `No turf nodes registered`

Fix:
- Add one public-surface denylist shared by source/build/share tests:
  - `SIO`
  - `debug`
  - `raw source`
  - `preselect`
  - `beam`
  - `exact`
  - `node cap`
  - `iteration cap`
  - `__useParetoStore`
  - schema key dumps
- Scan public route files, tech panels, locale copy, built HTML/JS, and share URLs.
- Rename or hide public debug panels.

### P2-4. Share Links Are Reversible Query Payloads

Finding:
- Share payload is hex-encoded JSON in `?ttProfile=`.
- It is not encrypted and can be captured by browser history, server logs, analytics, and referrers.
- Existing query params are preserved when generating a new share URL.

Fix:
- Prefer fragment payload: `#ttProfile=...` for client-side import.
- Or use server-side opaque tokens.
- If keeping query payloads, explicitly state that share links are public profile exports.
- Drop unrelated query params when generating a share link.

### P2-5. Storage / Share Versioning Has No Migration Fixtures

Finding:
- Storage/share/backup are versioned as `1`.
- New fields are optional enough that older payloads likely load, but there are no explicit legacy fixtures for payloads missing:
  - `activeProfileSlot`
  - `guildExpeditionTestaments`
  - imported snapshot active slot

Fix:
- Add legacy v1 fixtures.
- Add versioned decoder/migration helpers before incrementing schema.

## P3 Product-Depth Gaps

These are not current source/scoring gaps, but they explain why Tangtang can still feel thinner than SIO:

- Full per-item collectible editing/import is still partial; source formula rows are covered, but product controls are summarized.
- Custom sets are covered as four numeric slots, but not presented with rich user-facing set composition detail.
- Mount coverage is summarized through active mount/core/puzzle stats, not a full mount collection/puzzle editor.
- Equipment source/scoring coverage is broad, but full per-slot item-changing and enhancement depth can still be improved.
- Screenshot text import captures key account values, but not every structured compact/profile row.
- Recommendation impact rows reuse before/after summary deltas and do not yet prove one recommendation's exact marginal gain.

## Rejected / Corrected Finding

Claim: production `calculationContext` is ignored because the worker sends `appLm` and Rust source reads `sioLm`.

Correction:
- The source Rust code does read `sioLm` / `sio_lm`.
- But the public WASM build intentionally rewrites those names to product-safe `appLm` / `app_lm`.
- `strings frontend/.generated/public-wasm/tttg_forge_wasm_bg.wasm` shows `appLm` and product-safe scorer names.
- This should become an explicit build guard, not be treated as a current functional break.

## Recommended Execution Order

1. Fix external calculation mode import:
   - preserve `gameMode`
   - only select Guild Expedition on `lme2`
   - add EE/LME1 nonzero-testament regression tests
2. Add high-testament LME2 parity test and fix raw testament/special-transform handling.
3. Replace recommendation Korean name map with shared localization helper and complete 14 named collection item overrides.
4. Strengthen public surface guards and remove/hide public debug vocabulary.
5. Add optimizer parity successor gate for the 26 arbitrary live cases.
6. Add legacy storage/share fixtures and migrations.
7. Expand generated live fixtures to cover all tech parts, all modes, positive overload, broader chip distributions, and missing active skills.

## Deployment Note

Current deployed production:

- URL: `https://tanggall.vercel.app`
- Deployment id: `dpl_HbHtqcbaU3N1FnQKCRw1JQJnTjG2`
- Commit: `ff408d7 feat: localize collections and add guild expedition context`

This audit did not deploy any new change.
