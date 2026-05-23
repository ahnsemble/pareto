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
