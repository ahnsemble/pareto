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

## Calculation Link Import Final Gate

timestampKst: 2026-05-22T18:10:01+09:00
status: `[CHUNK-7-COMPLETE-LOCAL]`

- Final product behavior:
  - Tangtang accepts profile JSON, raw calculation payloads, `raw=` URLs, and short `code=` calculation links.
  - Imported calculation profiles fill known wallet, tech inventory, optimizer setting, equipment, and account-context defaults.
  - Imported values remain editable; Browser smoke verified `Tech resonance chips` changed to `12` after import.
  - Fast optimizer run completed with 10 visible result rows and a product-level `Next upgrades` recommendation.
  - Public UI scan and Browser smoke found no visible `SIO`, raw scoring model, `sioLm`, codec internals, stack traces, or raw mode ids in the import/recommendation flow.
- RED/GREEN summary:
  - Chunk 1 RED locked missing fixture expectation, then GREEN after canonical `4ZgaBw` raw/expected fixtures were added.
  - Chunk 2 RED failed on missing calculation-link module, then GREEN after urlsafe-base64 -> LZMA -> msgpack -> compact JSON decoding.
  - Chunk 3 RED failed on missing compact profile normalizer, then GREEN after `_V=5` expansion and product import normalization.
  - Chunk 4 RED exposed JSON-only import copy and a client-bundle unsafe `lzma` package entry, then GREEN after async link import UI and browser-safe decoder entry.
  - Chunk 5 RED failed on missing recommendation module/panel, then GREEN after `Next upgrades` generation and UI.
  - Chunk 6 bad-link guard passed immediately because generic import error copy was already normalized; kept as regression coverage.
- Final verification:
  - `node scripts/profile_import_unit_test.mjs`: passed.
  - `node scripts/external_calculation_link_unit_test.mjs`: passed, `rawLength=1350`, `compactVersion=5`.
  - `npx tsc --noEmit`: passed.
  - `npx playwright test e2e/v3_tech_optimizer.spec.ts`: passed, 75 passed / 1 skipped.
  - `npm run build`: passed on rerun, 22 static pages generated. The first concurrent build attempt failed with `PageNotFoundError: Cannot find module for page: /_document` while another Next/Playwright server was active; rerun completed cleanly.
  - `SIO_FULL_EQUIVALENCE_REQUIRED=1 node scripts/sio_full_equivalence_gate.mjs`: passed with `fullSioEquivalent=true`, `currentScorer=scorer=sio_full_lm_equivalence`, G0/G1/G2/G3/G6=true.
  - `cargo test -p tttg_forge_optimizer --test tech_optimizer_performance -- --nocapture`: passed, 136/136.
  - `cargo test -p tttg_forge_wasm --test tech_parts_exports -- --nocapture`: passed, 9/9.
  - `wasm-pack build tttg_forge_wasm --target web --release -- --features compat-exports`: passed; only existing metadata/version warnings.
  - `git diff --check`: passed.
- Browser smoke:
  - URL: `http://127.0.0.1:3060/en/v3/optimizer/tech-parts`
  - Import summary: `Imported calculation link / Imported account context / Imported tech inventory`.
  - Coverage: Build stats, tech inventory, optimizer settings, equipment, account context, and profile domains imported.
  - Result state: 10 result rows, first answer `529.1 ms`, recommendations visible.
  - Screenshot: `frontend/artifacts/td11/tangtang_calculation_link_import_smoke.png`
- Remaining intentional limitations:
  - Live short-link import depends on `is.gd/forward.php` availability; tests mock that network edge.
  - Tangtang imports only values encoded in the shared calculation profile; screenshot/account scraping remains a future fallback.
  - Internal `sio*` names are intentionally not renamed in this slice and remain deferred to Post-Launch Gate 7.

## In-Game Screenshot Reference Values

timestampKst: 2026-05-22T18:35:00+09:00
status: `[USER-SCREENSHOT-REFERENCE-RECORDED]`

The user supplied three in-game screenshots after final verification. These are not part of the calculation-link primary import path, but they are now recorded as reference values for a future screenshot/manual fallback and for human QA against in-game-visible fields:

- Special ops attributes:
  - base ATK: `126424`
  - base HP: `445223`
  - ATK bonus: `126%`
  - HP bonus: `136%`
  - final ATK: `550220`
  - final HP: `2186560`
  - crit rate: `147%`
  - crit damage: `822%`
  - skill damage: `477%`
- Detailed attributes:
  - shield damage increase: `165%`
  - poisoned target damage increase: `45%`
  - weakened target damage increase: `195%`
  - chilled target damage increase: `257.5%`
  - lacerated target damage increase: `85%`
  - movement speed: `13`
  - movement speed cap: `16`
  - pet ATK: `355274`
  - otherworld pet sync rate: `42.5%`
- Core inventory:
  - otherworld core: `2 / 0`
  - relic core: `74 / 67`
  - resonance chip: `21 / 0`
  - special ops awakening core: `26 / 0`

Follow-up implication:

- The calculation-link import remains the fastest default path.
- Screenshot/manual fallback should use these in-game-visible labels as canonical user-facing field names where the shared profile omits or stales a value.

## Screenshot Text Import Fallback

timestampKst: 2026-05-22T19:14:29+09:00
status: `[PRODUCT-IMPROVEMENT-GREEN]`

- Product behavior:
  - The existing Tangtang import textarea now accepts pasted in-game screenshot/OCR text as a fallback input.
  - Recognized labels fill editable account defaults and wallet fields:
    - `기본 공격력` -> Base ATK.
    - `최후의 공격` / `최종 공격력` -> Final ATK.
    - `공격력 보너스` -> ATK %.
    - `치명타 확률` -> Crit rate.
    - `치명타 피해량` -> Crit damage.
    - `스킬 피해` -> Skill damage.
    - `공진 칩` -> Tech resonance chips.
    - `신기 핵심` -> Relic / artifact cores.
    - `특공대 각성 코어` -> Survivor awakening cores.
    - `이세계 코어` -> Otherworld / forge cores.
  - Extra screenshot-only stats such as pet ATK, movement speed, sync rate, and condition damage remain review-only for a future deeper account-context pass.
- RED/GREEN:
  - RED unit: `node scripts/profile_import_unit_test.mjs` failed on screenshot text with `false !== true`.
  - RED e2e: screenshot text import showed `Profile import failed. Check the link or JSON and try again.`
  - GREEN unit: screenshot text import now returns wallet/account defaults and `Imported screenshot text`.
  - GREEN e2e: screenshot text fills Base ATK `126424`, Final ATK `550220`, ATK `126`, crit `147/822`, skill damage `477`, chips `21`, relic cores `74`, awakening cores `26`, otherworld cores `2`, and remains editable.
- Verification:
  - `node scripts/profile_import_unit_test.mjs`: passed.
  - `node scripts/external_calculation_link_unit_test.mjs`: passed.
  - `npx tsc --noEmit`: passed.
  - `npx playwright test e2e/v3_tech_optimizer.spec.ts --project=chromium-desktop --grep "screenshot text"`: passed.
  - `npx playwright test e2e/v3_tech_optimizer.spec.ts`: passed, 77 passed / 1 skipped.
  - `npm run build`: passed, 22 static pages generated.
  - `SIO_FULL_EQUIVALENCE_REQUIRED=1 node scripts/sio_full_equivalence_gate.mjs`: passed with `fullSioEquivalent=true`, `currentScorer=scorer=sio_full_lm_equivalence`.
  - `git diff --check`: passed.

## Account Context Import Depth And Review UX

timestampKst: 2026-05-22T19:35:28+09:00
status: `[PRODUCT-IMPROVEMENT-GREEN]`

- Product behavior:
  - Tangtang screenshot/OCR text import now fills the previously recorded detailed account values:
    - shield damage increase `165%`
    - poisoned target damage increase `45%`
    - weakened target damage increase `195%`
    - chilled target damage increase `257.5%`
    - lacerated target damage increase `85%`
    - movement speed `13`
    - movement speed cap `16`
    - pet ATK `355274`
    - otherworld pet sync rate `42.5%`
  - Account context UI now exposes editable `Damage conditions` and `Movement and pet totals` sections.
  - The scoring context bridge maps only already-supported base stat keys: `shieldDamage`, `poisoned`, `weakened`, `chilled`, `laceration`, and `xenoSyncRate`. Movement speed and pet ATK are captured as editable product inputs only.
  - Calculation-link short-code resolution retries once before showing concise product error copy.
  - Import review now shows imported/review/missing counts and reminds users imported values remain editable.
  - Next-upgrade cards now show confidence and available-resource labels without exposing internal ids.
- RED/GREEN summary:
  - RED unit: `node scripts/profile_import_unit_test.mjs` failed with `undefined !== 165` for `shieldDamage`.
  - RED unit: `node scripts/tech_account_context_unit_test.mjs` failed with existing default `55 !== 165`.
  - RED e2e: `tech-account-shield-damage` was not found after screenshot import.
  - GREEN unit/e2e: screenshot detail values fill editable Tangtang account fields and the context bridge emits the expected supported base stats.
  - RED review e2e: `tech-profile-import-review` was not found.
  - GREEN review e2e: review panel shows `Imported 2`, `Review 1`, and `Editable after import`.
  - RED resolver unit: one failed short-link response threw `Calculation link could not be opened`.
  - GREEN resolver unit: one retry recovers the canonical raw payload.
  - RED recommendation e2e: recommendation cards lacked `Confidence`.
  - GREEN recommendation e2e: cards show confidence while still hiding internal ids.
- Verification:
  - `node scripts/profile_import_unit_test.mjs`: passed.
  - `node scripts/external_calculation_link_unit_test.mjs`: passed, `rawLength=1350`, `compactVersion=5`.
  - `node scripts/tech_account_context_unit_test.mjs`: passed.
  - `npx tsc --noEmit`: passed.
  - `npx playwright test e2e/v3_tech_optimizer.spec.ts`: passed, 77 passed / 1 skipped.
  - `npm run build`: passed, 22 static pages generated.
  - `SIO_FULL_EQUIVALENCE_REQUIRED=1 node scripts/sio_full_equivalence_gate.mjs`: passed with `fullSioEquivalent=true`, `currentScorer=scorer=sio_full_lm_equivalence`, G0/G1/G2/G3/G6=true.
  - `cargo test -p tttg_forge_optimizer --test tech_optimizer_performance -- --nocapture`: passed, 136/136.
  - `cargo test -p tttg_forge_wasm --test tech_parts_exports -- --nocapture`: passed, 9/9.
  - `wasm-pack build tttg_forge_wasm --target web --release -- --features compat-exports`: passed; only metadata/version warnings.
  - `git diff --check`: passed.
- Intentional constraints kept:
  - Public UI remains Tangtang.
  - No user-facing SIO copy was added.
  - `fullSioEquivalent=true` and `currentScorer=scorer=sio_full_lm_equivalence` remain green.
  - SIO LM/scoring core, Rust formula constants, and WASM scoring semantics were not changed.
  - Raw SIO LM JSON, scorer/debug/preselect/beam/exact node cap UI remain hidden.
  - Internal `sio*` rename remains deferred to Post-Launch Gate 7.

## Import Review Field Values And Clear UX

timestampKst: 2026-05-22T21:20:36+09:00
status: `[PRODUCT-IMPROVEMENT-GREEN]`

- Product behavior:
  - Tangtang import review now shows a compact field/value list after profile import, including values like `Final ATK 550220`, `Shield damage 165`, and `Otherworld pet sync 42.5`.
  - Review-only captured inputs such as pet ATK and movement speed are marked with `/ review`.
  - Import panel copy now explicitly says it accepts profile JSON, calculation links, or screenshot text.
  - `Clear import` clears the pasted import text and review panels while preserving already-applied editable account values.
- RED/GREEN summary:
  - RED unit: `buildProductImportFieldSummary` was missing from `profile-import.ts`.
  - GREEN unit: field summary contains product-facing labels/values and does not include `sio`.
  - RED e2e: `tech-profile-import-field-review` was not found after screenshot text import.
  - GREEN e2e: field review displays imported values on desktop/mobile.
  - RED copy e2e: import panel lacked `screenshot text`.
  - GREEN copy e2e: import panel advertises screenshot text input.
  - RED clear e2e: `Clear import` button was missing.
  - GREEN clear e2e: clear removes import text/review and keeps edited account values.
- Verification:
  - `node scripts/profile_import_unit_test.mjs`: passed.
  - `node scripts/external_calculation_link_unit_test.mjs`: passed, `rawLength=1350`, `compactVersion=5`.
  - `node scripts/tech_account_context_unit_test.mjs`: passed.
  - `npx tsc --noEmit`: passed.
  - `npx playwright test e2e/v3_tech_optimizer.spec.ts`: passed, 77 passed / 1 skipped.
  - `npm run build`: passed, 22 static pages generated.
  - `SIO_FULL_EQUIVALENCE_REQUIRED=1 node scripts/sio_full_equivalence_gate.mjs`: passed with `fullSioEquivalent=true`, `currentScorer=scorer=sio_full_lm_equivalence`, G0/G1/G2/G3/G6=true.
  - `cargo test -p tttg_forge_optimizer --test tech_optimizer_performance -- --nocapture`: passed, 136/136.
  - `cargo test -p tttg_forge_wasm --test tech_parts_exports -- --nocapture`: passed, 9/9.
  - `wasm-pack build tttg_forge_wasm --target web --release -- --features compat-exports`: passed; only metadata/version warnings.
  - `git diff --check`: passed.
- Intentional constraints kept:
  - Public UI remains Tangtang.
  - No user-facing SIO copy was added.
  - SIO LM/scoring core, Rust formula constants, and WASM scoring semantics were not changed.

## Imported Profile Run Shortcut And Account Summary

timestampKst: 2026-05-22T22:11:01+09:00
status: `[PRODUCT-IMPROVEMENT-GREEN]`

- Product behavior:
  - Tangtang import review now includes a `Run imported profile` action, so users can import a calculation link/profile/screenshot text and run the optimized calculation from the same panel.
  - The normal optimizer Run button and the imported-profile shortcut share the same unchanged run path.
  - Account context now has a compact summary rail showing final ATK, crit rate/damage, active damage-condition count, and review-only captured input count.
  - The summary updates after screenshot text import and keeps users oriented before they manually review or run.
- RED/GREEN summary:
  - RED e2e: imported calculation profile quick-run flow failed because `Run imported profile` did not exist.
  - GREEN e2e: shortcut runs the imported profile and shows `Next upgrades`.
  - RED e2e: screenshot text import lacked `tech-account-summary`.
  - GREEN e2e: account summary shows `Final ATK 550,220`, `Crit 147 / 822`, `Conditions 5`, and `Review 3`.
  - Regression RED: full TD-11 E2E exposed a strict locator collision for duplicate `Final ATK` labels.
  - Regression GREEN: vocabulary test now targets the editable field label while preserving the new summary label.
- Verification:
  - `node scripts/profile_import_unit_test.mjs`: passed.
  - `node scripts/external_calculation_link_unit_test.mjs`: passed, `rawLength=1350`, `compactVersion=5`.
  - `node scripts/tech_account_context_unit_test.mjs`: passed.
  - `npx tsc --noEmit`: passed.
  - `npx playwright test e2e/v3_tech_optimizer.spec.ts --grep "recalculates imported profile"`: passed, 2/2.
  - `npx playwright test e2e/v3_tech_optimizer.spec.ts --grep "imports in-game screenshot text"`: passed, 2/2.
  - `npx playwright test e2e/v3_tech_optimizer.spec.ts --grep "uses SIO product vocabulary"`: passed, 2/2 after locator fix.
  - `npx playwright test e2e/v3_tech_optimizer.spec.ts`: passed, 77 passed / 1 skipped.
  - `npm run build`: passed, 22 static pages generated.
  - `SIO_FULL_EQUIVALENCE_REQUIRED=1 node scripts/sio_full_equivalence_gate.mjs`: passed with `fullSioEquivalent=true`, `currentScorer=scorer=sio_full_lm_equivalence`, G0/G1/G2/G3/G6=true.
  - `cargo test -p tttg_forge_optimizer --test tech_optimizer_performance -- --nocapture`: passed, 136/136.
  - `cargo test -p tttg_forge_wasm --test tech_parts_exports -- --nocapture`: passed, 9/9.
  - `wasm-pack build tttg_forge_wasm --target web --release -- --features compat-exports`: passed; only metadata/version warnings.
- Intentional constraints kept:
  - Public UI remains Tangtang.
  - No user-facing SIO copy was added.
  - `fullSioEquivalent=true` and `currentScorer=scorer=sio_full_lm_equivalence` remain green.
  - SIO LM/scoring core, Rust formula constants, and WASM scoring semantics were not changed.
  - Raw SIO LM JSON, scorer/debug/preselect/beam/exact node cap UI remain hidden.
  - Internal `sio*` rename remains deferred to Post-Launch Gate 7.

## Tangtang Low-Impact Product Depth - Chunk 1

timestampKst: 2026-05-23T08:52:37+09:00
status: `[CHUNK-1-PET-ASSIST-XENO-GREEN]`

- Product behavior:
  - Deployed pet is filtered out of both assist selectors.
  - Assist 1 and Assist 2 cannot duplicate each other in the named controls.
  - Assist selection changes normalize the numeric assist count: Assist 1 -> `1`, Assist 2 -> `2`, clearing Assist 1 -> `0`, clearing Assist 2 -> `1`.
  - Pet xeno review row now shows `Xeno off`, `Xeno preview on`, or `Xeno resonance ready`.
- RED/GREEN summary:
  - RED unit: `node scripts/tech_account_context_unit_test.mjs` failed with `normalizePetAssistContext` missing (`undefined !== function`).
  - RED e2e: `npx playwright test e2e/v3_tech_optimizer.spec.ts --grep "keeps pet assist selections valid"` failed on desktop/mobile because `croaky` was still visible in assist options.
  - GREEN unit: pet assist normalization and xeno status helper assertions passed.
  - GREEN e2e: focused pet assist/xeno test passed on desktop/mobile, 2/2.
- Verification:
  - `node scripts/tech_account_context_unit_test.mjs`: passed.
  - `npx tsc --noEmit`: passed.
  - `npx playwright test e2e/v3_tech_optimizer.spec.ts --grep "keeps pet assist selections valid"`: passed, 2/2.
  - `npx playwright test e2e/v3_tech_optimizer.spec.ts`: passed, 79 passed / 1 skipped.
  - `npm run build`: passed, 22 static pages generated. Existing static export middleware/API-route warning only.
  - `git diff --check`: passed.
- Heavy verification:
  - Omitted. This chunk did not change `buildSioLmContext`, `playerStateWithAccountContext`, optimizer request fields, Rust formula constants, or WASM scoring semantics.
- Intentional constraints kept:
  - Public UI remains Tangtang.
  - No user-facing SIO copy was added.
  - `fullSioEquivalent=true` and `currentScorer=scorer=sio_full_lm_equivalence` remain covered by existing product gate assertions.
  - Raw SIO LM JSON, scorer/debug/preselect/beam/exact node cap UI remain hidden.
  - Internal `sio*` rename remains deferred to Post-Launch Gate 7.
- Artifacts:
  - `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/components/v3/tech/techAccountContext.ts`
  - `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/components/v3/tech/TechAccountContextPanel.tsx`
  - `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/scripts/tech_account_context_unit_test.mjs`
  - `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/e2e/v3_tech_optimizer.spec.ts`
  - `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/artifacts/td11/sio_product_flow_gap_audit.md`
- Commit:
  - Local commit created for this chunk; GitHub push/PR not performed.

## Tangtang Low-Impact Product Depth - Chunk 2

timestampKst: 2026-05-23T08:58:12+09:00
status: `[CHUNK-2-SURVIVOR-MEANING-GREEN]`

- Product behavior:
  - Teamwork select options now show semantic labels: none, starter, standard, advanced, full.
  - Passive crit select options now show product labels such as `No passive crit` and `Crit +24%`.
  - Survivor context summary row shows the selected survivor plus teamwork/passive meaning.
- RED/GREEN summary:
  - RED unit: `node scripts/tech_account_context_unit_test.mjs` failed because `formatTeamworkOptionLabel` was not a function.
  - RED e2e: `npx playwright test e2e/v3_tech_optimizer.spec.ts --grep "survivor teamwork and passive choices"` failed on desktop/mobile because `tech-teamwork-select` still rendered `0 slots`.
  - GREEN unit: teamwork/passive label helpers and survivor summary assertions passed.
  - GREEN e2e: focused survivor semantics test passed on desktop/mobile, 2/2.
- Verification:
  - `node scripts/tech_account_context_unit_test.mjs`: passed.
  - `npx tsc --noEmit`: passed.
  - `npx playwright test e2e/v3_tech_optimizer.spec.ts --grep "survivor teamwork and passive choices"`: passed, 2/2.
  - `npx playwright test e2e/v3_tech_optimizer.spec.ts`: passed, 81 passed / 1 skipped.
  - `npm run build`: passed, 22 static pages generated. Existing static export middleware/API-route warning only.
  - `git diff --check`: passed.
- Heavy verification:
  - Omitted. This chunk did not change `buildSioLmContext`, `playerStateWithAccountContext`, optimizer request fields, Rust formula constants, or WASM scoring semantics.
- Intentional constraints kept:
  - Public UI remains Tangtang.
  - No user-facing SIO copy was added.
  - Raw SIO LM JSON, scorer/debug/preselect/beam/exact node cap UI remain hidden.
  - Internal `sio*` rename remains deferred to Post-Launch Gate 7.
- Artifacts:
  - `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/components/v3/tech/techAccountContext.ts`
  - `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/components/v3/tech/TechAccountContextPanel.tsx`
  - `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/scripts/tech_account_context_unit_test.mjs`
  - `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/e2e/v3_tech_optimizer.spec.ts`
  - `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/artifacts/td11/sio_product_flow_gap_audit.md`
- Commit:
  - Local commit created for this chunk; GitHub push/PR not performed.

## Tangtang Low-Impact Product Depth - Chunk 3

timestampKst: 2026-05-23T09:03:23+09:00
status: `[CHUNK-3-COLLECTIBLE-ITEM-REVIEW-GREEN]`

- Product behavior:
  - Collections section now includes a compact per-item review editor.
  - First 12 collectible items are shown as review rows.
  - Clicking a row updates the existing target collectible field.
  - Rows are explicitly review/target markers only; no new scoring semantics were introduced.
- RED/GREEN summary:
  - RED e2e: `npx playwright test e2e/v3_tech_optimizer.spec.ts --grep "per-item collectible editor"` failed on desktop/mobile because `tech-collection-item-editor` did not exist.
  - RED unit: `node scripts/tech_account_context_unit_test.mjs` failed because `collectibleItemReviewMarker` was not a function.
  - GREEN unit: collectible review marker assertions passed.
  - GREEN e2e: focused collectible item editor test passed on desktop/mobile, 2/2.
- Verification:
  - `node scripts/tech_account_context_unit_test.mjs`: passed.
  - `npx tsc --noEmit`: passed.
  - `npx playwright test e2e/v3_tech_optimizer.spec.ts --grep "per-item collectible editor"`: passed, 2/2.
  - `npx playwright test e2e/v3_tech_optimizer.spec.ts`: passed, 83 passed / 1 skipped.
  - `npm run build`: passed, 22 static pages generated. Existing static export middleware/API-route warning only.
  - `git diff --check`: passed.
- Heavy verification:
  - Omitted. This chunk did not change `buildSioLmContext`, `playerStateWithAccountContext`, optimizer request fields, Rust formula constants, or WASM scoring semantics.
- Intentional constraints kept:
  - Public UI remains Tangtang.
  - No user-facing SIO copy was added.
  - Raw SIO LM JSON, scorer/debug/preselect/beam/exact node cap UI remain hidden.
  - Internal `sio*` rename remains deferred to Post-Launch Gate 7.
- Artifacts:
  - `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/components/v3/tech/TechAccountContextPanel.tsx`
  - `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/components/v3/tech/techAccountContext.ts`
  - `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/scripts/tech_account_context_unit_test.mjs`
  - `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/e2e/v3_tech_optimizer.spec.ts`
  - `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/artifacts/td11/sio_product_flow_gap_audit.md`
- Commit:
  - Local commit created for this chunk; GitHub push/PR not performed.

## Tangtang Low-Impact Product Depth - Chunk 4

timestampKst: 2026-05-23T09:07:50+09:00
status: `[CHUNK-4-MOUNT-PUZZLE-REVIEW-GREEN]`

- Product behavior:
  - Mount editor now shows a review summary with puzzle slots, mount cores, and review-only row status.
  - Selected mount remains the only state-changing mount selector.
  - Existing puzzle rows remain review-oriented and no new scoring semantics were introduced.
- RED/GREEN summary:
  - RED unit: `node scripts/tech_account_context_unit_test.mjs` failed because `mountReviewSummary` was not a function.
  - RED e2e: `npx playwright test e2e/v3_tech_optimizer.spec.ts --grep "mount puzzle review depth"` failed on desktop/mobile because `tech-mount-review-summary` did not exist.
  - GREEN unit: mount review summary helper assertion passed.
  - GREEN e2e: focused mount puzzle review test passed on desktop/mobile, 2/2.
- Verification:
  - `node scripts/tech_account_context_unit_test.mjs`: passed.
  - `npx tsc --noEmit`: passed.
  - `npx playwright test e2e/v3_tech_optimizer.spec.ts --grep "mount puzzle review depth"`: passed, 2/2.
  - `npx playwright test e2e/v3_tech_optimizer.spec.ts`: passed, 85 passed / 1 skipped.
  - `npm run build`: passed, 22 static pages generated. Existing static export middleware/API-route warning only.
  - `git diff --check`: passed.
- Heavy verification:
  - Omitted. This chunk did not change `buildSioLmContext`, `playerStateWithAccountContext`, optimizer request fields, Rust formula constants, or WASM scoring semantics.
- Intentional constraints kept:
  - Public UI remains Tangtang.
  - No user-facing SIO copy was added.
  - Raw SIO LM JSON, scorer/debug/preselect/beam/exact node cap UI remain hidden.
  - Internal `sio*` rename remains deferred to Post-Launch Gate 7.
- Artifacts:
  - `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/components/v3/tech/TechAccountContextPanel.tsx`
  - `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/components/v3/tech/techAccountContext.ts`
  - `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/scripts/tech_account_context_unit_test.mjs`
  - `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/e2e/v3_tech_optimizer.spec.ts`
  - `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/artifacts/td11/sio_product_flow_gap_audit.md`
- Commit:
  - Local commit created for this chunk; GitHub push/PR not performed.

## Tangtang Low-Impact Product Depth - Chunk 5

timestampKst: 2026-05-23T09:12:47+09:00
status: `[CHUNK-5-LME-TURF-PRESETS-GREEN]`

- Product behavior:
  - Lunar Mine section now includes compact turf node preset buttons for `0`, `3`, `6`, `9`, and `12` nodes.
  - Selecting a preset writes the existing `lmeTurf` numeric field.
  - `Turf nodes` remains the scoring-relevant aggregate; no grid or formula semantics were added.
- RED/GREEN summary:
  - RED unit: `node scripts/tech_account_context_unit_test.mjs` failed because `lmeTurfPresetLabel` was not a function.
  - RED e2e: `npx playwright test e2e/v3_tech_optimizer.spec.ts --grep "LME turf nodes"` failed on desktop/mobile because `tech-lme-turf-presets` did not exist.
  - GREEN unit: LME preset label assertions passed.
  - GREEN e2e: focused LME turf preset test passed on desktop/mobile, 2/2.
- Verification:
  - `node scripts/tech_account_context_unit_test.mjs`: passed.
  - `npx tsc --noEmit`: passed.
  - `npx playwright test e2e/v3_tech_optimizer.spec.ts --grep "LME turf nodes"`: passed, 2/2.
  - `npx playwright test e2e/v3_tech_optimizer.spec.ts`: passed, 87 passed / 1 skipped.
  - `npm run build`: passed, 22 static pages generated. Existing static export middleware/API-route warning only.
  - `git diff --check`: passed.
- Heavy verification:
  - Omitted. This chunk did not change `buildSioLmContext`, `playerStateWithAccountContext`, optimizer request fields, Rust formula constants, or WASM scoring semantics.
- Intentional constraints kept:
  - Public UI remains Tangtang.
  - No user-facing SIO copy was added.
  - Raw SIO LM JSON, scorer/debug/preselect/beam/exact node cap UI remain hidden.
  - Internal `sio*` rename remains deferred to Post-Launch Gate 7.
- Artifacts:
  - `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/components/v3/tech/TechAccountContextPanel.tsx`
  - `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/components/v3/tech/techAccountContext.ts`
  - `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/scripts/tech_account_context_unit_test.mjs`
  - `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/e2e/v3_tech_optimizer.spec.ts`
  - `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/artifacts/td11/sio_product_flow_gap_audit.md`
- Commit:
  - Local commit created for this chunk; GitHub push/PR not performed.

## Tangtang Low-Impact Product Depth - Final Verification

timestampKst: 2026-05-23T09:16:22+09:00
status: `[LOW-IMPACT-PRODUCT-DEPTH-FINAL-GREEN]`

- Chunks completed:
  - Chunk 1: Pet assist guardrails and xeno status.
  - Chunk 2: Survivor teamwork/passive semantic labels.
  - Chunk 3: Collectible per-item review editor.
  - Chunk 4: Mount puzzle review summary.
  - Chunk 5: LME turf compact presets.
  - Chunk 6: Small refactor gate reviewed; no extra refactor needed.
- RED/GREEN coverage:
  - Each product behavior chunk added a RED focused e2e and watched it fail before implementation.
  - Each chunk has related unit coverage in `tech_account_context_unit_test.mjs`.
  - Focused e2e checks passed after each implementation.
- Final verification:
  - `node scripts/profile_import_unit_test.mjs`: passed.
  - `node scripts/external_calculation_link_unit_test.mjs`: passed, `rawLength=1350`, `compactVersion=5`.
  - `node scripts/tech_account_context_unit_test.mjs`: passed.
  - `npx tsc --noEmit`: passed.
  - `npx playwright test e2e/v3_tech_optimizer.spec.ts`: passed, 87 passed / 1 skipped.
  - `npm run build`: passed, 22 static pages generated. Existing static export middleware/API-route warning only.
  - `git diff --check`: passed.
  - `git status -sb`: branch ahead of origin by 21; only the two untracked plan files remain.
- Heavy verification:
  - Omitted. The sprint only added product/UI/helper behavior and did not change `buildSioLmContext`, `playerStateWithAccountContext`, optimizer request fields, Rust formula constants, or WASM scoring semantics.
- Local commits:
  - `ea14c02 feat: stabilize Tangtang pet assist controls`
  - `e1f59fc feat: clarify Tangtang survivor controls`
  - `59ec97d feat: add Tangtang collectible item review`
  - `460bec3 feat: clarify Tangtang mount puzzle review`
  - `ae9ad83 feat: add Tangtang LME turf presets`
- Intentional constraints kept:
  - Public UI remains Tangtang.
  - No user-facing SIO copy was added.
  - `fullSioEquivalent=true` and `currentScorer=scorer=sio_full_lm_equivalence` remain asserted by the existing e2e product gate.
  - Raw SIO LM JSON, scorer/debug/preselect/beam/exact node cap UI remain hidden.
  - SIO LM/scoring core, Rust formula constants, and WASM scoring semantics were not changed.
  - Internal `sio*` rename remains deferred to Post-Launch Gate 7.
  - GitHub push/PR not performed.

## Tangtang Korean Locale UI Fix

timestampKst: 2026-05-23T09:49:47+09:00
status: `[KOREAN-LOCALE-UI-GREEN-LOCAL]`

- Product behavior:
  - `/ko/v3/optimizer/tech-parts` now renders the primary Tangtang tech optimizer surface in Korean.
  - Profile import, resource wallet, owned tech materials, account context, search, result, recommendation, and related review labels are locale-aware.
  - `/en/v3/optimizer/tech-parts` keeps the existing English copy and product tests.
  - The in-app browser was refreshed at `http://localhost:3032/ko/v3/optimizer/tech-parts`; visible checks found the Korean heading, profile import, wallet, inventory, and account context copy.
- RED/GREEN summary:
  - RED unit: `node scripts/tech_account_context_unit_test.mjs` failed because `techLocaleCopy.ts` did not exist.
  - RED e2e: `npx playwright test e2e/v3_tech_optimizer.spec.ts --grep "renders Korean product copy"` failed on desktop/mobile because `Tangtang / 테크 파츠` was not rendered.
  - GREEN unit: locale copy, resource wallet copy, and inventory validation copy assertions passed.
  - GREEN e2e: focused Korean route test passed on desktop/mobile, 2/2.
- Verification:
  - `node scripts/tech_account_context_unit_test.mjs`: passed.
  - `npx tsc --noEmit`: passed.
  - `npx playwright test e2e/v3_tech_optimizer.spec.ts --grep "renders Korean product copy"`: passed, 2/2.
  - `npx playwright test e2e/v3_tech_optimizer.spec.ts`: passed, 89 passed / 1 skipped.
  - `npm run build`: passed, 22 static pages generated. Existing static export middleware/API-route warning only.
  - `git diff --check`: passed.
- Heavy verification:
  - Omitted. This fix changed locale/UI copy only and did not change `buildSioLmContext`, `playerStateWithAccountContext`, optimizer request fields, Rust formula constants, or WASM scoring semantics.
- Intentional constraints kept:
  - Public UI remains Tangtang.
  - No user-facing SIO copy was added.
  - `fullSioEquivalent=true` and `currentScorer=scorer=sio_full_lm_equivalence` remain asserted by the existing e2e product gate.
  - Raw SIO LM JSON, scorer/debug/preselect/beam/exact node cap UI remain hidden.
  - SIO LM/scoring core, Rust formula constants, and WASM scoring semantics were not changed.
  - Internal `sio*` rename remains deferred to Post-Launch Gate 7.
  - GitHub push/PR not performed.
- Artifacts:
  - `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/components/v3/tech/techLocaleCopy.ts`
  - `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/components/v3/optimizer.tsx`
  - `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/components/v3/tech/TechProductPanels.tsx`
  - `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/components/v3/tech/TechAccountContextPanel.tsx`
  - `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/components/v3/tech/TechUpgradeRecommendations.tsx`
  - `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/components/v3/tech/techAccountContext.ts`
  - `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/scripts/tech_account_context_unit_test.mjs`
  - `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/e2e/v3_tech_optimizer.spec.ts`
  - `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/artifacts/td11/sio_product_flow_gap_audit.md`
- Commit:
  - Implementation commit: `9b8e8f2 feat: localize Tangtang Korean optimizer`.
  - GitHub push/PR not performed.

## Tangtang Vercel Short Code Import Fix

timestampKst: 2026-05-23T10:54:15+09:00
status: `[VERCEL-SHORT-CODE-IMPORT-GREEN]`

- Product behavior:
  - `https://tanggall.vercel.app/ko/v3/optimizer/tech-parts` now imports `https://sio-tools.vercel.app?code=rm8mHx` successfully.
  - The public UI still shows Tangtang Korean product copy and no user-facing SIO/debug/scorer copy was added.
- Root cause:
  - Production Vercel CSP had `connect-src 'self'`, so browser fetches to `https://is.gd/forward.php` were blocked before the short calculation code could expand.
- RED/GREEN summary:
  - RED repro: clean Playwright run on production showed summary `프로필을 가져오지 못했습니다...` and console CSP errors blocking `https://is.gd/forward.php?...`.
  - RED unit: `node scripts/vercel_config_unit_test.mjs` failed because `vercel.json` did not allow `https://is.gd` in `connect-src`.
  - GREEN implementation: `vercel.json` and `vercel.static.json` now keep `connect-src 'self'` and add `https://is.gd`.
  - GREEN production check: clean Playwright run on `https://tanggall.vercel.app/ko/v3/optimizer/tech-parts` imported the provided short-code link and showed `계산 링크 가져옴 / 계정 컨텍스트 가져옴 / 테크 인벤토리 가져옴`.
- Verification:
  - `node scripts/vercel_config_unit_test.mjs`: passed.
  - `node scripts/external_calculation_link_unit_test.mjs`: passed, `rawLength=1350`, `compactVersion=5`.
  - `npx playwright test e2e/v3_tech_optimizer.spec.ts --grep "mocked short calculation code"`: passed, 2/2.
  - `curl -I https://tanggall.vercel.app/ko/v3/optimizer/tech-parts`: 200 with `connect-src 'self' https://is.gd`.
  - `git diff --check`: passed.
- Deployment:
  - Production deployment: `https://tangtang-d7svolds2-aws0906-9092s-projects.vercel.app`.
  - Public alias: `https://tanggall.vercel.app`.
- Heavy verification:
  - Omitted. This changed only Vercel CSP configuration and a config unit test; scoring bridge, Rust formula constants, and WASM scoring semantics were not touched.
- Intentional constraints kept:
  - Public UI remains Tangtang.
  - Raw SIO LM JSON, scorer/debug/preselect/beam/exact node cap UI remain hidden.
  - SIO LM/scoring core, Rust formula constants, and WASM scoring semantics were not changed.
  - Internal `sio*` rename remains deferred to Post-Launch Gate 7.
  - GitHub push/PR not performed.
- Artifacts:
  - `/Users/woosung/Desktop/Dev/Projects/pareto/vercel.json`
  - `/Users/woosung/Desktop/Dev/Projects/pareto/vercel.static.json`
  - `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/scripts/vercel_config_unit_test.mjs`
  - `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/artifacts/td11/sio_product_flow_gap_audit.md`
- Commit:
  - Implementation commit: `b08d9ad chore: allow Tangtang short code imports`.
  - GitHub push/PR not performed.

## Tangtang Collection Upgrade Recommendations

timestampKst: 2026-05-23T11:17:38+09:00
status: `[COLLECTION-UPGRADE-RECOMMENDATIONS-GREEN-DEPLOYED]`

- Product behavior:
  - External calculation links now preserve imported collectible item star/custom-set context for recommendation use.
  - Running an imported profile now adds a collection upgrade card when collectible context is available.
  - Production check with `https://sio-tools.vercel.app?code=rm8mHx` on the Korean route showed `수집품: 가져옴 (76)` and `수집품 강화: Shuttle Capsule`.
  - Korean recommendation cards now localize both chip allocation and collection upgrade copy.
- RED/GREEN summary:
  - RED unit: `node scripts/tech_upgrade_recommendations_unit_test.mjs` failed because no `collection-item` recommendation existed.
  - RED e2e: `npx playwright test e2e/v3_tech_optimizer.spec.ts --grep "recalculates imported profile quickly"` failed because the next-upgrades panel did not contain collection/collectible recommendation copy.
  - GREEN unit: recommendation builder now emits a high-confidence collection item recommendation from imported custom-set/low-star context.
  - GREEN e2e: focused import-and-run recommendation test passed on desktop and mobile.
- Verification:
  - `node scripts/profile_import_unit_test.mjs`: passed.
  - `node scripts/external_calculation_link_unit_test.mjs`: passed, `rawLength=1350`, `compactVersion=5`.
  - `node scripts/tech_account_context_unit_test.mjs`: passed.
  - `node scripts/tech_upgrade_recommendations_unit_test.mjs`: passed.
  - `node scripts/vercel_config_unit_test.mjs`: passed.
  - `npx tsc --noEmit`: passed.
  - `npx playwright test e2e/v3_tech_optimizer.spec.ts`: passed, 89 passed / 1 skipped.
  - `npm run build`: passed, 22 static pages generated. Existing static export middleware/API-route warning only.
  - `git diff --check`: passed.
  - Production Playwright check on `https://tanggall.vercel.app/ko/v3/optimizer/tech-parts`: import/run succeeded, `HAS_KO_CHIP=true`, `HAS_COLLECTION=true`, `HAS_SIO_VISIBLE=false`.
- Deployment:
  - Production deployment: `https://tangtang-2am964h9g-aws0906-9092s-projects.vercel.app`.
  - Public alias: `https://tanggall.vercel.app`.
- Heavy verification:
  - Omitted. This changed profile import metadata, UI recommendation text, and tests only; scoring bridge, Rust formula constants, and WASM scoring semantics were not touched.
- Intentional constraints kept:
  - Public UI remains Tangtang.
  - No user-facing SIO copy was added.
  - Raw SIO LM JSON, scorer/debug/preselect/beam/exact node cap UI remain hidden.
  - SIO LM/scoring core, Rust formula constants, and WASM scoring semantics were not changed.
  - Internal `sio*` rename remains deferred to Post-Launch Gate 7.
  - GitHub push/PR not performed.
- Artifacts:
  - `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/app/lib/pareto-store/profile-import.ts`
  - `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/app/lib/pareto-store/external-calculation-profile.ts`
  - `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/app/lib/pareto-store/tech-upgrade-recommendations.ts`
  - `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/components/v3/optimizer.tsx`
  - `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/components/v3/tech/techLocaleCopy.ts`
  - `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/e2e/v3_tech_optimizer.spec.ts`
  - `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/scripts/external_calculation_link_unit_test.mjs`
  - `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/scripts/tech_upgrade_recommendations_unit_test.mjs`
  - `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/artifacts/td11/sio_product_flow_gap_audit.md`
- Commit:
  - Implementation commit: `d5dd30d feat: recommend Tangtang collection upgrades`.
  - GitHub push/PR not performed.

## Tangtang Import And Recommendation Structure Refactor

timestampKst: 2026-05-23T11:42:48+09:00
status: `[IMPORT-RECOMMENDATION-REFACTOR-GREEN]`

- Product behavior:
  - No intended user-facing behavior change.
  - Tangtang public branding and product recommendation output remain unchanged.
  - Collection upgrade recommendations still emit the same `collection-item` result for imported low-star/custom-set context.
- Structural changes:
  - Split profile import/snapshot types from `profile-import.ts` into `profile-import-types.ts`.
  - Split collectible recommendation candidate selection/copy from `tech-upgrade-recommendations.ts` into `collectible-upgrade-recommendations.ts`.
  - Moved recommendation shared type/input shape into `tech-upgrade-recommendation-types.ts`.
  - Removed the duplicated collectible name list from recommendation code and now uses `COLLECTIBLE_ITEM_INDEX`.
  - Kept `optimizer.tsx` behavior wiring intact except type import cleanup; extracting its import handler would add setter plumbing without reducing current risk.
- Baseline before refactor:
  - `node scripts/profile_import_unit_test.mjs`: passed.
  - `node scripts/external_calculation_link_unit_test.mjs`: passed, `rawLength=1350`, `compactVersion=5`.
  - `node scripts/tech_account_context_unit_test.mjs`: passed.
  - `node scripts/tech_upgrade_recommendations_unit_test.mjs`: passed.
  - `node scripts/vercel_config_unit_test.mjs`: passed.
  - `npx tsc --noEmit`: passed.
- Refactor verification:
  - Focused post-split check: profile import, external calculation link, tech recommendations, and `tsc --noEmit` passed.
  - `node scripts/profile_import_unit_test.mjs`: passed.
  - `node scripts/external_calculation_link_unit_test.mjs`: passed, `rawLength=1350`, `compactVersion=5`.
  - `node scripts/tech_account_context_unit_test.mjs`: passed.
  - `node scripts/tech_upgrade_recommendations_unit_test.mjs`: passed.
  - `node scripts/vercel_config_unit_test.mjs`: passed.
  - `npx tsc --noEmit`: passed.
  - `npx playwright test e2e/v3_tech_optimizer.spec.ts --grep "recalculates imported profile quickly"`: passed, 2/2.
  - `npx playwright test e2e/v3_tech_optimizer.spec.ts`: passed, 89 passed / 1 skipped.
  - `npm run build`: passed, 22 static pages generated. Existing static export middleware/API-route warning only.
  - `git diff --check`: passed.
- Heavy verification:
  - Omitted. This refactor did not change `buildSioLmContext`, `playerStateWithAccountContext`, optimizer request fields, Rust formula constants, or WASM scoring semantics.
- Intentional constraints kept:
  - Public UI remains Tangtang.
  - No user-facing SIO copy was added.
  - `fullSioEquivalent=true` and `currentScorer=scorer=sio_full_lm_equivalence` remain asserted by existing e2e product gates.
  - Raw SIO LM JSON, scorer/debug/preselect/beam/exact node cap UI remain hidden.
  - SIO LM/scoring core, Rust formula constants, and WASM scoring semantics were not changed.
  - Internal `sio*` rename remains deferred to Post-Launch Gate 7.
  - GitHub push/PR not performed.
- Artifacts:
  - `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/app/lib/pareto-store/profile-import-types.ts`
  - `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/app/lib/pareto-store/profile-import.ts`
  - `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/app/lib/pareto-store/external-calculation-profile.ts`
  - `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/app/lib/pareto-store/tech-upgrade-recommendation-types.ts`
  - `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/app/lib/pareto-store/tech-upgrade-recommendations.ts`
  - `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/app/lib/pareto-store/collectible-upgrade-recommendations.ts`
  - `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/components/v3/optimizer.tsx`
  - `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/components/v3/tech/TechProductPanels.tsx`
  - `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/components/v3/tech/TechUpgradeRecommendations.tsx`
  - `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/scripts/external_calculation_link_unit_test.mjs`
  - `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/scripts/tech_upgrade_recommendations_unit_test.mjs`
  - `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/artifacts/td11/sio_product_flow_gap_audit.md`
- Commit:
  - Implementation commit: `13f7012 refactor: split Tangtang import recommendations`.
  - GitHub push/PR not performed.

## Tangtang Damage Formula Source Audit

timestampKst: 2026-05-23T11:58:16+09:00
status: `[DAMAGE-FORMULA-SOURCE-AUDIT-GREEN-WITH-GAPS]`

### Scope

This audit checks whether the current Tangtang damage calculation surface is backed by SIO Tools source/captures, and separates that from the stronger claim that every in-game damage-increase description has been independently re-derived from game text.

No formula code, scoring code, WASM bridge, optimizer semantics, UI labels, or public product behavior were changed in this audit.

### Evidence Checked

- SIO Tools GT source:
  - `/Users/woosung/Desktop/Dev/Woosdom_Brain/01_Domains/시오툴/sio_tools_gt_master.md`
  - `/Users/woosung/Desktop/Dev/Woosdom_Brain/01_Domains/시오툴/sio_tools_formulas_and_defaults.md`
- Current equivalence gate:
  - `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/artifacts/td11/sio_lm_equivalence_matrix.json`
- Formula/scoring code:
  - `/Users/woosung/Desktop/Dev/Projects/pareto/tttg_forge_core/src/v3_damage.rs`
  - `/Users/woosung/Desktop/Dev/Projects/pareto/tttg_forge_core/src/constants.rs`
  - `/Users/woosung/Desktop/Dev/Projects/pareto/tttg_forge_core/src/aggregate/*.rs`
  - `/Users/woosung/Desktop/Dev/Projects/pareto/tttg_forge_optimizer/src/tech/sio_lm.rs`
  - `/Users/woosung/Desktop/Dev/Projects/pareto/tttg_forge_optimizer/src/tech/sio_lm/equipment_transform.rs`
  - `/Users/woosung/Desktop/Dev/Projects/pareto/tttg_forge_optimizer/src/tech/sio_config.rs`
  - `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/app/lib/pareto-store/schemas/index.ts`
  - `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/app/lib/pareto-store/playerState/sio_input_inventory.md`

### Overall Finding

- Current production scoring is still SIO-equivalent:
  - `fullSioEquivalent=true`
  - `currentScorer=scorer=sio_full_lm_equivalence`
  - SIO gate passed on 2026-05-23 with 26/26 live captured arbitrary compact cases and no account/equipment source residuals.
- The implementation is source-backed primarily by SIO Tools JS bundle extraction, SIO live UI/worker captures, and compact-profile replay.
- This is not the same as an independent in-game semantics proof. The repo does not yet contain a complete per-item ledger mapping:
  - in-game Korean/English description text,
  - SIO Tools source field/stat,
  - Tangtang schema field,
  - Rust multiplier stage,
  - fixture/live trace proving the mapping.

### Coverage Matrix

| Domain | SIO-backed implementation status | Gap / caution | Recommended improvement |
|---|---|---|---|
| Damage multiplier core | Implemented in Rust as 31 multiplier stages with `dps_formula_multiplier_stages_count=31`; source docs require the same 31-stage mirror. | This proves SIO-style multiplier staging, not independent game-text semantics. | Add a formula provenance ledger for every stat channel and multiplier stage. |
| SS equipment / weapon path | SIO default six-slot SS setup and 11 SS items are modeled; dynamic equipment transform and Rust SS conditionals exist. | Non-SS weapons in `WEAPON_SCHEMA_INDEX` such as Void Power, Sword of Disorder, Lightchaser, Kunai, Bat, Katana, Shotgun, Revolver are cataloged but not proven as full source-backed formulas. | Mark non-SS weapons as catalog/input-only until SIO/in-game fixture coverage exists, or add explicit source-backed formulas/tests. |
| Survivors / 특공대 | Corrected SIO default roster includes TMNT heroes April, Splinter, Raphael, Donatello; schema mirrors Donatello. SIO equivalence matrix marks survivors/passives/harmony/teamwork as implemented-live-covered. | SpongeBob, Squidward, and Yelena are explicitly absent from the corrected SIO default docs. Rust core conditionals directly handle only a small subset such as King/Taloxa/Venato/Worm-style CDR effects; broader survivor effects are trusted through SIO compact transform/replay, not generic aggregation. | Decide whether absent collab survivors are unsupported or require a fresh SIO/game source refresh. Add per-survivor description-to-stat fixtures before claiming complete in-game coverage. |
| Tech parts / 부품 | SIO tech modifier matrix is mirrored, including debuff coefficients such as Exo Bracer on SS Weapon / Lightning Mode. Tech CE damage/passive pools are reconstructed in the SIO LM path. | Good SIO coverage, but recommendation UI should not imply an in-game text audit beyond the SIO source. | Keep SIO equivalence tests as regression; add human-readable stat-channel mapping docs for each tech mode. |
| Pets / 이세계펫 / xeno | SIO pet list is mirrored in product schema: Rex, Croaky, Gary, Capy, Clucker, Puffo, Blizzblast, Nutjob, Gourmeow. Xeno pet damage and CDR interactions exist in compact source transforms. | Internal compact code still uses source names such as `King Blizzblast` while product schema displays `Blizzblast`; this may be intentional source compatibility but is a drift risk. Generic `aggregate/pet.rs` returns empty stats. | Add a source-name alias table test for `Blizzblast`/`King Blizzblast` and `Clucker`/`Crucker`. Avoid relying on generic aggregate pet path until implemented or explicitly deprecated. |
| Mounts / 탈것 | Compact mount rows can fold enabled mount stat lines with star multipliers, and the equivalence matrix marks `mounts` implemented-live-covered. | Existing matrix evidence still records that mount damage formulas were incomplete for live traces with empty `mounts:{}`; `ce_damage_static.mount` is set to 0. Generic mount formula coverage is therefore not independently strong. | Add targeted non-empty mount live captures and in-game text fixtures, especially for damage-bearing mount lines. |
| Collections / 컬렉션 | SIO 110+ collectible index, Event placeholders, and 38 set model are mirrored in schema; equipment collectible item/set bonuses are applied in the SIO LM equipment transform. | Generic `aggregate/collectible_set.rs` returns empty stats. Per-collectible/set in-game description mapping is not complete in repo docs. | Build collectible item/set provenance ledger and assert every product-recommended collectible has a source-backed stat/equipment effect path. |
| Generic aggregate modules | SIO LM production path reconstructs account/profile effects through compact transforms and live-backed replay. | `tttg_forge_core/src/aggregate/{hero,pet,tech,collectible_set}.rs` still return empty stats; any future path that bypasses SIO LM compact context can silently undercount. | Either implement the generic aggregators from the SIO ledger or hard-gate them as deprecated/non-authoritative for product scoring. |

### Important Interpretation

The current calculator appears to be a SIO Tools formula mirror, not a separately authored in-game formula engine. That is acceptable under the existing "SIO Tools 100% mirror" policy, and the current gate confirms the production scorer is aligned with that policy.

The main risk is language drift: product/user wording can sound like "all in-game damage descriptions are verified," while the actual proof is "SIO Tools live/compact scoring is mirrored." These are close in practice, but not identical.

### Verification Log

- `SIO_FULL_EQUIVALENCE_REQUIRED=1 node scripts/sio_full_equivalence_gate.mjs`: passed.
  - `fullSioEquivalent=true`
  - `currentScorer=scorer=sio_full_lm_equivalence`
  - `liveCaptureCount=26`
  - `workerParity.arbitraryGeneratedLiveExpected=26/26`
  - `G0/G1/G2/G3/G6=true`
- `SIO_LM_FORCE_G3_RECON=1 cargo test -p tttg_forge_optimizer --test tech_optimizer_performance sio_lm_g3_generated_cases_reconstruct_live_trace_without_profile_residuals -- --nocapture`: passed, 1/1. The test reported that replay was skipped because the fixture source is stale against current worker replay, so this is only a harness health check, not fresh replay evidence.

### Follow-up Recommendation

Do not change scoring formulas yet. The next safe step is a documentation/test gate:

1. Add `damage_formula_provenance_matrix.md` with one row per weapon/equipment, survivor, tech part, pet/xeno, mount, collectible item/set, and active multiplier stat.
2. For each row, record `in_game_description`, `sio_source_key`, `tangtang_schema_key`, `rust_stat_channel`, `multiplier_stage`, `fixture/live_capture`, and `confidence`.
3. Label confidence separately as `sio-live-equivalent`, `sio-source-only`, `catalog-only`, or `in-game-description-verified`.
4. Only after that ledger exists should Tangtang change formulas or claim complete in-game description coverage.

GitHub push/PR not performed.

## Tangtang Formula Correction Candidates Gate

timestampKst: 2026-05-23T21:42:32+09:00
status: `[TANGTANG-FORMULA-CORRECTION-CANDIDATES-GREEN]`

### Scope

Documented direct-description-derived Tangtang formula correction candidates for the repeated Genesis threshold mismatch. This pass does not change formula semantics, scoring core, Rust damage formulas, WASM scoring behavior, optimizer ranking, or product UI.

### Changes

- Added `frontend/artifacts/td11/tangtang_formula_correction_candidates.json`.
- Added `frontend/artifacts/td11/tangtang_formula_correction_candidates.md`.
- Added `frontend/scripts/tangtang_formula_correction_candidates_unit_test.mjs`.
- Updated `damage_formula_provenance_matrix.md` and its gate to reference the correction-candidate artifact.

### Current Candidate

- `collectible-set:genesis:gold:15:atkPercent`: current SIO/source/Rust threshold `gold >= 15`, direct Korean description captures show `gold >= 19`, value remains `atkPercent +4`.
- `collectible-set:genesis:red:15:atkPercent`: current SIO/source/Rust threshold `red >= 15`, direct Korean description captures show `red >= 19`, value remains `atkPercent +6`.
- Both candidates are threshold-only mismatches with repeated random-sample and targeted-follow-up direct capture artifacts.

### Decision

- Tangtang correction is documented but not applied.
- `correctionEligibleNow=false`.
- `canApplyTangtangFormulaCorrectionNow=false`.
- `directObservedDamageTrialCount=0`.
- `fullSioEquivalent=true` and `currentScorer=scorer=sio_full_lm_equivalence` remain unchanged.

### Verification Log

- `node scripts/tangtang_formula_correction_candidates_unit_test.mjs`: passed, 2 correction candidates.
- `node scripts/damage_formula_provenance_matrix_unit_test.mjs`: passed, 367 rows.
- `node scripts/tangtang_description_capture_import_unit_test.mjs`: passed, 12 capture rows.
- `node scripts/tangtang_random_capture_sample_audit_unit_test.mjs`: passed, 30 raw images and 3 imported rows.
- `node scripts/tangtang_targeted_capture_followup_audit_unit_test.mjs`: passed, 27 raw images and 2 reinforced rows.
- `node scripts/tangtang_in_game_damage_validation_unit_test.mjs`: passed, 9 trial groups and 0 direct trials.
- `node scripts/tangtang_damage_formula_spec_unit_test.mjs`: passed, 25 stages.
- `node scripts/tangtang_description_formula_validation_unit_test.mjs`: passed, 8 groups and 0 description formula rows.
- `node scripts/tangtang_first_party_description_source_inventory_unit_test.mjs`: passed, 8 source candidates.
- `node scripts/sio_tools_formula_source_evidence_unit_test.mjs`: passed, 4650 source leaves.
- `node scripts/in_game_description_evidence_unit_test.mjs`: passed, 6 rows.
- `node scripts/sio_tools_live_evidence_matrix_unit_test.mjs`: passed, 20 rows.
- `node scripts/sio_tools_targeted_live_evidence_unit_test.mjs`: passed, 5 rows.
- `node scripts/mount_damage_source_fixture_unit_test.mjs`: passed, 3 rows.
- `node scripts/collectible_effect_mapping_matrix_unit_test.mjs`: passed, 160 rows.
- `node scripts/generic_aggregate_non_authority_gate.mjs`: passed, 4 rows.
- `npx tsc --noEmit`: passed.
- `SIO_FULL_EQUIVALENCE_REQUIRED=1 node scripts/sio_full_equivalence_gate.mjs`: passed.
  - `fullSioEquivalent=true`
  - `currentScorer=scorer=sio_full_lm_equivalence`
  - `liveCaptureCount=26`
  - `workerParity.arbitraryGeneratedLiveExpected=26/26`
  - `G0/G1/G2/G3/G6=true`
- `git diff --check`: passed.

GitHub push/PR not performed.

## Tangtang Random Direct Capture Sample Audit

timestampKst: 2026-05-23 19:42:04 KST
status: `[TANGTANG-RANDOM-CAPTURE-SAMPLE-GREEN-WITH-GENESIS-DIVERGENCE]`

### Scope

Imported and audited the user-submitted 30-image random direct capture sample. This pass keeps the sample as partial first-party description evidence, maps only rows that correspond to the current 221-row formula atom ledger, and documents the resulting SIO/Tangtang comparison. It does not change formula semantics, scoring core, Rust damage formulas, WASM scoring behavior, optimizer ranking, or user-facing UI.

### Changes

- Added 30 raw capture artifacts under `frontend/artifacts/td11/captures/2026-05-23-random-sample/`.
- Added 3 direct first-party capture rows from the random sample to `tangtang_description_capture_inbox.json`.
- Added `frontend/scripts/tangtang_random_capture_sample_audit_unit_test.mjs`.
- Added `frontend/artifacts/td11/tangtang_random_capture_sample_audit.json`.
- Added `frontend/artifacts/td11/tangtang_random_capture_sample_audit.md`.
- Updated the capture import, first-party source inventory, formula spec, in-game validation gate, and provenance matrix to carry the new capture counts and divergence candidates.

### Findings

- Raw images submitted: `30`.
- Imported atom rows from this sample: `3`.
- Matched current SIO/Tangtang rows from this sample: `1`.
- Description/SIO divergence rows from this sample: `2`.
- Observed damage follow-up rows opened from this sample: `2`.
- Cumulative direct first-party capture rows: `12`.
- Cumulative matched SIO/Tangtang rows: `10`.
- Cumulative description/SIO divergence rows: `2`.
- Formula atom rows remaining without direct first-party description capture: `209`.
- The two divergence candidates are Genesis set threshold-condition rows:
  - `collectible-set:genesis:red:15:atkPercent`: screenshot shows `누적으로 19개의 빨간 별 획득`, while the current atom row is keyed as `red >= 15`.
  - `collectible-set:genesis:gold:15:atkPercent`: screenshot shows `누적으로 19개의 금 별 획득`, while the current atom row is keyed as `gold >= 15`.

### Caveats

- These screenshots are a useful random sample, not full formula coverage.
- The Genesis divergences are condition/threshold candidates only; no Tangtang formula correction is applied until follow-up confirmation and a correction spec exist.
- The game version/build is not visible in the submitted screenshots.
- Non-imported sample groups are preserved as raw direct evidence but remain outside the current 221-row atom ledger, including aggregate collectible stat screens, commander synchronization rows, SS equipment/divine forge rows, belt grade-skill text, and pet rows.
- Public/user-facing product behavior is unchanged.

### Verification Log

- `node scripts/tangtang_random_capture_sample_audit_unit_test.mjs`: passed, 30 raw images and 3 imported rows.
- `node scripts/tangtang_description_capture_import_unit_test.mjs`: passed, 12 capture rows.
- `node scripts/tangtang_first_party_description_source_inventory_unit_test.mjs`: passed, 8 source candidates.
- `node scripts/tangtang_description_formula_validation_unit_test.mjs`: passed, 8 groups and 0 description formula rows.
- `node scripts/tangtang_in_game_damage_validation_unit_test.mjs`: passed, 9 trial groups and 0 direct trials.
- `node scripts/tangtang_damage_formula_spec_unit_test.mjs`: passed, 25 stages.
- `node scripts/sio_tools_formula_source_evidence_unit_test.mjs`: passed, 4,650 source leaves.
- `node scripts/damage_formula_provenance_matrix_unit_test.mjs`: passed, 367 rows.
- `node scripts/in_game_description_evidence_unit_test.mjs`: passed, 6 rows.
- `node scripts/sio_tools_live_evidence_matrix_unit_test.mjs`: passed, 20 rows.
- `node scripts/sio_tools_targeted_live_evidence_unit_test.mjs`: passed, 5 rows.
- `node scripts/mount_damage_source_fixture_unit_test.mjs`: passed, 3 rows.
- `node scripts/collectible_effect_mapping_matrix_unit_test.mjs`: passed, 160 rows.
- `node scripts/generic_aggregate_non_authority_gate.mjs`: passed, 4 rows.
- `npx tsc --noEmit`: passed.
- `SIO_FULL_EQUIVALENCE_REQUIRED=1 node scripts/sio_full_equivalence_gate.mjs`: passed.
  - `fullSioEquivalent=true`
  - `currentScorer=scorer=sio_full_lm_equivalence`
  - `liveCaptureCount=26`
  - `workerParity.arbitraryGeneratedLiveExpected=26/26`
  - `G0/G1/G2/G3/G6=true`
- `git diff --check`: passed.

GitHub push/PR not performed.

## Tangtang Targeted Direct Capture Follow-Up Audit

timestampKst: 2026-05-23 20:24:00 KST
status: `[TANGTANG-TARGETED-CAPTURE-FOLLOWUP-GREEN]`

### Scope

Imported and audited the user-submitted 27-image targeted follow-up capture batch. This pass preserves the batch as direct first-party raw evidence, reinforces the existing Genesis threshold divergence candidates, and keeps non-ledger evidence isolated. It does not change formula semantics, scoring core, Rust damage formulas, WASM scoring behavior, optimizer ranking, or user-facing UI.

### Changes

- Added 27 raw capture artifacts under `frontend/artifacts/td11/captures/2026-05-23-targeted-followup/`.
- Added the targeted Genesis screenshots as additional raw artifacts on the existing Genesis capture rows in `tangtang_description_capture_inbox.json`.
- Added `frontend/scripts/tangtang_targeted_capture_followup_audit_unit_test.mjs`.
- Added `frontend/artifacts/td11/tangtang_targeted_capture_followup_audit.json`.
- Added `frontend/artifacts/td11/tangtang_targeted_capture_followup_audit.md`.
- Updated the capture import, random sample audit filtering, formula spec, first-party inventory, in-game validation gate, and provenance matrix to preserve the reinforced Genesis evidence.

### Findings

- Raw images submitted: `27`.
- Imported/reinforced atom rows from this batch: `2`.
- Matched current SIO/Tangtang rows from this batch: `0`.
- Description/SIO divergence rows from this batch: `2`.
- Reinforced existing atom rows from this batch: `2`.
- Observed damage follow-up rows opened from this batch: `2`.
- Cumulative direct first-party capture rows remain: `12`.
- Cumulative description/SIO divergence rows remain: `2`.
- The two reinforced divergence candidates are:
  - `collectible-set:genesis:red:15:atkPercent`: both random and targeted captures show `누적으로 19개의 빨간 별 획득`, while the current atom row is keyed as `red >= 15`.
  - `collectible-set:genesis:gold:15:atkPercent`: both random and targeted captures show `누적으로 19개의 금 별 획득`, while the current atom row is keyed as `gold >= 15`.

### Caveats

- These screenshots strengthen the Genesis threshold divergence candidates, but still do not justify changing Tangtang scoring without follow-up confirmation and a correction spec.
- Energy Guidance System, custom collection, Taloxia, collaboration battle, locked collectible, and Tech Hoverboard tooltip evidence is preserved as raw direct evidence, but remains outside the current 221-row description atom ledger.
- The game version/build is not visible in the submitted screenshots.
- Public/user-facing product behavior is unchanged.

### Verification Log

- `node scripts/tangtang_targeted_capture_followup_audit_unit_test.mjs`: passed, 27 raw images and 2 reinforced rows.
- `node scripts/tangtang_random_capture_sample_audit_unit_test.mjs`: passed, 30 raw images and 3 imported rows.
- `node scripts/tangtang_description_capture_import_unit_test.mjs`: passed, 12 capture rows.
- `node scripts/tangtang_first_party_description_source_inventory_unit_test.mjs`: passed, 8 source candidates.
- `node scripts/tangtang_description_formula_validation_unit_test.mjs`: passed, 8 groups and 0 description formula rows.
- `node scripts/tangtang_in_game_damage_validation_unit_test.mjs`: passed, 9 trial groups and 0 direct trials.
- `node scripts/tangtang_damage_formula_spec_unit_test.mjs`: passed, 25 stages.
- `node scripts/sio_tools_formula_source_evidence_unit_test.mjs`: passed, 4,650 source leaves.
- `node scripts/damage_formula_provenance_matrix_unit_test.mjs`: passed, 367 rows.
- `node scripts/in_game_description_evidence_unit_test.mjs`: passed, 6 rows.
- `node scripts/sio_tools_live_evidence_matrix_unit_test.mjs`: passed, 20 rows.
- `node scripts/sio_tools_targeted_live_evidence_unit_test.mjs`: passed, 5 rows.
- `node scripts/mount_damage_source_fixture_unit_test.mjs`: passed, 3 rows.
- `node scripts/collectible_effect_mapping_matrix_unit_test.mjs`: passed, 160 rows.
- `node scripts/generic_aggregate_non_authority_gate.mjs`: passed, 4 rows.
- `npx tsc --noEmit`: passed.
- `SIO_FULL_EQUIVALENCE_REQUIRED=1 node scripts/sio_full_equivalence_gate.mjs`: passed.
  - `fullSioEquivalent=true`
  - `currentScorer=scorer=sio_full_lm_equivalence`
  - `liveCaptureCount=26`
  - `workerParity.arbitraryGeneratedLiveExpected=26/26`
  - `G0/G1/G2/G3/G6=true`
- `git diff --check`: passed.

GitHub push/PR not performed.

## Tangtang Doomsteed Direct Description Capture Import

timestampKst: 2026-05-23 18:32:13 KST
status: `[TANGTANG-DOOMSTEED-DIRECT-CAPTURE-GREEN]`

### Scope

Imported the user-submitted Doomsteed mount screenshots as partial direct first-party description capture evidence. This pass documents how the visible Korean in-game description rows map to current SIO Tools-equivalent Tangtang handling. It does not change formula semantics, scoring core, Rust damage formulas, WASM scoring behavior, optimizer ranking, or user-facing UI.

### Changes

- Added four raw screenshot artifacts under `frontend/artifacts/td11/captures/`.
- Added 9 direct first-party Doomsteed description capture rows to `tangtang_description_capture_inbox.json`.
- Regenerated the capture import, first-party source inventory, formula spec, provenance matrix, and in-game validation gate artifacts.
- Kept the SpongeBob screenshot out of the imported formula rows because the visible tooltip does not correspond to the current SpongeBob formula atom rows.

### Findings

- Imported capture rows: 9.
- Parsed description formula rows: 9.
- Matched current SIO/Tangtang rows: 9.
- SIO/Tangtang divergence rows: 0.
- Observed damage follow-up rows opened: 0.
- Formula atom rows remaining without direct first-party description capture: 212.

### Caveats

- These screenshots provide partial direct first-party description capture evidence for Doomsteed only, not complete formula coverage.
- Game version/build is not visible in the submitted screenshots.
- The imported rows match current SIO Tools-equivalent Tangtang handling, so no formula correction is applied in this pass.
- SpongeBob/Squidward/Yelena still need direct first-party description captures for their current formula atom rows.
- Mounts still need broader exact per-line capture coverage beyond these Doomsteed rows.

### Verification Log

- `node scripts/tangtang_description_capture_import_unit_test.mjs`: passed, 9 capture rows.
- `node scripts/tangtang_first_party_description_source_inventory_unit_test.mjs`: passed, 8 source candidates.
- `node scripts/tangtang_description_formula_validation_unit_test.mjs`: passed, 8 groups and 0 description formula rows.
- `node scripts/tangtang_in_game_damage_validation_unit_test.mjs`: passed, 9 trial groups and 0 direct trials.
- `node scripts/tangtang_damage_formula_spec_unit_test.mjs`: passed, 25 stages.
- `node scripts/sio_tools_formula_source_evidence_unit_test.mjs`: passed, 4650 source leaves.
- `node scripts/damage_formula_provenance_matrix_unit_test.mjs`: passed, 367 rows.
- `node scripts/in_game_description_evidence_unit_test.mjs`: passed, 6 rows.
- `node scripts/sio_tools_live_evidence_matrix_unit_test.mjs`: passed, 20 rows.
- `node scripts/sio_tools_targeted_live_evidence_unit_test.mjs`: passed, 5 rows.
- `node scripts/mount_damage_source_fixture_unit_test.mjs`: passed, 3 rows.
- `node scripts/collectible_effect_mapping_matrix_unit_test.mjs`: passed, 160 rows.
- `node scripts/generic_aggregate_non_authority_gate.mjs`: passed, 4 rows.
- `npx tsc --noEmit`: passed.
- `SIO_FULL_EQUIVALENCE_REQUIRED=1 node scripts/sio_full_equivalence_gate.mjs`: passed.
  - `fullSioEquivalent=true`
  - `currentScorer=scorer=sio_full_lm_equivalence`
  - `liveCaptureCount=26`
  - `workerParity.arbitraryGeneratedLiveExpected=26/26`
  - `G0/G1/G2/G3/G6=true`
- `git diff --check`: passed.

GitHub push/PR not performed.

## Tangtang First-Party Description Source Inventory

timestampKst: 2026-05-23 18:11:25 KST
status: `[TANGTANG-FIRST-PARTY-DESCRIPTION-SOURCE-INVENTORY-GREEN]`

### Scope

Investigated the three first-party acquisition routes for item/effect description text: official/public Habby or platform pages, lawful app-resource/localization candidates, and direct in-game UI captures. This pass documents the source acquisition result and capture template only. It does not claim that SIO's formula is description-correct, does not apply Tangtang formula corrections, and does not change formula semantics, scoring core, Rust damage formulas, WASM scoring behavior, optimizer ranking, or product UI.

### Changes

- Added `frontend/scripts/tangtang_first_party_description_source_inventory_unit_test.mjs`.
- Added `frontend/artifacts/td11/tangtang_first_party_description_source_inventory.json`.
- Added `frontend/artifacts/td11/tangtang_first_party_description_source_inventory.md`.
- Updated `tangtang_description_capture_inbox.json` so `captureEvidenceTier` is a required field.
- Updated `tangtang_damage_formula_spec.json` / `.md` and `damage_formula_provenance_matrix.md` to reference the first-party source inventory gate.

### Findings

- Official/public source candidates checked: 8.
- Official/public sources with structured formula rows: 0.
- Official/public rows promoted to direct capture: 0.
- Local app resource artifacts found in the repo: 0.
- Formula atom rows still requiring direct description capture: 221.
- Direct first-party description-derived formula rows: 0.
- Public official web is not sufficient for formula validation.
- User one-by-one in-game captures remain the preferred direct first-party validation route unless lawful first-party app text resources are supplied.

### Caveats

- Official/public pages and announcements are release/existence provenance only unless they expose exact row-level original in-game description text.
- Third-party guides, wiki pages, Reddit, public mirrors, and source-derived rows remain corroboration or triage only.
- OCR is assistive only; raw screenshot/video/resource artifacts must be retained.
- App-resource extraction is only a candidate route when a lawful first-party app artifact is available and no DRM, auth, encryption, or protection bypass is involved.

### Verification Log

- `node scripts/tangtang_first_party_description_source_inventory_unit_test.mjs`: passed, 8 source candidates.
- `node scripts/tangtang_description_capture_import_unit_test.mjs`: passed, 0 capture rows.
- `node scripts/tangtang_description_formula_validation_unit_test.mjs`: passed, 8 groups and 0 description formula rows.
- `node scripts/tangtang_in_game_damage_validation_unit_test.mjs`: passed, 9 trial groups and 0 direct trials.
- `node scripts/tangtang_damage_formula_spec_unit_test.mjs`: passed, 25 stages.
- `node scripts/sio_tools_formula_source_evidence_unit_test.mjs`: passed, 4650 source leaves.
- `node scripts/damage_formula_provenance_matrix_unit_test.mjs`: passed, 367 rows.
- `node scripts/in_game_description_evidence_unit_test.mjs`: passed, 6 rows.
- `node scripts/sio_tools_live_evidence_matrix_unit_test.mjs`: passed, 20 rows.
- `node scripts/sio_tools_targeted_live_evidence_unit_test.mjs`: passed, 5 rows.
- `node scripts/mount_damage_source_fixture_unit_test.mjs`: passed, 3 rows.
- `node scripts/collectible_effect_mapping_matrix_unit_test.mjs`: passed, 160 rows.
- `node scripts/generic_aggregate_non_authority_gate.mjs`: passed, 4 rows.
- `npx tsc --noEmit`: passed.
- `SIO_FULL_EQUIVALENCE_REQUIRED=1 node scripts/sio_full_equivalence_gate.mjs`: passed.
  - `fullSioEquivalent=true`
  - `currentScorer=scorer=sio_full_lm_equivalence`
  - `liveCaptureCount=26`
  - `workerParity.arbitraryGeneratedLiveExpected=26/26`
  - `G0/G1/G2/G3/G6=true`
- `git diff --check`: passed.

GitHub push/PR not performed.

## Tangtang Damage Formula Derivation Spec

timestampKst: 2026-05-23T15:15:51+09:00
status: `[TANGTANG-DAMAGE-FORMULA-SPEC-GREEN]`

### Scope

Derived and documented a SIO Tools-equivalent Tangtang damage formula spec from current source/live evidence. This pass does not claim full direct first-party in-game text verification and does not change formula semantics, scoring core, Rust damage formulas, WASM scoring behavior, optimizer ranking, or user-facing UI.

### Changes

- Added `frontend/artifacts/td11/tangtang_damage_formula_spec.json`.
- Added `frontend/artifacts/td11/tangtang_damage_formula_spec.md`.
- Added `frontend/scripts/tangtang_damage_formula_spec_unit_test.mjs`.
- Updated `damage_formula_provenance_matrix.md` and its gate to reference the formula derivation spec.

### Caveats

- non-SS weapons remain catalog-only and unsupported as formula inputs.
- SpongeBob/Squidward/Yelena remain source/live backed but not direct first-party in-game description verified.
- Mounts remain source/live backed for `mountDamage`, but exact per-line in-game text capture is still missing.
- Collectible item/set mapping remains source/Rust backed, but item/set-level in-game description capture is still incomplete.
- Catalog-only collectible rows remain isolated.

### Verification Log

- `node scripts/tangtang_damage_formula_spec_unit_test.mjs`: passed, 25 stages.
- `node scripts/sio_tools_formula_source_evidence_unit_test.mjs`: passed, 4,650 source leaves.
- `node scripts/damage_formula_provenance_matrix_unit_test.mjs`: passed, 367 rows.
- `node scripts/in_game_description_evidence_unit_test.mjs`: passed, 6 rows.
- `node scripts/sio_tools_live_evidence_matrix_unit_test.mjs`: passed, 20 rows.
- `node scripts/sio_tools_targeted_live_evidence_unit_test.mjs`: passed, 5 rows.
- `node scripts/mount_damage_source_fixture_unit_test.mjs`: passed, 3 rows.
- `node scripts/collectible_effect_mapping_matrix_unit_test.mjs`: passed, 160 rows.
- `node scripts/generic_aggregate_non_authority_gate.mjs`: passed, 4 rows.
- `npx tsc --noEmit`: passed.
- `SIO_FULL_EQUIVALENCE_REQUIRED=1 node scripts/sio_full_equivalence_gate.mjs`: passed.
  - `fullSioEquivalent=true`
  - `currentScorer=scorer=sio_full_lm_equivalence`
  - `liveCaptureCount=26`
  - `workerParity.arbitraryGeneratedLiveExpected=26/26`
  - `G0/G1/G2/G3/G6=true`
- `git diff --check`: passed.

GitHub push/PR not performed.

## Tangtang Description Formula Validation Gate

timestampKst: 2026-05-23T16:04:54+09:00
status: `[TANGTANG-DESCRIPTION-FORMULA-VALIDATION-PROTOCOL-READY]`

### Scope

Added the primary validation gate for the user-corrected flow: capture item/effect in-game description text, derive formula operations from those descriptions, compare the derived formula against SIO Tools/Tangtang source-live behavior, and send only description-vs-SIO divergences to follow-up confirmation. This pass does not claim SIO's formula is description-correct, does not apply Tangtang formula corrections, and does not change formula semantics, scoring core, Rust damage formulas, WASM scoring behavior, optimizer ranking, or user-facing UI.

### Changes

- Added `frontend/artifacts/td11/tangtang_description_formula_validation_matrix.json`.
- Added `frontend/artifacts/td11/tangtang_description_formula_validation_protocol.md`.
- Added `frontend/scripts/tangtang_description_formula_validation_unit_test.mjs`.
- Updated `tangtang_damage_formula_spec.json` / `.md` and its gate to link the description-derived formula validation gate.
- Updated `damage_formula_provenance_matrix.md` and its gate to show description-derived validation as the primary next layer.
- Updated the observed-damage validation gate so it is follow-up confirmation only after a description-vs-SIO divergence exists.
- Expanded the description validation matrix from an empty protocol into a deterministic formula atom ledger.

### Current Decision

- Formula atom rows: `221`.
  - Mount atoms: `26`.
  - Target survivor atoms: `11`.
  - Collectible threshold atoms: `170`.
  - Collectible special Rust mapping atoms: `14`.
- Stage bucket taxonomy rows: `25`.
- Graph mode: `deterministic-atom-ledger-not-graphrag`.
- Direct first-party description-derived formula rows: `0`.
- Description/SIO divergence rows: `0`.
- Current description-derived formula correctness claim: `not-established`.
- Can claim SIO formula description-correct: `false`.
- Can apply Tangtang formula correction now: `false`.
- Observed damage validation is secondary confirmation, not the first validation layer.

### Caveats

- Public-web rows and SIO/source rows are triage/corroboration only; they do not count as direct first-party description-derived formula rows.
- non-SS weapons remain catalog-only and unsupported as formula inputs.
- SpongeBob/Squidward/Yelena remain source/live backed but not direct first-party in-game description verified.
- Mount exact per-line in-game text capture remains missing.
- Collectible item/set direct description capture remains incomplete.
- Catalog-only collectible rows remain isolated.

### Verification Log

- `node scripts/tangtang_description_formula_validation_unit_test.mjs`: passed, 8 groups and 0 description formula rows.
- `node scripts/tangtang_in_game_damage_validation_unit_test.mjs`: passed, 9 trial groups and 0 direct trials.
- `node scripts/tangtang_damage_formula_spec_unit_test.mjs`: passed, 25 stages.
- `node scripts/sio_tools_formula_source_evidence_unit_test.mjs`: passed, 4,650 source leaves.
- `node scripts/damage_formula_provenance_matrix_unit_test.mjs`: passed, 367 rows.
- `node scripts/in_game_description_evidence_unit_test.mjs`: passed, 6 rows.
- `node scripts/sio_tools_live_evidence_matrix_unit_test.mjs`: passed, 20 rows.
- `node scripts/sio_tools_targeted_live_evidence_unit_test.mjs`: passed, 5 rows.
- `node scripts/mount_damage_source_fixture_unit_test.mjs`: passed, 3 rows.
- `node scripts/collectible_effect_mapping_matrix_unit_test.mjs`: passed, 160 rows.
- `node scripts/generic_aggregate_non_authority_gate.mjs`: passed, 4 rows.
- `npx tsc --noEmit`: passed.
- `SIO_FULL_EQUIVALENCE_REQUIRED=1 node scripts/sio_full_equivalence_gate.mjs`: passed.
  - `fullSioEquivalent=true`
  - `currentScorer=scorer=sio_full_lm_equivalence`
  - `liveCaptureCount=26`
  - `workerParity.arbitraryGeneratedLiveExpected=26/26`
  - `G0/G1/G2/G3/G6=true`
- `git diff --check`: passed.

GitHub push/PR not performed.

## Tangtang Description Capture Import Gate

timestampKst: 2026-05-23T17:30:07+09:00
status: `[TANGTANG-DESCRIPTION-CAPTURE-IMPORT-GATE-READY]`

### Scope

Added the import gate that accepts direct first-party item/effect in-game description capture rows, maps them to the deterministic formula atom ledger, compares parsed formula fields against current SIO/Tangtang handling, and routes only description-vs-SIO divergences to observed-damage follow-up. This pass does not add any first-party captures, does not claim SIO's formula is description-correct, does not apply Tangtang formula corrections, and does not change formula semantics, scoring core, Rust damage formulas, WASM scoring behavior, optimizer ranking, or user-facing UI.

### Changes

- Added `frontend/artifacts/td11/tangtang_description_capture_inbox.json`.
- Added `frontend/artifacts/td11/tangtang_description_capture_import_matrix.json`.
- Added `frontend/artifacts/td11/tangtang_description_capture_import_protocol.md`.
- Added `frontend/scripts/tangtang_description_capture_import_unit_test.mjs`.
- Updated `tangtang_damage_formula_spec.json` / `.md` and `damage_formula_provenance_matrix.md` to reference the capture import gate.
- Updated the observed-damage validation gate to carry imported description divergence/follow-up counts.

### Current Decision

- Capture inbox rows: `0`.
- Parsed description formula rows: `0`.
- Matched SIO rows: `0`.
- Description/SIO divergence rows: `0`.
- Observed damage follow-up rows: `0`.
- Can run observed damage follow-up: `false`.
- Can apply Tangtang formula correction now: `false`.

### Caveats

- Only rows with `captureEvidenceTier=direct-first-party-description` and `sourceKind=direct-first-party-in-game` are eligible for import.
- Public-web, SIO source-derived, OCR-only-without-raw-artifact, translated-only-without-original, and manual-inference rows are rejected as first-party proof.
- Parsed formula fields must still be provided before a capture row can become a description-derived formula comparison row.
- Divergence only opens follow-up confirmation; it still does not directly change Tangtang scoring.

### Verification Log

- `node scripts/tangtang_description_capture_import_unit_test.mjs`: passed, 0 capture rows.
- `node scripts/tangtang_description_formula_validation_unit_test.mjs`: passed, 8 groups and 0 description formula rows.
- `node scripts/tangtang_in_game_damage_validation_unit_test.mjs`: passed, 9 trial groups and 0 direct trials.
- `node scripts/tangtang_damage_formula_spec_unit_test.mjs`: passed, 25 stages.
- `node scripts/sio_tools_formula_source_evidence_unit_test.mjs`: passed, 4,650 source leaves.
- `node scripts/damage_formula_provenance_matrix_unit_test.mjs`: passed, 367 rows.
- `node scripts/in_game_description_evidence_unit_test.mjs`: passed, 6 rows.
- `node scripts/sio_tools_live_evidence_matrix_unit_test.mjs`: passed, 20 rows.
- `node scripts/sio_tools_targeted_live_evidence_unit_test.mjs`: passed, 5 rows.
- `node scripts/mount_damage_source_fixture_unit_test.mjs`: passed, 3 rows.
- `node scripts/collectible_effect_mapping_matrix_unit_test.mjs`: passed, 160 rows.
- `node scripts/generic_aggregate_non_authority_gate.mjs`: passed, 4 rows.
- `npx tsc --noEmit`: passed.
- `SIO_FULL_EQUIVALENCE_REQUIRED=1 node scripts/sio_full_equivalence_gate.mjs`: passed.
  - `fullSioEquivalent=true`
  - `currentScorer=scorer=sio_full_lm_equivalence`
  - `liveCaptureCount=26`
  - `workerParity.arbitraryGeneratedLiveExpected=26/26`
  - `G0/G1/G2/G3/G6=true`
- `git diff --check`: passed.

GitHub push/PR not performed.

## Tangtang In-Game Damage Validation Gate

timestampKst: 2026-05-23T15:46:29+09:00
status: `[TANGTANG-IN-GAME-DAMAGE-VALIDATION-PROTOCOL-READY]`

### Scope

Added a separate protocol gate for direct observed-damage trials as follow-up confirmation only after item/effect description-derived formula validation finds a SIO/Tangtang divergence. This pass does not claim SIO's formula is proven correct against the game, does not apply Tangtang formula corrections, and does not change formula semantics, scoring core, Rust damage formulas, WASM scoring behavior, optimizer ranking, or user-facing UI.

### Changes

- Added `frontend/artifacts/td11/tangtang_in_game_damage_validation_matrix.json`.
- Added `frontend/artifacts/td11/tangtang_in_game_damage_validation_protocol.md`.
- Added `frontend/scripts/tangtang_in_game_damage_validation_unit_test.mjs`.
- Updated `tangtang_damage_formula_spec.json` / `.md` and its gate to link the observed-damage validation gate as follow-up only.
- Updated `damage_formula_provenance_matrix.md` and its gate to keep direct observed damage validation secondary to description-derived formula comparison.

### Current Decision

- Primary validation layer: `description-derived-formula-validation`.
- Observed damage validation layer: `follow-up-divergence-check-only`.
- Direct first-party description-derived formula rows: `0`.
- Description/SIO divergence rows: `0`.
- Direct observed in-game damage trials: `0`.
- Current in-game correctness claim: `not-established`.
- Can claim SIO formula in-game correct: `false`.
- Can apply Tangtang formula correction now: `false`.
- Can run observed damage follow-up without description divergence: `false`.
- Tangtang may improve beyond SIO only when repeated controlled direct in-game observations confirm a prior description-vs-SIO divergence.

### Trial Groups

- baseline attack aggregate.
- skillDamage stage/order.
- vulnerability and status uptime.
- boss damage.
- LME phase damage.
- mountDamage CE contribution.
- collectible thresholds.
- collaboration survivors.
- non-SS weapons.

### Verification Log

- `node scripts/tangtang_description_formula_validation_unit_test.mjs`: passed, 8 groups and 0 description formula rows.
- `node scripts/tangtang_in_game_damage_validation_unit_test.mjs`: passed, 9 trial groups and 0 direct trials.
- `node scripts/tangtang_damage_formula_spec_unit_test.mjs`: passed, 25 stages.
- `node scripts/sio_tools_formula_source_evidence_unit_test.mjs`: passed, 4,650 source leaves.
- `node scripts/damage_formula_provenance_matrix_unit_test.mjs`: passed, 367 rows.
- `node scripts/in_game_description_evidence_unit_test.mjs`: passed, 6 rows.
- `node scripts/sio_tools_live_evidence_matrix_unit_test.mjs`: passed, 20 rows.
- `node scripts/sio_tools_targeted_live_evidence_unit_test.mjs`: passed, 5 rows.
- `node scripts/mount_damage_source_fixture_unit_test.mjs`: passed, 3 rows.
- `node scripts/collectible_effect_mapping_matrix_unit_test.mjs`: passed, 160 rows.
- `node scripts/generic_aggregate_non_authority_gate.mjs`: passed, 4 rows.
- `npx tsc --noEmit`: passed.
- `SIO_FULL_EQUIVALENCE_REQUIRED=1 node scripts/sio_full_equivalence_gate.mjs`: passed.
  - `fullSioEquivalent=true`
  - `currentScorer=scorer=sio_full_lm_equivalence`
  - `liveCaptureCount=26`
  - `workerParity.arbitraryGeneratedLiveExpected=26/26`
  - `G0/G1/G2/G3/G6=true`
- `git diff --check`: passed.

GitHub push/PR not performed.

## Tangtang In-Game Description Evidence Pass

timestampKst: 2026-05-23T14:45:00+09:00
status: `[IN-GAME-DESCRIPTION-EVIDENCE-GREEN]`

### Scope

Collected the next layer of public-web/current-worker evidence for the high-risk survivor and mount rows. This pass is documentation and gate work only; it does not change formula semantics, SIO LM/scoring core, Rust damage formulas, WASM scoring behavior, optimizer ranking, or user-facing UI.

### Changes

- Added `frontend/artifacts/td11/in_game_description_evidence_matrix.json`.
  - Total rows: 6.
  - Survivor rows: Yelena, Squidward, SpongeBob.
  - Mount rows: Doomsteed, Electric Scooter, Tech Hoverboard.
  - Public sources used: 7.
  - Rows with any public stat claim: 3.
  - Rows with all current source claims publicly corroborated: 2 (`SpongeBob`, `Squidward`).
  - Partial public stat claim row: 1 (`Yelena`; level-120 ATK is corroborated, 10/12-star crit-damage and passive vulnerability rows remain source-table-only).
  - Mount exact in-game description rows: 0.
  - Mount exact line stats still source-only: 3.
  - Non-zero mountDamage live rows remain 2 (`Electric Scooter`, `Tech Hoverboard`).
- Added `frontend/scripts/in_game_description_evidence_unit_test.mjs`.
  - Generates and validates the evidence matrix.
  - Keeps public-web evidence separate from direct first-party in-game capture.
  - Keeps mount line stats source-only until exact in-game text/screenshot evidence is captured.
- Updated `damage_formula_provenance_matrix.md` and its gate to consume the new evidence matrix.
  - SpongeBob/Squidward now show `3/3` public-web corroboration for current source stat claims, but still require direct first-party capture before formula semantic changes.
  - Yelena shows `1/5` public-web corroboration and keeps missing star/passive rows explicit.
  - Mounts show public system/name evidence plus current source/live evidence, but exact per-line text remains `not-found-public-web`.

### Verification Log

- `node scripts/in_game_description_evidence_unit_test.mjs`: passed, 6 rows.
- `node scripts/damage_formula_provenance_matrix_unit_test.mjs`: passed, 367 rows.
- `node scripts/sio_tools_live_evidence_matrix_unit_test.mjs`: passed, 20 rows.
- `node scripts/sio_tools_targeted_live_evidence_unit_test.mjs`: passed, 5 rows.
- `node scripts/mount_damage_source_fixture_unit_test.mjs`: passed, 3 rows.
- `node scripts/collectible_effect_mapping_matrix_unit_test.mjs`: passed, 160 rows.
- `node scripts/generic_aggregate_non_authority_gate.mjs`: passed, 4 rows.
- `npx tsc --noEmit`: passed.
- `SIO_FULL_EQUIVALENCE_REQUIRED=1 node scripts/sio_full_equivalence_gate.mjs`: passed.
  - `fullSioEquivalent=true`
  - `currentScorer=scorer=sio_full_lm_equivalence`
  - `liveCaptureCount=26`
  - `workerParity.arbitraryGeneratedLiveExpected=26/26`
  - `G0/G1/G2/G3/G6=true`
- `git diff --check`: passed.

GitHub push/PR not performed.

## SIO Tools Formula Source Evidence Pass

timestampKst: 2026-05-23T14:58:00+09:00
status: `[SIO-TOOLS-FORMULA-SOURCE-EVIDENCE-GREEN]`

### Scope

Filled the remaining direct-capture backlog with source-derived SIO Tools evidence where available. This pass records the current SIO Tools source table cells and normalized Tangtang provenance mappings; it still does not claim first-party in-game text capture and does not change formula semantics, scoring core, Rust damage formulas, WASM scoring behavior, optimizer ranking, or user-facing UI.

### Changes

- Added `frontend/artifacts/td11/sio_tools_formula_source_evidence_matrix.json`.
  - Raw current SIO Tools stat leaves: 4,650.
  - Raw source leaves with direct multiplier stage mapping: 3,878.
  - Target survivor normalized claims: 11.
  - Target survivor raw cumulative cells: 13.
  - Mount normalized claims: 26.
  - Mount raw cumulative cells: 52.
  - Collectible threshold rows: 170.
  - Collectible raw threshold cells: 170.
  - Collectible special Rust mappings: 14.
  - Catalog-only collectible rows remain isolated: 46.
  - Non-zero mountDamage live rows: 2.
  - Target survivor live rows: 3.
- Added `frontend/scripts/sio_tools_formula_source_evidence_unit_test.mjs`.
  - Traverses `module37013_c_deployed_data_table.json` and records all numeric stat leaves whose keys are in `SIO_STATS_FIXED_ORDER`.
  - Distinguishes raw cumulative SIO Tools source cells from normalized formula evidence rows.
  - Links normalized source rows for target survivors, mounts, collectible thresholds, and collectible special Rust mappings.
  - Keeps all rows as `sio-tools-current-source-derived`, not `in-game-description-verified`.
- Updated `damage_formula_provenance_matrix.md` and its gate to consume the new source evidence.
  - DF-P3 now records both 26 normalized mount claims and 52 raw cumulative mount source cells.
  - DF-P4 now records 170 collectible source threshold cells and 14 special Rust mappings.
  - DF-P5 now records 11 normalized target-survivor claims and 13 raw cumulative target-survivor source cells.

### Verification Log

- RED: `node scripts/sio_tools_formula_source_evidence_unit_test.mjs` failed until `sio_tools_formula_source_evidence_matrix.json` was generated.
- GREEN:
  - `node scripts/sio_tools_formula_source_evidence_unit_test.mjs`: passed, 4,650 source leaves.
  - `node scripts/damage_formula_provenance_matrix_unit_test.mjs`: passed, 367 rows.
  - `node scripts/in_game_description_evidence_unit_test.mjs`: passed, 6 rows.
  - `node scripts/sio_tools_live_evidence_matrix_unit_test.mjs`: passed, 20 rows.
  - `node scripts/sio_tools_targeted_live_evidence_unit_test.mjs`: passed, 5 rows.
  - `node scripts/mount_damage_source_fixture_unit_test.mjs`: passed, 3 rows.
  - `node scripts/collectible_effect_mapping_matrix_unit_test.mjs`: passed, 160 rows.
  - `node scripts/generic_aggregate_non_authority_gate.mjs`: passed, 4 rows.
  - `npx tsc --noEmit`: passed.
  - `SIO_FULL_EQUIVALENCE_REQUIRED=1 node scripts/sio_full_equivalence_gate.mjs`: passed with `fullSioEquivalent=true`, `currentScorer=scorer=sio_full_lm_equivalence`, `liveCaptureCount=26`, `workerParity.arbitraryGeneratedLiveExpected=26/26`, and G0/G1/G2/G3/G6 all true.
  - `git diff --check`: passed.

GitHub push/PR not performed.

## SIO Tools Live Evidence Collection Pass

timestampKst: 2026-05-23T14:10:00+09:00
status: `[SIO-TOOLS-LIVE-EVIDENCE-MATRIX-GREEN]`

### Scope

Collected and structured evidence available from the local/public SIO Tools mirror, existing live worker captures, and extracted source tables. This pass is evidence/provenance only: no scoring formula, SIO LM core, Rust formula, WASM semantics, optimizer ranking, or user-facing UI changed.

### New Evidence Artifact

- `frontend/artifacts/td11/sio_tools_live_evidence_matrix.json`
  - Evidence rows: 15.
  - Existing arbitrary compact live captures: 26/26.
  - LM trace stage-product checks: 26/26.
  - Collectible live source-table cases: 7.
  - Collectible threshold rows linked: 170.
  - Mount live cases: 2.
  - Non-empty mount stat-line live rows: 1.
  - Empty mount component live rows: 1.
  - Non-zero `mountDamage` live rows: 0.
  - Non-zero `mountDamage` source rows: 2.
  - Target survivor source rows: 3.
  - Target survivor live rows: 0.
  - Source-proven compact mount active key: `bJ.bj`; mount data key: `bJ.bM`.

### Evidence Findings

- Collectibles now have stronger SIO Tools evidence:
  - source/Rust threshold rows remain in `collectible_effect_mapping_matrix.json`;
  - 7 existing SIO Tools live worker cases prove source-table/LM trace behavior for collectible/custom-set paths;
  - in-game description text remains not independently captured.
- Mounts are more precisely bounded:
  - one live case captures non-empty mount stat-line folding;
  - one live mount fixture traces an empty mount component;
  - active-mount key evidence shows the next live fixture should set `bJ.bj`, but existing fixtures do not;
  - non-zero `mountDamage` remains source-only, not live-equivalent.
- SpongeBob/Squidward/Yelena remain source-backed only:
  - broad survivor live coverage exists;
  - targeted live rows for these three are still 0.

### Matrix Update

- Updated `damage_formula_provenance_matrix.md` to reference the new evidence artifact.
- Follow-up gate slices now record:
  - DF-P3: `mountLineStatsLiveRows=1`, `nonZeroMountDamageLiveRows=0`, active key `bj`.
  - DF-P4: 170 collectible threshold rows plus 7 SIO Tools live source-table cases.
  - DF-P5: broad survivor live evidence exists, but target survivor live rows are still 0.

### Verification Log

- `node scripts/sio_tools_live_evidence_matrix_unit_test.mjs`: passed, 15 rows.
- `node scripts/damage_formula_provenance_matrix_unit_test.mjs`: passed, 367 rows.

GitHub push/PR not performed.

## Targeted Live Evidence Collection Pass

timestampKst: 2026-05-23T14:30:00+09:00
status: `[TARGETED-LIVE-EVIDENCE-GREEN]`

### Scope

Collected current public worker evidence for the previously bounded active-mount and target-survivor gaps. This pass is evidence/provenance only: no scoring formula, SIO LM core, Rust formula, WASM semantics, optimizer ranking, or user-facing UI changed.

### New Evidence Artifacts

- `frontend/artifacts/td11/targeted_live_evidence/compact_fixture_manifest.json`
- `frontend/artifacts/td11/targeted_live_evidence/live_capture_summary.json`
- `frontend/artifacts/td11/targeted_live_evidence/lm_trace_summary.json`
- `frontend/artifacts/td11/targeted_live_evidence/targeted_live_evidence_matrix.json`
- Updated roll-up: `frontend/artifacts/td11/sio_tools_live_evidence_matrix.json`

### Evidence Findings

- Current public skills worker captured 5/5 targeted cases.
  - Worker hash: `955cb880d975c11ea2c5f0da623444ab717bef8ac463a30395b9563c7df627d1`.
  - Targeted LM trace stage-product checks: 5/5.
- Active mount evidence is now live-captured:
  - `bJ.bj=1` Tech Hoverboard: base `mountDamage=50000`, live `ceDamage.mount=33333.33333333333`.
  - `bJ.bj=2` Electric Scooter: base `mountDamage=17710`, live `ceDamage.mount=11806.666666666666`.
  - Roll-up now records `activeMountLiveRows=2` and `nonZeroMountDamageLiveRows=2`.
- Target survivor evidence is now live-captured:
  - Yelena: `h[6]`, `a.c=7`.
  - Squidward: `h[17]`, `a.c=18`.
  - SpongeBob/Spongebob: `h[18]`, `a.c=19`.
  - Roll-up now records `targetSurvivorLiveRows=3`.
- Remaining gap is narrowed to direct in-game description capture; formula/scoring semantics were not changed.

### Matrix Update

- `damage_formula_provenance_matrix.md` moved to `DAMAGE-FORMULA-PROVENANCE-MATRIX-V1`.
- Confidence summary is now:
  - `sio-live-equivalent`: 160.
  - `sio-source-only`: 153.
  - `catalog-only`: 54.
- Follow-up gate slices now record:
  - DF-P3: active mount live evidence exists for two non-zero rows; in-game description capture remains missing.
  - DF-P5: target survivor live evidence exists for SpongeBob/Squidward/Yelena; in-game description capture remains missing.

### Verification Log

- `node scripts/sio_arbitrary_compact_live_capture_patch_unit_test.mjs`: passed.
- `node scripts/sio_tools_targeted_live_evidence_unit_test.mjs`: passed, 5 rows.
- `node scripts/sio_tools_live_evidence_matrix_unit_test.mjs`: passed, 20 rows.
- `node scripts/damage_formula_provenance_matrix_unit_test.mjs`: passed, 367 rows.

GitHub push/PR not performed.

## Damage Formula Provenance Follow-Up Gate Slices

timestampKst: 2026-05-23T13:10:00+09:00
status: `[DAMAGE-FORMULA-PROVENANCE-FOLLOWUP-GATES-GREEN]`

### Scope

Split the v0 damage formula provenance matrix into smaller high-risk follow-up gates and added one import-boundary alias regression. No formula, scoring core, Rust damage code, WASM scoring semantics, optimizer ranking semantics, or user-facing UI copy changed.

### Gate Slices Added

- `DF-P1`: pet alias regression for Blizzblast / King Blizzblast and Clucker / Crucker.
- `DF-P2`: non-SS weapons remain catalog-only and unsupported for formula input until fixture evidence exists.
- `DF-P3`: mount damage confidence cannot be promoted without a non-empty mount damage fixture.
- `DF-P4`: collectible item/set rows remain blocked on item/set description-to-stat-channel mapping.
- `DF-P5`: SpongeBob, Squidward, and Yelena remain unsupported until source refresh.
- `DF-P6`: Exo Bracer -> SS Weapon remains a visible `-0.025` debuff regression.
- `DF-P7`: generic aggregate paths remain non-authoritative for product scoring.

### Minimal Product Behavior Change

- Import normalization now maps source alias `King Blizzblast` to product pet id `blizzblast`.
- Existing `Clucker` / `Crucker` alias handling remains covered.
- Public product naming remains Tangtang, and product schema display names remain `Blizzblast` and `Clucker`.

### Verification Log

- RED: `node scripts/damage_formula_provenance_matrix_unit_test.mjs` failed until the follow-up gate slices were generated into the checked-in matrix.
- RED: `node scripts/v3_player_state_builder_test.mjs` failed because `King Blizzblast` imported as `king_blizzblast` instead of `blizzblast`.
- GREEN:
  - `node scripts/damage_formula_provenance_matrix_unit_test.mjs`: passed, 367 rows.
  - `node scripts/v3_player_state_builder_test.mjs`: passed, 23 checks.

GitHub push/PR not performed.

## Damage Formula Provenance Source Mapping Pass

timestampKst: 2026-05-23T13:35:00+09:00
status: `[DAMAGE-FORMULA-SOURCE-MAPPING-GREEN-WITH-LIVE-GAPS]`

### Scope

Continued from the v0 provenance matrix into concrete improvement gates. This pass did not change SIO LM scoring core, Rust damage formulas, WASM semantics, optimizer ranking semantics, or raw/debug UI exposure.

### Changes

- Reclassified SpongeBob, Squidward, and Yelena from unsupported rows to source-backed survivor schema rows.
  - Evidence is the extracted runtime table plus Rust compact survivor transform.
  - Confidence remains `sio-source-only`, not `sio-live-equivalent`, until targeted live and in-game description fixtures exist.
- Added a mount damage source fixture artifact:
  - `Doomsteed`: coefficient `0`, source-derived mountDamage stays zero.
  - `Electric Scooter`: coefficient `77`, star 8 source-derived mountDamage `17710`.
  - `Tech Hoverboard`: coefficient `100`, star 8 source-derived mountDamage `50000`.
  - This is still source-only; current live compact captures do not prove non-zero `ceDamage.mount`.
- Added a collectible effect mapping artifact with source key, Tangtang schema key, Rust channel/stage, confidence, and in-game description status.
  - Total rows: 160.
  - Source-backed named collectible items: 76.
  - Catalog-only named collectible items: 4 (`Libra Starlight`, `Scorpio Starlight`, `Sagittarius Starlight`, `Capricorn Starlight`).
  - Event placeholder rows: 42 catalog-only.
  - Collectible set rows: 38, with 35 having source thresholds.
  - Rows with special Rust equipment/tech mappings: 14.
- Updated the provenance matrix:
  - Total rows stay 367.
  - Confidence totals are now `sio-live-equivalent`: 155, `sio-source-only`: 158, `catalog-only`: 54.
  - No `unsupported-by-current-sio-source` rows remain in this matrix snapshot.

### Remaining Formula Gaps

- Non-SS weapons remain catalog-only. Current local evidence does not support promoting Void Power, Sword of Disorder, Lightchaser, Kunai, Baseball Bat, Katana, Shotgun, or Revolver to formula-backed rows.
- Mount `mountDamage` still needs a non-empty live capture before formula-completeness claims.
- Collectible item/set rows still need in-game description captures; this pass maps source/Rust channels but does not independently verify game text.
- Generic aggregate paths remain non-authoritative for product scoring.

### Verification Log

- `node scripts/mount_damage_source_fixture_unit_test.mjs`: passed, 3 rows.
- `node scripts/collectible_effect_mapping_matrix_unit_test.mjs`: passed, 160 rows.
- `node scripts/damage_formula_provenance_matrix_unit_test.mjs`: passed, 367 rows.
- `node scripts/v3_data_model_gt_test.mjs`: passed, 10 checks.
- `node scripts/v3_player_state_builder_test.mjs`: passed, 23 checks.
- `npx tsc --noEmit`: passed.
- `SIO_FULL_EQUIVALENCE_REQUIRED=1 node scripts/sio_full_equivalence_gate.mjs`: passed.
  - `fullSioEquivalent=true`
  - `currentScorer=scorer=sio_full_lm_equivalence`
  - `liveCaptureCount=26`
  - `workerParity.arbitraryGeneratedLiveExpected=26/26`
  - `G0/G1/G2/G3/G6=true`
- `git diff --check`: passed.

GitHub push/PR not performed.

## Damage Formula Provenance Remaining Local Gates

timestampKst: 2026-05-23T13:45:00+09:00
status: `[DAMAGE-FORMULA-LOCAL-GATES-GREEN]`

### Scope

Removed non-SS weapon fixture work from the active local backlog because those weapons are not used by the current product flow. Continued with the locally actionable gaps: collectible threshold mapping, catalog-only collectible isolation, and generic aggregate non-authority gating.

### Changes

- Expanded the collectible effect mapping artifact from entity rows only to entity rows plus threshold rows.
  - Entity rows: 160.
  - Threshold rows: 170.
  - Sample mapped rows now include `collectible-item:luckyCharm:stars:8:critRate` and `collectible-set:impressionIdols:red:20:skillDamage`.
  - In-game description status remains `not independently captured`; these are source-derived threshold rows, not independent game screenshots.
- Added `CATALOG_ONLY_COLLECTIBLE_ITEM_IDS` for the four named catalog-only Starlight rows.
- Updated collection upgrade recommendations so catalog-only named items and event slots are skipped as recommendation candidates.
  - This is a product-layer recommendation filter only; no scoring semantics changed.
- Added a dedicated generic aggregate non-authority gate artifact for:
  - `hero`
  - `pet`
  - `tech`
  - `collectible_set`
  - The gate records that production scoring authority remains the `sio_full_lm_equivalence` compact path.

### Remaining Live/External Gaps

- Mount `mountDamage` non-zero live capture still requires a live profile/capture that activates a damage-bearing mount.
- SpongeBob/Squidward/Yelena source support is local, but live-equivalent promotion still needs targeted live fixtures and game-description capture.
- Collectible threshold rows are source-derived; independent in-game description screenshots/text remain future evidence.

### Verification Log

- `node scripts/collectible_effect_mapping_matrix_unit_test.mjs`: passed, 160 entity rows and 170 threshold rows.
- `node scripts/generic_aggregate_non_authority_gate.mjs`: passed, 4 rows.
- `node scripts/damage_formula_provenance_matrix_unit_test.mjs`: passed, 367 rows.
- `node scripts/tech_upgrade_recommendations_unit_test.mjs`: passed.
- `node scripts/v3_data_model_gt_test.mjs`: passed, 10 checks.
- `node scripts/external_calculation_link_unit_test.mjs`: passed, `rawLength=1350`, `compactVersion=5`.
- `node scripts/v3_player_state_builder_test.mjs`: passed, 23 checks.
- `node scripts/mount_damage_source_fixture_unit_test.mjs`: passed, 3 rows.
- `npx tsc --noEmit`: passed.
- `SIO_FULL_EQUIVALENCE_REQUIRED=1 node scripts/sio_full_equivalence_gate.mjs`: passed.
  - `fullSioEquivalent=true`
  - `currentScorer=scorer=sio_full_lm_equivalence`
  - `liveCaptureCount=26`
  - `workerParity.arbitraryGeneratedLiveExpected=26/26`
  - `G0/G1/G2/G3/G6=true`
- `git diff --check`: passed.

GitHub push/PR not performed.

## Tangtang Damage Formula Provenance Matrix Gate

timestampKst: 2026-05-23T12:20:00+09:00
status: `[DAMAGE-FORMULA-PROVENANCE-MATRIX-GREEN]`

### Scope

Built the first coverage/provenance gate requested by the damage formula source audit. This is documentation and validation only; no formula, scoring, optimizer, WASM, or UI behavior changed.

### New Artifact

- `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/artifacts/td11/damage_formula_provenance_matrix.md`
  - Total rows: 367
  - Domains:
    - collectible event slots: 42
    - collectible items: 80
    - collectible sets: 38
    - mounts: 3
    - pets/xeno: 9
    - SS equipment: 11
    - stat channels: 71
    - survivors: 15
    - unsupported survivors: 3
    - tech modifier edges: 37
    - tech parts: 40
    - weapons: 9
    - xeno triggers: 9
  - Confidence totals:
    - `sio-live-equivalent`: 155
    - `sio-source-only`: 159
    - `catalog-only`: 50
    - `unsupported-by-current-sio-source`: 3

### New Verification Gate

- `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/scripts/damage_formula_provenance_matrix_unit_test.mjs`
  - Transpiles `schemas/index.ts`.
  - Generates the expected matrix from the current schema constants.
  - Validates the checked-in matrix is byte-for-byte current.
  - Fails if a schema row is added without the provenance matrix being regenerated.

### High-Risk Rows Now Explicit

- `survivor:donatello` exists and is `sio-live-equivalent`.
- `survivor-unsupported:spongebob`, `survivor-unsupported:squidward`, and `survivor-unsupported:yelena` are explicitly marked `unsupported-by-current-sio-source`.
- `weapon:voidPower`, `weapon:swordOfDisorder`, `weapon:lightchaser`, and other non-SS weapons are `catalog-only`.
- `mount:*` rows are `sio-source-only` and explicitly require non-empty mount live captures.
- `stat:mountDamage` is `sio-source-only` and not mapped to a direct 31-stage multiplier slot.
- `tech-modifier:exoBracer->ssWeapon` records the negative SIO coefficient `-0.025`.

### Verification Log

- `node scripts/damage_formula_provenance_matrix_unit_test.mjs --write`: wrote 367-row matrix.
- `node scripts/damage_formula_provenance_matrix_unit_test.mjs`: passed, 367 rows.

GitHub push/PR not performed.
