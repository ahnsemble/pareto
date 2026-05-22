# Tangtang Naming Migration Audit

Date: 2026-05-22
Status: `[SPRINT-0.2-TANGTANG-PUBLIC-NAMING-GREEN]`

## Scope

Early public naming pass completed for user-facing brand surfaces:

- Product route headings now use `Tangtang`.
- Public metadata, manifest, community copy, optimize copy, V3 hub copy, and tech optimizer route copy no longer use `Pareto` as the product name.
- User-facing frontier wording now uses `efficient frontier` / `효율 프론티어`.
- User-facing `SIO` wording remains hidden from product routes.
- Internal source/equivalence identifiers remain unchanged for Gate 1-6.

## RED / GREEN Evidence

- RED:
  - `npx playwright test e2e/v3_tech_optimizer.spec.ts --project=chromium-desktop --grep "Tangtang public branding"`
  - Failed because `Tangtang` was not visible on `/en/v3/optimizer/tech-parts`.
- GREEN:
  - `npx playwright test e2e/v3_tech_optimizer.spec.ts --project=chromium-desktop --grep "Tangtang public branding"`: passed, 1/1.
  - `npx tsc --noEmit`: passed.

## Public Leakage Scans

Plan-level broad scan:

```bash
rg -n "Pareto|SIO" frontend/components frontend/app frontend/e2e frontend/artifacts/td11 --glob '!frontend/artifacts/td11/sio_*' --glob '!frontend/artifacts/td11/**/sio-*'
```

Result: remaining hits are internal identifiers, private/test evidence, historic artifacts, or false positives such as `NRBA_SESSION`.

Focused runtime string-literal scan:

```bash
rg -n "['\"][^'\"]*(Pareto|SIO|sIO|파레토)[^'\"]*['\"]" frontend/app frontend/components frontend/messages frontend/public --glob '*.{tsx,ts,json}' --glob '!frontend/app/lib/**'
```

Result: no public visible copy hit remains. Remaining hits are:

- `ParetoFrontierChart` component/module name.
- `modePareto` / `pareto` internal i18n and overlay mode keys, whose visible labels are now `Efficient Frontier` / `효율 프론티어`.
- `pf` share-query key.

## Allowed Internal Terms During Gate 1-6

Do not rename these until Post-Launch Gate 7:

- `fullSioEquivalent`
- `sio_full_lm_equivalence`
- `sioLm`
- `SioTechInventoryInput`
- `sioTranslator`
- `SIO_RARITY_FIELDS`, `SIO_MODE_CHOICES`, and related tech optimizer input constants
- `SIO_INPUT_CATEGORIES`, `SIO_INPUT_FIELD_SPECS`, `DEFAULT_SIO_PLAYER_STATE`
- `sio_*` scripts, fixtures, artifacts, and private parity/provenance ledgers

## Deferred Post-Launch Gate 7

Internal source-reference rename remains deferred. It must use a reviewed naming map, RED/GREEN tests, and the full equivalence gate rather than a blind global replace.

## Calculation Link Import Error/Copy Hardening

Date: 2026-05-22
Status: `[CALCULATION-LINK-ERROR-COPY-GREEN]`

- Added focused bad-link UI coverage for `is.gd` failures.
- Public failure copy remains concise:
  - `Profile import failed. Check the link or JSON and try again.`
- The UI summary does not surface stack traces, codec names, compression details, or internal source identifiers.
- Focused scan:

```bash
rg -n "SIO|sioLm|sio_full_lm_equivalence|energyGuidanceSystem|droneMode" frontend/components frontend/app frontend/e2e --glob '!frontend/app/lib/pareto-store/playerState/sioTranslator.ts'
```

Result: remaining hits are internal constants, hidden data-attribute assertions, test guard text, source fixture/capture files, or raw id allowlist checks. No calculation-link import/recommendation visible copy exposes internal source terms.
