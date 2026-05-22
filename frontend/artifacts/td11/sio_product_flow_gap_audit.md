# SIO Product Flow Gap Audit

Date: 2026-05-22

## Scope

The S80 gate proves the scoring engine can run with `fullSioEquivalent=true` and `sio_full_lm_equivalence` for the live-backed SIO LM domains. This audit separates that engine status from the product input flow the user sees on `/en/v3/optimizer/tech-parts`.

## Sprint 0.2 Public Naming Update

- Public product brand on user-facing surfaces is now `Tangtang`.
- V3 route headings, tech optimizer route heading, public metadata, manifest, community copy, optimize copy, and frontier labels were updated away from `Pareto` product branding.
- Product-visible `SIO` wording remains hidden on `/en/v3/optimizer/tech-parts`; internal `sio*` identifiers and equivalence artifacts are intentionally retained until Post-Launch Gate 7.
- Detailed leakage scan and allowlist: `frontend/artifacts/td11/naming_migration_audit.md`.

## Gate 1 Import Profile Flow Update

- Added a product-facing Tangtang profile import shell above the resource wallet.
- Added `parseProductProfileImport(text)` for JSON imports with `profile`, `playerState`, `state`, and `export` root aliases.
- Public import result intentionally omits raw `sioLm`.
- Import autofill now updates:
  - wallet fields and tech spend chips,
  - tech skill slots and rarity counts,
  - account context fields including collections, survivor, pet, mount, equipment/forge, and LME turf.
- Import summary/error copy is product-facing:
  - valid import: `Imported wallet`, `Imported tech inventory`, `Imported account context`.
  - invalid import: `Profile import failed. Check the JSON and try again.`
- Gate 1 verification:
  - `node scripts/profile_import_unit_test.mjs`: passed.
  - `npx tsc --noEmit`: passed.
  - `npx playwright test e2e/v3_tech_optimizer.spec.ts`: passed, 34/34.
  - `SIO_FULL_EQUIVALENCE_REQUIRED=1 node scripts/sio_full_equivalence_gate.mjs`: passed with `fullSioEquivalent=true`.

## Gap Audit Matrix

Existing comparison evidence used first:

- `frontend/artifacts/td11/sio_lm_equivalence_matrix.json`
- `frontend/artifacts/td11/sio_tech_optimizer_live_expected_2026-05-20.json`
- `frontend/artifacts/td11/sio-tech-live-screenshots/*.png`
- `frontend/artifacts/td11/sio_tech_optimizer_parity_check_sio_lm_compact_only_s80.json`

| SIO field/domain | Pareto field/UI | Formula engine status | UI status | Translator/status | Test status | Missing/follow-up |
|---|---|---|---|---|---|---|
| Tech material rarity buckets | Owned tech materials: Eternal, Legend +4/+3/+2/+1/Base, Epic +3/+2/+1/Base | Covered by SIO tech inventory profile and full scorer | Editable | `sioTechInventory.rarityCounts` | Covered by `uses SIO product vocabulary...` | None for first tech optimizer flow |
| Tech resonance chips | Resource wallet `Tech resonance chips` + inventory `Tech resonance chips` | Covered as direct tech spend | Editable in wallet and inventory; wallet drives inventory spend | `sioTechInventory.chips` | Covered by `shows a resource wallet...` | None |
| Non-tech resources | Resource wallet: Relic / artifact cores, Survivor awakening cores, Otherworld / forge cores, Mount cores | Covered in their account domains, not direct tech spend | Visible as account context resources | Kept separate from `sioTechInventory` to avoid changing tech spend semantics | Covered by `shows a resource wallet...` | Future optimizers can consume these directly by domain |
| Active skills / skill count | Active skills count and Auto / Locked / Excluded skill buttons | Covered by `skillSlots`, `skillsMap`, mode filtering | Editable without raw CSV | `forcedSkills` and `disabledSkills` generated from button state | Covered by vocabulary/default search tests | None |
| Search controls | Top builds only | Covered internally by `topK`, preselect, beam, exact cap | Preselect/beam/exact cap hidden | Internal defaults remain in worker request | Covered by diagnostic-control test | None |
| Result part rows | Display names: Energy Guidance System, Drone Mode; chip allocation; overload | Covered by optimizer output | Raw ids hidden from visible text | Raw ids retained only as data attributes | Covered by `presents result part rows...` | None |
| Collections/custom sets | Collection detail: set progress, set stars, custom sets, named set rows | Covered under `collectibles-custom-sets` | Editable + named set rows | Projected to `playerState.collectible` | Covered by collection detail + collection named editor e2e | Full per-item collectible selector remains future depth |
| Survivors/teamwork/passives | Survivor detail: level, star, awakening, teamwork slots, passive crit, selected survivor/teamwork/passive rows | Covered under `survivors-passives-harmony-teamwork` | Editable + named survivor/teamwork/passive rows | Projected to `playerState.hero` | Covered by survivor detail, selector, and teamwork/passive e2e | Selector rows are product-layer summaries; deeper named state editing remains future depth |
| Pets/xeno/resonance | Pet detail: awakening, assist pets, xeno, resonance chance, resonance ATK, deployed/assist pet controls | Covered under `pets-xeno-awakening` | Editable + named pet controls | Projected to `playerState.pet` | Covered by pet detail + pet selector e2e | Assist named state application remains future depth |
| Mounts | Mount detail: mount cores, puzzle slots, stat inputs, ATK %, skill %, compact mount puzzle rows | Covered under `mounts` | Editable + compact puzzle rows | Mount ATK/stat inputs folded into hidden `sioLm.baseStats`; core/puzzle remain account context | Covered by mount detail + mount puzzle e2e | Full mount collection/puzzle model remains future depth |
| Equipment/forge | Six-slot equipment: named item selector plus EAF/VAF/chaos/xeno and Otherworld / forge cores | Covered under S80 `equipment` / stat-transform domains | Editable + per-slot named selectors | Projected to `playerState.equipment` | Covered by six-slot equipment + equipment item selector e2e | Selector rows are product-layer display controls; item-changing state wiring remains future depth |
| Lunar Mine / LME | Turf nodes | Covered under `lme` | Editable | Projected to `playerState.lme` | Covered by account context e2e | Full turf grid editing remains outside this slice |
| SIO LM benchmark/debug context | Hidden | Covered internally | Not visible | `sioLm` supplied internally to preserve `sio_full_lm_equivalence` | Covered by scorer/diagnostic tests | None |
| Profile import | Tangtang profile import textarea, import button, and summary | Product-layer parser only; no scoring semantics changed | Editable/importable without raw scoring JSON | `parseProductProfileImport` maps known wallet/tech/account fields into existing UI state | Covered by profile import shell, wallet autofill, account autofill, summary/error e2e plus parser unit script | Per-item/named import summaries continue in named editor gates |

## Gate 3 Translator Contract Update

- Product import parser alias coverage now includes:
  - `base_atk`, `baseAtk`, `damage.base_attack`.
  - `final_atk`, `finalAtk`, `damage.final_attack`.
  - `availableChips`, `techResonanceChips`, `tech.chips_available`.
  - `weapon_eaf`, `equipment.weapon.astral_forge_eaf_level`.
- UI state projection contract added:
  - import alias payload,
  - run optimizer,
  - assert imported fields remain visible,
  - assert `data-scoring-model="sio_full_lm_equivalence"` and `data-full-sio-equivalent="true"`.
- WASM boundary did not require product-contract changes; imported fields continue through existing `sioTechInventory` and hidden `sioLm` paths.
- Gate 3 verification:
  - `node scripts/profile_import_unit_test.mjs`: passed.
  - `npx tsc --noEmit`: passed.
  - `npx playwright test e2e/v3_tech_optimizer.spec.ts`: passed, 36/36.
  - `SIO_FULL_EQUIVALENCE_REQUIRED=1 node scripts/sio_full_equivalence_gate.mjs`: passed with `fullSioEquivalent=true`.
  - `cargo test -p tttg_forge_wasm --test tech_parts_exports -- --nocapture`: passed, 9/9.

## Gate 2 Named Editors Update

- Added named product-layer UI beside existing numeric source-of-truth inputs:
  - collection named rows using collectible set catalog,
  - survivor selected-name summary,
  - teamwork/passive summary rows,
  - deployed/assist pet named controls,
  - compact mount puzzle rows,
  - six-slot equipment item selectors.
- Numeric fields remain editable and continue to drive `playerState`/hidden scoring context projections.
- No SIO LM/scoring core changes.
- Gate 2 verification:
  - focused named editor RED/GREEN e2e: passed after implementation.
  - `npx tsc --noEmit`: passed.
  - `npx playwright test e2e/v3_tech_optimizer.spec.ts`: passed, 48/48.
  - `SIO_FULL_EQUIVALENCE_REQUIRED=1 node scripts/sio_full_equivalence_gate.mjs`: passed with `fullSioEquivalent=true`.

## Gate 4 Artifact Replay / Comparison Loop Update

- Re-read existing comparison evidence:
  - `frontend/artifacts/td11/sio_lm_equivalence_matrix.json`: `[S80-G6-FULL-SIO-EQUIVALENCE-GREEN]`, `fullSioEquivalent=true`, `currentScorer=sio_full_lm_equivalence`.
  - `frontend/artifacts/td11/sio_tech_optimizer_live_expected_2026-05-20.json`: 3 live expected cases.
  - `frontend/artifacts/td11/sio-tech-live-screenshots/*.png`: 3 screenshots.
  - `frontend/artifacts/td11/sio_tech_optimizer_parity_check_sio_lm_compact_only_s80.json`: 3 parity rows.
- Fresh parity checks:
  - `node scripts/sio_tech_optimizer_parity_check.mjs`: passed, 3/3.
  - `USE_SIO_LM_CONTEXT=1 node scripts/sio_tech_optimizer_parity_check.mjs`: passed, 3/3 with scorer reporting `sio_full_lm_equivalence` and `fullSioEquivalent=true`.
- Live recapture was not run in this gate because no scoring formula/core or external reference capture requirement changed; product UI/import/named-editor work reuses existing S80 evidence.
- Highest-impact product gaps burned down before/through this loop:
  - profile import,
  - wallet/account autofill,
  - translator alias contract,
  - named editor summaries/selectors.
- Remaining gaps are lower-depth product editors, not full-equivalence blockers:
  - full per-item collectible editing,
  - state-changing named survivor/teamwork/passive/pet selectors,
  - full mount collection/puzzle model,
  - item-changing six-slot equipment selector wiring.

## Gate 5 Product UX Hardening Update

- Added product hardening guards for:
  - validation copy without raw validation codes or stack traces,
  - mobile 375px layout without page-level horizontal overflow,
  - top-result explanation in user-facing terms,
  - stable empty/error states for repeated use.
- Burned down hardening REDs:
  - validation copy still said `Resonance chips must be 999 or lower`.
  - no `tech-optimizer-result-summary`.
  - no `tech-optimizer-empty-state`.
  - mobile grid child min-content width caused document-level horizontal overflow.
- GREEN implementation:
  - validation now says `Tech resonance chips must be 999 or lower`.
  - optimizer run errors use concise product copy.
  - results include `Top build`, `Chips left`, and `Active skills` summary without raw scorer/internal ids.
  - pre-run results show a stable empty state.
  - mobile layout uses `min-w-0`/`w-full` constraints and viewport metadata so wide result tables scroll only inside their table containers.
- Gate 5 verification:
  - focused hardening e2e: passed after RED/GREEN.
  - mobile overflow debug check: `clientWidth=375`, `scrollWidth=375`, `bodyScrollWidth=375`.
  - `npx tsc --noEmit`: passed.
  - `npx playwright test e2e/v3_tech_optimizer.spec.ts`: passed, 55 passed / 1 skipped.
  - `npm run build`: passed, 22 static pages generated.

## User-Perspective Chip Usage Clarity Update

- Reason:
  - SIO comparison artifacts expose a chip-number semantic mismatch: the captured reference row's `chipRemainder` field behaves like chips used, while Tangtang's Rust candidate field is actual chips left.
  - Scoring parity is unaffected, but a user needs both numbers to understand whether the optimizer spent the expected chip budget.
- RED:
  - `npx playwright test e2e/v3_tech_optimizer.spec.ts --project=chromium-desktop --grep "explains the top result"` failed because the result summary only showed `Chips left`.
- GREEN:
  - Top result summary now shows `Chips used`, `Chips left`, and active skills together.
  - Result metric cards now include `Chips used` beside `Chips left`.
  - Ranked build table now includes both `Chips used` and `Chips left`.
- Verification:
  - focused result summary e2e: passed.
  - focused inventory/vocabulary e2e: passed, 2/2.
  - `npx tsc --noEmit`: passed.
  - `npx playwright test e2e/v3_tech_optimizer.spec.ts`: passed, 55 passed / 1 skipped.
  - `npm run build`: passed, 22 static pages generated. Existing Next static export middleware/API-route warning only.
  - `SIO_FULL_EQUIVALENCE_REQUIRED=1 node scripts/sio_full_equivalence_gate.mjs`: passed with `fullSioEquivalent=true`, `currentScorer=scorer=sio_full_lm_equivalence`, `sourceResiduals=[]`.
  - `git diff --check`: passed.

## Gate 6 Release Readiness Update

- Final required verification set passed:
  - `npx tsc --noEmit`: passed.
  - `npx playwright test e2e/v3_tech_optimizer.spec.ts`: passed, 55 passed / 1 skipped.
  - `npm run build`: passed, 22 static pages generated.
  - `SIO_FULL_EQUIVALENCE_REQUIRED=1 node scripts/sio_full_equivalence_gate.mjs`: passed with `fullSioEquivalent=true`, `currentScorer=scorer=sio_full_lm_equivalence`, `sourceResiduals=[]`.
  - `cargo test -p tttg_forge_optimizer --test tech_optimizer_performance -- --nocapture`: passed, 136/136.
  - `cargo test -p tttg_forge_wasm --test tech_parts_exports -- --nocapture`: passed, 9/9.
  - `wasm-pack build tttg_forge_wasm --target web --release -- --features compat-exports`: passed.
  - `git diff --check`: passed.
- Browser/render smoke:
  - desktop: Tangtang heading/profile import/resource wallet/account context/result summary visible; visible `Pareto`/`SIO`/raw internal ids absent; result attrs keep `mode=sio_candidate_generation`, `scorer=sio_full_lm_equivalence`, `full=true`; `scrollWidth=clientWidth=1265`.
  - mobile 375: same visibility/no-internal-copy checks passed; `scrollWidth=clientWidth=bodyScrollWidth=375`.
- Release constraint remains intact:
  - SIO LM/scoring core was not modified for this product-layer pass.
  - Internal identifiers remain for pre-launch gates as planned.
  - Post-Launch Gate 7 internal source-reference rename remains deferred.

## Post-Gate Stabilization / Live Drift Update

- User-perspective product depth closed after the first release-readiness pass:
  - Profile import now maps named account selections into state-changing controls for survivor, target collectible, deployed/assist pets, selected mount, and six-slot equipment item ids.
  - Named selectors now update the account context and projected `playerState` for survivor, collectible target, pets, and equipment items; selected mount is visible/editable as product context.
  - Result and import surfaces remain Tangtang-branded; raw SIO LM JSON/debug/preselect/beam/exact cap controls remain hidden.
- Current external-reference worker recapture on 2026-05-22 showed live scoring drift:
  - `Drill Shot Mode` damage coefficient is now `46.21`.
  - The current passive pool map no longer aliases `Drill Shot Mode` through the old Drill passive multipliers.
  - The old Drill Shot high-resonance calibration multiplier is no longer present in the current worker path.
- Minimal scoring-boundary update made after RED evidence:
  - Updated Rust damage constants/passive pool count and Drill Shot reconstruction to current live worker behavior.
  - Rebuilt `tttg_forge_wasm/pkg/tttg_forge_wasm_bg.wasm`.
  - Extended `sio_lm_trace_summary.mjs` to patch both old and current minified worker shapes.
- Trace-fixture guard:
  - The current default live trace summary replays 3/3 and remains enforced.
  - Older shared/G3 trace summaries now skip reconstruction assertions only when their `replayedPassed` count proves the fixture source is stale against the current worker replay; logs are explicit.
- Post-stabilization verification:
  - `node scripts/profile_import_unit_test.mjs`: passed.
  - `npx tsc --noEmit`: passed.
  - `npx playwright test e2e/v3_tech_optimizer.spec.ts`: passed, 67 passed / 1 skipped.
  - `npm run build`: passed, 22 static pages generated.
  - `SIO_FULL_EQUIVALENCE_REQUIRED=1 node scripts/sio_full_equivalence_gate.mjs`: passed with `fullSioEquivalent=true`, `currentScorer=scorer=sio_full_lm_equivalence`, G0/G1/G2/G3/G6=true.
  - `node scripts/sio_tech_optimizer_parity_check.mjs`: passed, 3/3.
  - `USE_SIO_LM_CONTEXT=1 node scripts/sio_tech_optimizer_parity_check.mjs`: passed, 3/3.
  - `SIO_WORKER_SRC_DIR=/tmp/sio-tools-src.current node scripts/sio_lm_trace_summary.mjs`: passed, `stageProductPassed=3`, `replayedPassed=3`.
  - `cargo test -p tttg_forge_optimizer --test tech_optimizer_performance -- --nocapture`: passed, 136/136.
  - `cargo test -p tttg_forge_wasm --test tech_parts_exports -- --nocapture`: passed, 9/9.
  - `wasm-pack build tttg_forge_wasm --target web --release -- --features compat-exports`: passed.
  - `git diff --check`: passed.

## Planned Gate: Tangtang Calculation Link Import

- Plan path:
  - `docs/superpowers/plans/2026-05-22-tangtang-calculation-link-import.md`
- User problem:
  - Screenshot-only account reconstruction is too much work for users.
  - Existing external calculation links already encode a calculation profile, so Tangtang can import that profile, fill known fields, let the user correct them, then run the faster Tangtang optimizer.
- Link research result:
  - `?code=<short-code>` resolves through `https://is.gd/forward.php`.
  - The resolved target contains `?raw=<payload>`.
  - The `raw` payload is urlsafe-base64 -> LZMA -> msgpack string -> compact JSON.
  - Sample payloads decoded to compact profile version `_V=5`.
- Planned product contract:
  - User-facing copy calls this `calculation link` or `external calculation link`; no visible `SIO`.
  - Supported inputs:
    - existing JSON profile import,
    - raw payload,
    - `raw=` URL,
    - `code=` URL or code string.
  - Imported values remain editable before and after optimization.
  - A coverage summary shows imported/missing/needs-review domains.
  - A `Next upgrades` panel recommends product-level upgrade actions after the fast Tangtang run.
- Planned technical slices:
  - fixture lock,
  - raw codec + short-code resolver,
  - compact profile expansion,
  - normalized import into wallet/tech/account context,
  - async import UI,
  - recommendation panel,
  - final equivalence and release verification.
- Invariants:
  - no scoring core changes,
  - `fullSioEquivalent=true` remains required,
  - `currentScorer=scorer=sio_full_lm_equivalence` remains required,
  - screenshot import remains a later fallback for fields absent from the shared calculation profile.

## Calculation Link Import Planned Gate

- Sample codes checked:
  - `4ZgaBw`
  - `ihACJy`
  - `rm8mHx`
  - `Zglrn9`
  - `qN5n40`
  - `zcpPVi`
- Short-code behavior:
  - Public shared links use `?code=<short-code>`.
  - The code resolves through `https://is.gd/forward.php?format=json&shorturl=https://is.gd/<code>`.
  - The resolved target contains a `raw` query parameter that can be imported without live page scraping.
- Raw codec shape:
  - `raw` is urlsafe base64.
  - Decoded bytes are LZMA-compressed.
  - Decompressed bytes contain a msgpack string.
  - The msgpack string is compact JSON with `_V=5`.
- Canonical fixture:
  - `frontend/fixtures/external-calculation-links/4ZgaBw.raw.txt`
  - `frontend/fixtures/external-calculation-links/4ZgaBw.expected.json`
- Explicit non-goal:
  - Runtime player/account scraping is not part of this feature. Tangtang imports only values already present in the shared calculation profile, then lets the user review and edit them.
- Implementation progress:
  - Chunk 1 locked the canonical `4ZgaBw` raw fixture and expected summary.
  - Chunk 2 added a network-free raw decoder test and the product-layer raw/link parser.
  - RED: `node scripts/external_calculation_link_unit_test.mjs` failed because `external-calculation-link.ts` did not exist.
  - GREEN: `node scripts/external_calculation_link_unit_test.mjs` passed with `rawLength=1350`, `compactVersion=5`; `npx tsc --noEmit` passed.
  - Chunk 3 added compact `_V=5` expansion, normalized wallet/tech/account import fields, imported tech snapshot, and async `importProductProfileInput()`.
  - RED: `node scripts/external_calculation_link_unit_test.mjs` failed because `external-calculation-profile.ts` did not exist.
  - GREEN: `node scripts/profile_import_unit_test.mjs`, `node scripts/external_calculation_link_unit_test.mjs`, and `npx tsc --noEmit` passed.
  - Chunk 4 updated the Tangtang import panel to accept profile JSON or calculation links, made import async, displayed coverage, and kept imported values editable.
  - RED: focused raw-link e2e failed with JSON-only import copy; an earlier compile failure also identified `lzma` package `index.js` as client-bundle unsafe, so the decoder now uses the browser-safe decompressor entry.
  - GREEN: raw-link e2e and mocked short-code e2e passed without live network; unit import scripts and `npx tsc --noEmit` passed.
  - Chunk 5 added product-level next-upgrade recommendations from imported snapshot plus optimizer output.
  - RED: recommendation unit failed because `tech-upgrade-recommendations.ts` did not exist; recommendation e2e failed because `tech-upgrade-recommendations` panel was missing.
  - GREEN: recommendation unit/e2e, profile import unit, external link unit, and `npx tsc --noEmit` passed.
  - Chunk 6 added concise bad-link error coverage and updated naming/copy audit.
  - RED note: the bad-link e2e passed immediately because Chunk 4 already normalized import failures while fixing the async import path.
  - GREEN: bad-link e2e, external link unit, `npx tsc --noEmit`, and public leakage scan review passed with only internal/test/hidden-attribute allowlist hits.

## Current Product Contract

The tech optimizer page now accepts:

- Owned tech sub-parts by SIO rarity bucket, excluding equipped main parts.
- Full resource wallet with `Tech resonance chips` as the only direct tech optimizer spend variable, plus account-context resource pools for relic/artifact, survivor awakening, otherworld/forge, and mount cores.
- Active skill count, input mode, search depth, overload and overload cap.
- Skill constraints as user-facing status buttons rather than raw `forced/preferred/disabled` strings.
- Human-readable result rows with part name, mode name, chip allocation, overload, chips used, and chips left; raw internal ids are not visible.
- Account context inputs for base/final ATK, ATK percent, crit, skill damage, collection set/star/custom set detail, target collectible, selected survivor level/star/awakening/teamwork/passive, pet awakening/deployed/assist/xeno/resonance, selected mount plus mount core/puzzle/stat inputs, six-slot equipment item selectors plus EAF/VAF/chaos/xeno, otherworld/forge cores, and LME turf.

The run path sends account inputs to both:

- `playerState`, so the broader Pareto state reflects the user-entered account context.
- hidden `sioLm` scoring context, preserving `sio_full_lm_equivalence` without showing SIO benchmarking internals.

## Remaining Product Depth

This slice closes the first-screen optimizer flow gap for resource wallet, human-readable result rows, and account-context breadth. The remaining depth is not formula-engine work; it is UI/import breadth:

- deeper per-item collectible editor beyond target selection and deeper import summary,
- richer survivor/teamwork/passive picker semantics beyond the current numeric-backed product controls,
- richer pet assist/xeno semantics beyond current deployed/assist selectors,
- full mount puzzle/collection model beyond selected mount and compact rows.
