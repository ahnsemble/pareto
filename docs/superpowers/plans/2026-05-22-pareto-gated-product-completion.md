# Tangtang Gated Product Completion Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the remaining Tangtang product gaps in small gated sprints without breaking `fullSioEquivalent=true` or `sio_full_lm_equivalence`.

**Architecture:** The public product brand is Tangtang. Keep the SIO LM/scoring core stable and work only in product layers unless a RED test proves a translator/core boundary bug. Remove source-specific wording from user-facing surfaces early, but defer full internal `sio*` identifier/script/artifact rename to a separate post-launch hardening gate so equivalence evidence is not destabilized mid-build.

**Tech Stack:** Next.js/React frontend, Zustand Pareto store, TypeScript translators, Playwright e2e, Rust optimizer/WASM exports, internal source-parity artifact/capture scripts under `frontend/scripts`.

---

## Baseline Invariants

Do not start any sprint until these are true in the current worktree:

- `fullSioEquivalent=true`
- `currentScorer=scorer=sio_full_lm_equivalence`
- SIO LM/debug/preselect/beam/exact node cap UI remains hidden.
- After Sprint 0.2, visible product branding on product routes says `Tangtang`, not `Pareto`.
- After Sprint 0.2, user-facing UI copy does not show `SIO`; internal gate/scorer identifiers may still contain `sio` until the post-launch rename gate.
- Result raw ids remain hidden from visible text and, if needed, only appear in `data-*` attributes.
- Existing dirty worktree changes not owned by the current sprint are not reverted.

## Naming And Source-Reference Policy

Treat naming as two separate work streams:

1. **Early public naming pass**: rename user-facing brand and copy now.
   - `Pareto` visible product brand becomes `Tangtang`.
   - Visible `SIO` wording becomes product-neutral wording such as `Tangtang profile`, `imported profile`, `reference parity`, or `external reference` depending on context.
   - UI, public route headings, import summaries, validation copy, and product-facing docs must not expose `SIO`.
   - Keep internal `sio_full_lm_equivalence`, `fullSioEquivalent`, `sioLm`, `SioTechInventoryInput`, `sioTranslator`, and `sio_*` scripts untouched during Gate 1~6 unless a test proves a user-facing leak.

2. **Deferred post-launch internal rename**: rename internal source-derived identifiers in an isolated branch after product gates are green.
   - The goal is to remove obvious source-specific names from runtime bundles, public artifacts, public docs, generated screenshots, and shipped code paths.
   - Do not erase private audit/provenance notes that are needed for legal, debugging, or reproducibility. Keep those in a non-public internal ledger if required.
   - Do not do a blind global string replacement. Use a tested naming map and run full equivalence gates after each sub-slice.

Suggested public names:

| Current visible wording | Early public replacement |
|---|---|
| Pareto | Tangtang |
| SIO LM context | Hidden; if needed in docs: Tangtang profile context |
| SIO profile/import | Tangtang profile/imported profile |
| SIO parity | Reference parity |
| SIO Tools | External reference tool, only in private audit docs |

Suggested deferred internal names must be chosen in the post-launch gate from a neutral naming map. Examples: `sioLm` -> `lambdaContext`, `SioTechInventoryInput` -> `TechInventoryContract`, `sioTranslator` -> `profileTranslator`, `sio_full_lm_equivalence` -> `lambda_full_equivalence`. The exact map must be reviewed before execution because these names touch gate scripts and Rust/WASM exports.

## File Map

- Modify: `frontend/app/[locale]/v3/page.tsx`
  - Product hub visible brand copy; early rename `Pareto` -> `Tangtang` where user-facing.
- Modify: `frontend/components/v3/optimizer.tsx`
  - Current Tangtang product surface for tech optimizer, account context, wallet, import, and results.
- Modify: `frontend/components/v3/index.tsx`
  - Product route shell and visible brand copy if present.
- Modify/Create: `frontend/components/v3/tech/techResultPresenter.ts`
  - Human display names for tech result rows and import summaries.
- Create: `frontend/components/v3/tech/profileImport.ts`
  - UI-local profile paste parsing and normalized import summary.
- Create: `frontend/app/lib/pareto-store/profile-import.ts`
  - Product-level parser/normalizer that maps compact/profile payloads to wallet, tech inventory, and account context fields.
- Modify: `frontend/app/lib/pareto-store/playerState/sioTranslator.ts`
  - Existing SIO export translator; only extend with tested aliases.
- Modify: `frontend/app/lib/pareto-store/resource-wallet.ts`
  - Wallet field taxonomy and normalizer.
- Modify: `frontend/app/lib/pareto-store/types/index.ts`
  - Add typed product profile/import contracts if needed.
- Modify: `frontend/app/lib/pareto-store/selectors/index.ts`
  - Only if imported product fields must be projected into `PlayerState` outside `optimizer.tsx`.
- Modify: `frontend/app/lib/wasm.ts`
  - Type additions only; do not change scoring semantics.
- Modify: `frontend/app/lib/wasm-worker.ts`
  - Preserve stable worker API and hidden `sioLm` path.
- Test: `frontend/e2e/v3_tech_optimizer.spec.ts`
  - Gate-level user flow tests across desktop/mobile.
- Test/Create: `frontend/app/lib/pareto-store/__tests__/profile-import.test.ts`
  - Fast translator/parser unit tests if the project test runner exists; otherwise add a focused script under `frontend/scripts/`.
- Test: `tttg_forge_wasm/tests/tech_parts_exports.rs`
  - Only if WASM input/export contract changes.
- Test: `tttg_forge_optimizer/tests/tech_optimizer_performance.rs`
  - Only if optimizer translator/profile behavior changes.
- Audit: `frontend/artifacts/td11/sio_product_flow_gap_audit.md`
  - Update after every gate.
- Audit/Create later: `frontend/artifacts/td11/naming_migration_audit.md`
  - Track early public rename and deferred internal rename leakage scans.
- Record: `/Users/woosung/Desktop/Dev/Woosdom_Brain/00_System/Templates/from_codex.md`
  - Append final gate result and verification evidence.

## Gate 0: Baseline Lock

**Purpose:** Establish a fresh known-good point before changing product flows.

### Sprint 0.1: Fresh Baseline Verification

**Files:**
- Read: `frontend/artifacts/td11/sio_product_flow_gap_audit.md`
- Read: `/Users/woosung/Desktop/Dev/Woosdom_Brain/00_System/Templates/from_codex.md`

- [ ] **Step 1: Run frontend typecheck**

```bash
cd /Users/woosung/Desktop/Dev/Projects/pareto/frontend
npx tsc --noEmit
```

Expected: exit 0.

- [ ] **Step 2: Run current tech optimizer e2e**

```bash
cd /Users/woosung/Desktop/Dev/Projects/pareto/frontend
npx playwright test e2e/v3_tech_optimizer.spec.ts
```

Expected: all desktop/mobile tests pass.

- [ ] **Step 3: Run full equivalence gate**

```bash
cd /Users/woosung/Desktop/Dev/Projects/pareto/frontend
SIO_FULL_EQUIVALENCE_REQUIRED=1 node scripts/sio_full_equivalence_gate.mjs
```

Expected: `fullSioEquivalent=true`, `currentScorer=sio_full_lm_equivalence`, G0/G1/G2/G3/G6 all true.

- [ ] **Step 4: If baseline fails, stop**

Do not implement later gates until the baseline failure is understood and recorded.

### Sprint 0.2: Early Public Tangtang Naming Pass

**Purpose:** Switch user-facing product branding to Tangtang now, while keeping internal equivalence identifiers stable until the deferred post-launch rename gate.

**Files:**
- Modify: `frontend/app/[locale]/v3/page.tsx`
- Modify: `frontend/components/v3/index.tsx`
- Modify: `frontend/components/v3/optimizer.tsx`
- Modify/Test: `frontend/e2e/v3_tech_optimizer.spec.ts`
- Audit/Create: `frontend/artifacts/td11/naming_migration_audit.md`

- [ ] **Step 1: Write RED e2e for public brand**

Add a test to `frontend/e2e/v3_tech_optimizer.spec.ts`:

```ts
test('uses Tangtang public branding without source-specific visible copy', async ({ page }) => {
  await expect(page.getByTestId('tech-parts-optimizer')).toBeVisible();
  await expect(page.getByText('Tangtang')).toBeVisible();
  await expect(page.getByText(/^Pareto$/)).toHaveCount(0);
  await expect(page.getByText(/SIO/)).toHaveCount(0);
  await expect(page.getByText('SIO LM context')).toHaveCount(0);
  await expect(page.getByTestId('tech-sio-lm-context')).toHaveCount(0);
});
```

- [ ] **Step 2: Run RED**

```bash
cd /Users/woosung/Desktop/Dev/Projects/pareto/frontend
npx playwright test e2e/v3_tech_optimizer.spec.ts --project=chromium-desktop --grep "Tangtang public branding"
```

Expected: FAIL if route still shows `Pareto` as the visible brand.

- [ ] **Step 3: Rename visible product copy**

Change only user-facing copy:

- Route headings: `Pareto` -> `Tangtang`
- Hub/product labels: `Pareto` -> `Tangtang`
- Import/summary/public docs: visible `SIO` -> neutral wording

Do not rename these internal identifiers in this sprint:

- `fullSioEquivalent`
- `sio_full_lm_equivalence`
- `sioLm`
- `SioTechInventoryInput`
- `sioTranslator`
- `sio_*` scripts/artifacts

- [ ] **Step 4: Add naming migration audit**

Create `frontend/artifacts/td11/naming_migration_audit.md` with:

- Early public rename scope.
- Deferred internal rename scope.
- Known allowed internal `sio*` terms for Gate 1~6.
- Public leakage scan commands.

- [ ] **Step 5: Run GREEN**

```bash
cd /Users/woosung/Desktop/Dev/Projects/pareto/frontend
npx playwright test e2e/v3_tech_optimizer.spec.ts --project=chromium-desktop --grep "Tangtang public branding"
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 6: Public leakage scan**

Run a targeted visible-copy scan. This is a guardrail, not a blind rename instruction:

```bash
cd /Users/woosung/Desktop/Dev/Projects/pareto
rg -n "Pareto|SIO" frontend/components frontend/app frontend/e2e frontend/artifacts/td11 --glob '!frontend/artifacts/td11/sio_*' --glob '!frontend/artifacts/td11/**/sio-*'
```

Expected: any remaining hit is either internal/test-only allowlisted in `naming_migration_audit.md` or fixed before continuing.

## Gate 1: Import Profile Flow

**Purpose:** Users can import/paste profile data without seeing raw SIO LM JSON, and the import fills wallet, tech inventory, and account context fields.

### Sprint 1.1: Import Shell

**Files:**
- Modify: `frontend/components/v3/optimizer.tsx`
- Test: `frontend/e2e/v3_tech_optimizer.spec.ts`

- [ ] **Step 1: Write RED e2e for visible import shell**

Add a test:

```ts
test('shows profile import without exposing raw SIO LM JSON', async ({ page }) => {
  await expect(page.getByTestId('tech-profile-import')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Import profile' })).toBeVisible();
  await expect(page.getByTestId('tech-profile-import-input')).toBeVisible();
  await expect(page.getByText('SIO LM context')).toHaveCount(0);
  await expect(page.getByTestId('tech-sio-lm-context')).toHaveCount(0);
});
```

- [ ] **Step 2: Run RED**

```bash
cd /Users/woosung/Desktop/Dev/Projects/pareto/frontend
npx playwright test e2e/v3_tech_optimizer.spec.ts --project=chromium-desktop --grep "profile import"
```

Expected: FAIL because `tech-profile-import` does not exist.

- [ ] **Step 3: Implement minimal import shell**

Add a panel above resource wallet:

- `data-testid="tech-profile-import"`
- textarea `data-testid="tech-profile-import-input"`
- button text `Import profile`
- empty summary `data-testid="tech-profile-import-summary"`

Do not parse yet. Do not show raw `sioLm`.

- [ ] **Step 4: Run GREEN**

Run the same Playwright command. Expected: PASS.

### Sprint 1.2: Product Profile Parser

**Files:**
- Create: `frontend/app/lib/pareto-store/profile-import.ts`
- Test/Create: `frontend/app/lib/pareto-store/__tests__/profile-import.test.ts` or `frontend/scripts/profile_import_unit_test.mjs`
- Modify: `frontend/components/v3/optimizer.tsx`

- [ ] **Step 1: Write RED parser test**

Test a small payload:

```ts
const payload = {
  wallet: { techResonanceChips: 77, relicArtifactCores: 4 },
  tech: { skillSlots: 5, rarityCounts: { Legend: 2, Epic: 8 } },
  account: { baseAtk: 7200, finalAtk: 125000 }
};
```

Expected normalized result:

- `wallet.techResonanceChips === 77`
- `tech.chips === 77`
- `tech.skillSlots === 5`
- `account.baseAtk === 7200`
- no `sioLm` field in public return value

- [ ] **Step 2: Run RED**

If using a script:

```bash
cd /Users/woosung/Desktop/Dev/Projects/pareto/frontend
node scripts/profile_import_unit_test.mjs
```

Expected: FAIL because parser does not exist.

- [ ] **Step 3: Implement parser**

Implement:

- `parseProductProfileImport(text: string): ProductProfileImportResult`
- Accept JSON string.
- Accept root aliases: `profile`, `playerState`, `state`, `export`.
- Normalize known fields only.
- Return `{ ok: true, wallet, tech, account, summary }` or `{ ok: false, error }`.

- [ ] **Step 4: Run GREEN**

Run the unit command. Expected: PASS.

### Sprint 1.3: Wallet Autofill

**Files:**
- Modify: `frontend/components/v3/optimizer.tsx`
- Modify: `frontend/app/lib/pareto-store/profile-import.ts`
- Test: `frontend/e2e/v3_tech_optimizer.spec.ts`

- [ ] **Step 1: Write RED e2e**

Paste profile payload and click import:

```ts
await page.getByTestId('tech-profile-import-input').fill(JSON.stringify({
  wallet: {
    techResonanceChips: 88,
    relicArtifactCores: 6,
    survivorAwakeningCores: 3,
    otherworldForgeCores: 11,
    mountCores: 5
  }
}));
await page.getByRole('button', { name: 'Import profile' }).click();
await expect(page.getByTestId('tech-wallet-tech-resonance-chips')).toHaveValue('88');
await expect(page.getByTestId('tech-inventory-chips')).toHaveValue('88');
await expect(page.getByTestId('tech-wallet-relic-artifact-cores')).toHaveValue('6');
```

- [ ] **Step 2: Run RED**

```bash
npx playwright test e2e/v3_tech_optimizer.spec.ts --project=chromium-desktop --grep "wallet autofill"
```

Expected: FAIL because import does not apply values.

- [ ] **Step 3: Implement autofill**

Wire import result to:

- `resourceWallet`
- `chips`
- wallet non-tech resource fields

- [ ] **Step 4: Run GREEN**

Run same Playwright grep. Expected: PASS.

### Sprint 1.4: Account And Tech Autofill

**Files:**
- Modify: `frontend/components/v3/optimizer.tsx`
- Modify: `frontend/app/lib/pareto-store/profile-import.ts`
- Test: `frontend/e2e/v3_tech_optimizer.spec.ts`

- [ ] **Step 1: Write RED e2e**

Assert import fills:

- `tech-inventory-skill-slots`
- `tech-account-collection-sets`
- `tech-account-survivor-level`
- `tech-account-pet-awakening`
- `tech-account-mount-atk`
- `tech-account-weapon-eaf`
- `tech-account-lme-turf`

- [ ] **Step 2: Run RED**

```bash
npx playwright test e2e/v3_tech_optimizer.spec.ts --project=chromium-desktop --grep "account autofill"
```

Expected: FAIL.

- [ ] **Step 3: Implement field application**

Apply normalized import values to existing React state:

- `rarityCounts`
- `skillSlots`
- `accountContext`
- `skillStatus` only if profile has explicit skill constraints

- [ ] **Step 4: Run GREEN**

Run same Playwright grep. Expected: PASS.

### Sprint 1.5: Import Summary And Error Copy

**Files:**
- Modify: `frontend/components/v3/optimizer.tsx`
- Modify: `frontend/app/lib/pareto-store/profile-import.ts`
- Test: `frontend/e2e/v3_tech_optimizer.spec.ts`

- [ ] **Step 1: Write RED e2e**

Test valid summary:

- summary contains `Imported wallet`
- summary contains `Imported account context`
- summary does not contain `sioLm`

Test invalid payload:

- malformed JSON shows `Profile import failed`
- no raw stack trace

- [ ] **Step 2: Run RED**

```bash
npx playwright test e2e/v3_tech_optimizer.spec.ts --project=chromium-desktop --grep "import summary"
```

- [ ] **Step 3: Implement summary/error states**

Keep copy concise and product-facing.

- [ ] **Step 4: Gate 1 verification**

```bash
cd /Users/woosung/Desktop/Dev/Projects/pareto/frontend
npx tsc --noEmit
npx playwright test e2e/v3_tech_optimizer.spec.ts
SIO_FULL_EQUIVALENCE_REQUIRED=1 node scripts/sio_full_equivalence_gate.mjs
```

Expected: all pass and `fullSioEquivalent=true`.

## Gate 2: Named Editors

**Purpose:** Replace or supplement numeric-only account detail controls with named selectors where users naturally expect names.

### Sprint 2.1: Collection Named Selector

**Files:**
- Modify: `frontend/components/v3/optimizer.tsx`
- Test: `frontend/e2e/v3_tech_optimizer.spec.ts`

- [ ] **Step 1: Write RED e2e**

Assert:

- `data-testid="tech-collection-named-editor"` visible
- at least one named collection/set row visible
- star/custom set inputs still visible

- [ ] **Step 2: Run RED**

```bash
npx playwright test e2e/v3_tech_optimizer.spec.ts --project=chromium-desktop --grep "collection named"
```

- [ ] **Step 3: Implement minimal named rows**

Use existing store/schema collections where available. If catalog details are incomplete, render imported/known summary rows and keep numeric fields as source of truth.

- [ ] **Step 4: Run GREEN**

Same grep expected PASS.

### Sprint 2.2: Survivor Selector

**Files:**
- Modify: `frontend/components/v3/optimizer.tsx`
- Test: `frontend/e2e/v3_tech_optimizer.spec.ts`

- [ ] **Step 1: Write RED e2e**

Assert:

- `tech-survivor-selector` visible
- selected survivor display name visible
- level/star/awakening/teamwork/passive fields preserved

- [ ] **Step 2: Run RED**

```bash
npx playwright test e2e/v3_tech_optimizer.spec.ts --project=chromium-desktop --grep "survivor selector"
```

- [ ] **Step 3: Implement selector**

Use `playerState.selected_hero` and `playerState` hero catalog. Do not invent scoring behavior.

- [ ] **Step 4: Run GREEN**

Same grep expected PASS.

### Sprint 2.3: Teamwork And Passive Picker

**Files:**
- Modify: `frontend/components/v3/optimizer.tsx`
- Test: `frontend/e2e/v3_tech_optimizer.spec.ts`

- [ ] **Step 1: Write RED e2e**

Assert named teamwork/passive controls exist and numeric fallback is not the only UI.

- [ ] **Step 2: Run RED**

```bash
npx playwright test e2e/v3_tech_optimizer.spec.ts --project=chromium-desktop --grep "teamwork passive"
```

- [ ] **Step 3: Implement minimal picker**

Render known teamwork/passive names from schema when present. Otherwise show import summary plus editable numeric fields.

- [ ] **Step 4: Run GREEN**

Same grep expected PASS.

### Sprint 2.4: Pet Selector

**Files:**
- Modify: `frontend/components/v3/optimizer.tsx`
- Test: `frontend/e2e/v3_tech_optimizer.spec.ts`

- [ ] **Step 1: Write RED e2e**

Assert:

- deployed pet named selector visible
- assist pet 1/2 named controls visible
- xeno/resonance fields preserved

- [ ] **Step 2: Run RED**

```bash
npx playwright test e2e/v3_tech_optimizer.spec.ts --project=chromium-desktop --grep "pet selector"
```

- [ ] **Step 3: Implement selector**

Use `playerState.pets` names. Keep assist count numeric fallback if named IDs are unknown.

- [ ] **Step 4: Run GREEN**

Same grep expected PASS.

### Sprint 2.5: Mount Puzzle Model

**Files:**
- Modify: `frontend/components/v3/optimizer.tsx`
- Test: `frontend/e2e/v3_tech_optimizer.spec.ts`

- [ ] **Step 1: Write RED e2e**

Assert:

- `tech-mount-puzzle-editor` visible
- puzzle/stat rows visible
- mount cores remain wallet/account context, not tech spend

- [ ] **Step 2: Run RED**

```bash
npx playwright test e2e/v3_tech_optimizer.spec.ts --project=chromium-desktop --grep "mount puzzle"
```

- [ ] **Step 3: Implement compact puzzle model UI**

Render rows for puzzle slots/stat inputs and summarize into existing account fields.

- [ ] **Step 4: Run GREEN**

Same grep expected PASS.

### Sprint 2.6: Equipment Item Selectors

**Files:**
- Modify: `frontend/components/v3/optimizer.tsx`
- Test: `frontend/e2e/v3_tech_optimizer.spec.ts`

- [ ] **Step 1: Write RED e2e**

Assert each slot has:

- named item selector
- EAF
- VAF
- chaos
- xeno

- [ ] **Step 2: Run RED**

```bash
npx playwright test e2e/v3_tech_optimizer.spec.ts --project=chromium-desktop --grep "equipment item selector"
```

- [ ] **Step 3: Implement selectors**

Use existing `playerState.equipment` and catalog names where available. Do not change formula/core semantics.

- [ ] **Step 4: Gate 2 verification**

```bash
cd /Users/woosung/Desktop/Dev/Projects/pareto/frontend
npx tsc --noEmit
npx playwright test e2e/v3_tech_optimizer.spec.ts
```

Expected: all pass.

## Gate 3: Translator Contract

**Purpose:** Prove that product UI/import fields map to `PlayerState` and hidden `sioLm` without relying on visual e2e alone.

### Sprint 3.1: Product Import Unit Contract

**Files:**
- Modify: `frontend/app/lib/pareto-store/profile-import.ts`
- Test/Create: `frontend/scripts/profile_import_unit_test.mjs` or project-native unit test file

- [ ] **Step 1: Write RED unit tests**

Test aliases:

- `base_atk`, `baseAtk`, `damage.base_attack`
- `final_atk`, `finalAtk`, `damage.final_attack`
- `availableChips`, `techResonanceChips`, `tech.chips_available`
- equipment slot aliases like `weapon_eaf`, `equipment.weapon.astral_forge_eaf_level`

- [ ] **Step 2: Run RED**

```bash
cd /Users/woosung/Desktop/Dev/Projects/pareto/frontend
node scripts/profile_import_unit_test.mjs
```

- [ ] **Step 3: Implement alias coverage**

Extend parser only for fields proven by tests.

- [ ] **Step 4: Run GREEN**

Same command expected PASS.

### Sprint 3.2: UI State Projection Contract

**Files:**
- Modify: `frontend/components/v3/optimizer.tsx`
- Test: `frontend/e2e/v3_tech_optimizer.spec.ts`

- [ ] **Step 1: Write RED e2e**

Import a profile, run optimizer, assert:

- result `data-scoring-model="sio_full_lm_equivalence"`
- result `data-full-sio-equivalent="true"`
- imported fields remain visible after run

- [ ] **Step 2: Run RED**

```bash
npx playwright test e2e/v3_tech_optimizer.spec.ts --project=chromium-desktop --grep "import projection"
```

- [ ] **Step 3: Fix projection drift**

If fields reset during run, move source of truth into stable React state or store slice.

- [ ] **Step 4: Run GREEN**

Same grep expected PASS.

### Sprint 3.3: WASM Boundary Contract

**Files:**
- Modify only if needed: `frontend/app/lib/wasm.ts`, `frontend/app/lib/wasm-worker.ts`
- Test only if needed: `tttg_forge_wasm/tests/tech_parts_exports.rs`

- [ ] **Step 1: Write RED only if product contract crosses WASM**

If import/product fields must be passed through WASM, assert they are accepted and scorer remains full-equivalent.

- [ ] **Step 2: Run RED**

```bash
cd /Users/woosung/Desktop/Dev/Projects/pareto
cargo test -p tttg_forge_wasm --test tech_parts_exports -- --nocapture
```

- [ ] **Step 3: Implement minimal contract addition**

Do not alter SIO LM/scoring formulas.

- [ ] **Step 4: Gate 3 verification**

```bash
cd /Users/woosung/Desktop/Dev/Projects/pareto/frontend
npx tsc --noEmit
npx playwright test e2e/v3_tech_optimizer.spec.ts
SIO_FULL_EQUIVALENCE_REQUIRED=1 node scripts/sio_full_equivalence_gate.mjs

cd /Users/woosung/Desktop/Dev/Projects/pareto
cargo test -p tttg_forge_wasm --test tech_parts_exports -- --nocapture
```

## Gate 4: SIO Comparison Loop

**Purpose:** Keep product UI and translator coverage aligned with SIO Tools evidence.

### Sprint 4.1: Artifact Replay Audit

**Files:**
- Read: `frontend/artifacts/td11/sio_lm_equivalence_matrix.json`
- Read: `frontend/artifacts/td11/sio_tech_optimizer_live_expected_2026-05-20.json`
- Read: `frontend/artifacts/td11/sio-tech-live-screenshots/*.png`
- Modify: `frontend/artifacts/td11/sio_product_flow_gap_audit.md`

- [ ] **Step 1: Re-read existing artifacts**

Record which SIO fields are already covered by product UI/import/translator tests.

- [ ] **Step 2: Update audit matrix**

Add or update rows with:

- SIO field
- Pareto field
- formula engine status
- UI status
- translator status
- test status
- missing/follow-up

- [ ] **Step 3: Run diff check**

```bash
cd /Users/woosung/Desktop/Dev/Projects/pareto
git diff --check -- frontend/artifacts/td11/sio_product_flow_gap_audit.md
```

### Sprint 4.2: Live Capture Refresh

**Files:**
- Run: `frontend/scripts/sio_tech_optimizer_live_capture.mjs`
- Run: `frontend/scripts/sio_tech_optimizer_parity_check.mjs`
- Modify: `frontend/artifacts/td11/sio_product_flow_gap_audit.md`

- [ ] **Step 1: Run live capture when needed**

```bash
cd /Users/woosung/Desktop/Dev/Projects/pareto/frontend
node scripts/sio_tech_optimizer_live_capture.mjs
```

Expected: new/updated live capture artifacts or clear reason not needed.

- [ ] **Step 2: Run parity check**

```bash
node scripts/sio_tech_optimizer_parity_check.mjs
```

Expected: pass or known gap recorded.

- [ ] **Step 3: Update audit with timestamp**

Record absolute date/time, artifact paths, and remaining differences.

### Sprint 4.3: Gap Burn-Down

**Files:**
- Modify based on gap: usually `frontend/components/v3/optimizer.tsx`, `frontend/app/lib/pareto-store/profile-import.ts`, or tests
- Modify: `frontend/artifacts/td11/sio_product_flow_gap_audit.md`

- [ ] **Step 1: Pick one highest-impact gap**

Priority:

1. User confusion/blocker
2. Input affects result score
3. Field visible in SIO default tech optimizer modal
4. Manual account field users must enter repeatedly

- [ ] **Step 2: Write RED**

One missing behavior per test.

- [ ] **Step 3: Implement minimal fix**

Product layer first. Translator next. Core only with proof.

- [ ] **Step 4: Run GREEN**

Run the focused test and update audit row.

- [ ] **Step 5: Gate 4 verification**

```bash
cd /Users/woosung/Desktop/Dev/Projects/pareto/frontend
npx playwright test e2e/v3_tech_optimizer.spec.ts
SIO_FULL_EQUIVALENCE_REQUIRED=1 node scripts/sio_full_equivalence_gate.mjs
```

## Gate 5: Product UX Hardening

**Purpose:** Make the route robust enough for actual repeated user use.

### Sprint 5.1: Validation Copy Pass

**Files:**
- Modify: `frontend/components/v3/optimizer.tsx`
- Test: `frontend/e2e/v3_tech_optimizer.spec.ts`

- [ ] **Step 1: Write RED e2e**

Trigger invalid inventory/import and assert:

- no raw validation codes
- no stack trace
- product-facing message visible

- [ ] **Step 2: Run RED**

```bash
npx playwright test e2e/v3_tech_optimizer.spec.ts --project=chromium-desktop --grep "validation copy"
```

- [ ] **Step 3: Implement copy mapping**

Extend existing human-readable validation mapping.

- [ ] **Step 4: Run GREEN**

Same grep expected PASS.

### Sprint 5.2: Mobile Layout Pass

**Files:**
- Modify: `frontend/components/v3/optimizer.tsx`
- Test: `frontend/e2e/v3_tech_optimizer.spec.ts`

- [ ] **Step 1: Write RED mobile layout assertion**

On mobile project, assert:

- `scrollWidth <= clientWidth`
- wallet/account/import/results visible
- no overlapping button text by stable dimensions

- [ ] **Step 2: Run RED**

```bash
npx playwright test e2e/v3_tech_optimizer.spec.ts --project=chromium-mobile-375 --grep "mobile layout"
```

- [ ] **Step 3: Implement layout fixes**

Prefer stable grid constraints and smaller labels. Do not add decorative cards.

- [ ] **Step 4: Run GREEN**

Same grep expected PASS.

### Sprint 5.3: Result Explainability

**Files:**
- Modify: `frontend/components/v3/optimizer.tsx`
- Modify: `frontend/components/v3/tech/techResultPresenter.ts`
- Test: `frontend/e2e/v3_tech_optimizer.spec.ts`

- [ ] **Step 1: Write RED e2e**

After run, assert:

- visible result summary explains top build in product terms
- includes chips left, active skills, top part/mode
- no `sio_candidate_generation`, `sio_full_lm_equivalence`, or internal ids in visible text

- [ ] **Step 2: Run RED**

```bash
npx playwright test e2e/v3_tech_optimizer.spec.ts --project=chromium-desktop --grep "result explainability"
```

- [ ] **Step 3: Implement summary**

Use existing result object only. Do not expose scorer/debug internals.

- [ ] **Step 4: Run GREEN**

Same grep expected PASS.

### Sprint 5.4: Empty, Loading, And Error States

**Files:**
- Modify: `frontend/components/v3/optimizer.tsx`
- Test: `frontend/e2e/v3_tech_optimizer.spec.ts`

- [ ] **Step 1: Write RED e2e**

Assert states:

- WASM pending does not allow run
- invalid inventory disables run
- import failed state is visible
- optimizer error state is product-facing

- [ ] **Step 2: Run RED**

```bash
npx playwright test e2e/v3_tech_optimizer.spec.ts --project=chromium-desktop --grep "empty loading error"
```

- [ ] **Step 3: Implement states**

Use stable `data-testid`s and concise copy.

- [ ] **Step 4: Gate 5 verification**

```bash
cd /Users/woosung/Desktop/Dev/Projects/pareto/frontend
npx tsc --noEmit
npx playwright test e2e/v3_tech_optimizer.spec.ts
npm run build
```

## Gate 6: Release Readiness

**Purpose:** Prove the whole product flow is ready and record exact evidence.

### Sprint 6.1: Full Verification

**Files:**
- Read/verify all changed files
- Modify: `/Users/woosung/Desktop/Dev/Woosdom_Brain/00_System/Templates/from_codex.md`

- [ ] **Step 1: Run frontend typecheck**

```bash
cd /Users/woosung/Desktop/Dev/Projects/pareto/frontend
npx tsc --noEmit
```

Expected: exit 0.

- [ ] **Step 2: Run full tech optimizer e2e**

```bash
npx playwright test e2e/v3_tech_optimizer.spec.ts
```

Expected: all desktop/mobile tests pass.

- [ ] **Step 3: Run production build**

```bash
npm run build
```

Expected: exit 0. Existing Next static export warning is acceptable if unchanged.

- [ ] **Step 4: Run SIO full equivalence gate**

```bash
SIO_FULL_EQUIVALENCE_REQUIRED=1 node scripts/sio_full_equivalence_gate.mjs
```

Expected:

- `fullSioEquivalent=true`
- `currentScorer=sio_full_lm_equivalence`
- G0/G1/G2/G3/G6 true
- `sourceResiduals=[]`

- [ ] **Step 5: Run Rust optimizer tests**

```bash
cd /Users/woosung/Desktop/Dev/Projects/pareto
cargo test -p tttg_forge_optimizer --test tech_optimizer_performance -- --nocapture
```

Expected: all tests pass.

- [ ] **Step 6: Run WASM export tests**

```bash
cargo test -p tttg_forge_wasm --test tech_parts_exports -- --nocapture
```

Expected: all tests pass.

- [ ] **Step 7: Rebuild WASM package**

```bash
wasm-pack build tttg_forge_wasm --target web --release -- --features compat-exports
```

Expected: exit 0.

- [ ] **Step 8: Run diff check**

```bash
git diff --check
```

Expected: exit 0.

### Sprint 6.2: Browser Render Smoke

**Files:**
- Verify: local route `/en/v3/optimizer/tech-parts`

- [ ] **Step 1: Start dev server if needed**

```bash
cd /Users/woosung/Desktop/Dev/Projects/pareto/frontend
npm run dev -- --port 3060
```

- [ ] **Step 2: Verify route**

Open:

```text
http://localhost:3060/en/v3/optimizer/tech-parts
```

Expected:

- boot status uses Tangtang-facing copy and does not show `Pareto`
- resource wallet visible
- import panel visible after Gate 1
- account context visible
- results run without raw internal ids
- `scrollWidth <= clientWidth` on desktop and mobile sample viewport

### Sprint 6.3: Final Record

**Files:**
- Modify: `/Users/woosung/Desktop/Dev/Woosdom_Brain/00_System/Templates/from_codex.md`
- Modify: `frontend/artifacts/td11/sio_product_flow_gap_audit.md`

- [ ] **Step 1: Append final result**

Record:

- timestamp KST
- changed files
- RED failures observed
- GREEN commands and pass counts
- full equivalence status
- remaining product gaps
- exact artifact paths

- [ ] **Step 2: Confirm audit is current**

`sio_product_flow_gap_audit.md` must have no stale “missing” entries for completed gates.

- [ ] **Step 3: Final status**

Report only verified facts. Do not claim “complete” without the commands above passing fresh.

## Post-Launch Gate 7: Internal Source-Reference Rename

**Purpose:** After Gate 1~6 are green and product launch is complete, remove obvious `sio*`/source-specific internal names from shipped code paths, runtime bundles, public artifacts, and public docs using a controlled naming map.

**Timing:** Do not execute this before release readiness unless the user explicitly pauses product work and asks for internal rename. This gate is intentionally deferred because it touches scorer names, scripts, artifacts, Rust/WASM exports, and equivalence gates.

### Sprint 7.1: Internal Naming Map

**Files:**
- Create: `docs/superpowers/plans/2026-05-XX-tangtang-internal-naming-map.md`
- Create/Modify: `frontend/artifacts/td11/naming_migration_audit.md`

- [ ] **Step 1: Inventory internal source-specific names**

Run:

```bash
cd /Users/woosung/Desktop/Dev/Projects/pareto
rg -n "SIO|sio|Sio" frontend tttg_forge_core tttg_forge_optimizer tttg_forge_wasm docs --glob '!target' --glob '!frontend/.next'
```

Expected: list all internal names and classify them as:

- runtime shipped code
- public docs/artifacts
- private audit/provenance
- test-only
- script-only

- [ ] **Step 2: Draft rename map**

Create a table:

| Current name | Proposed neutral name | Scope | Risk | Tests required |
|---|---|---|---|---|
| `sioLm` | `lambdaContext` | TS/Rust/WASM | high | e2e + full gate |
| `SioTechInventoryInput` | `TechInventoryContract` | TS/Rust/WASM | high | WASM export tests |
| `sioTranslator` | `profileTranslator` | TS | medium | parser/unit/e2e |
| `sio_full_lm_equivalence` | `lambda_full_equivalence` | gate/scorer | very high | full equivalence gate |
| `sio_*` scripts | neutral script names from map | scripts/artifacts | high | script smoke + full gate |

The actual names can differ, but they must not include `SIO`, `sio`, or an obvious source-tool reference.

- [ ] **Step 3: Review before edits**

Do not edit code until the naming map is reviewed. The map is the contract for the rest of Gate 7.

### Sprint 7.2: Public Artifact And Bundle Scan

**Files:**
- Modify: `frontend/artifacts/td11/naming_migration_audit.md`
- Modify: public docs/artifacts only as needed

- [ ] **Step 1: Write scan script or command list**

Record commands that scan:

- `frontend/out` or Next build output after `npm run build`
- public docs
- screenshots/visible copy
- route DOM snapshots

- [ ] **Step 2: Run public leakage RED**

Expected initial result may fail because internal names still exist.

- [ ] **Step 3: Classify allowed private hits**

Private audit/provenance records may keep source references if not shipped. Public bundle/docs should not.

### Sprint 7.3: TypeScript Internal Rename

**Files:**
- Modify: `frontend/app/lib/wasm.ts`
- Modify: `frontend/app/lib/wasm-worker.ts`
- Modify: `frontend/app/lib/pareto-store/playerState/sioTranslator.ts` or move to neutral filename
- Modify: imports in frontend files
- Test: `frontend/e2e/v3_tech_optimizer.spec.ts`
- Test: profile import unit tests/scripts

- [ ] **Step 1: Write RED import/path test**

Add tests expecting neutral public/TS API names and no visible behavior change.

- [ ] **Step 2: Rename one TS slice**

Start with UI-local names. Avoid Rust/WASM/scorer names until TS is green.

- [ ] **Step 3: Run GREEN**

```bash
cd /Users/woosung/Desktop/Dev/Projects/pareto/frontend
npx tsc --noEmit
npx playwright test e2e/v3_tech_optimizer.spec.ts
```

### Sprint 7.4: Rust/WASM Contract Rename

**Files:**
- Modify: `tttg_forge_optimizer/src/**`
- Modify: `tttg_forge_wasm/src/**`
- Modify: `tttg_forge_wasm/tests/tech_parts_exports.rs`
- Modify: `tttg_forge_optimizer/tests/tech_optimizer_performance.rs`

- [ ] **Step 1: Write RED Rust/WASM tests**

Tests should assert neutral names are exported/accepted while behavior and scorer output remain equivalent.

- [ ] **Step 2: Rename one contract boundary at a time**

Prefer aliases first if needed for a transitional green state. Remove old names only when all call sites are migrated.

- [ ] **Step 3: Run GREEN**

```bash
cd /Users/woosung/Desktop/Dev/Projects/pareto
cargo test -p tttg_forge_optimizer --test tech_optimizer_performance -- --nocapture
cargo test -p tttg_forge_wasm --test tech_parts_exports -- --nocapture
wasm-pack build tttg_forge_wasm --target web --release -- --features compat-exports
```

### Sprint 7.5: Gate/Script/Artifact Rename

**Files:**
- Modify: `frontend/scripts/*`
- Modify: `frontend/artifacts/td11/*` only if public/shipped
- Modify: docs/plans/audits as needed

- [ ] **Step 1: Rename scripts with wrappers if needed**

If existing automation expects old script names, add temporary compatibility wrappers that are not shipped publicly. Record the removal point.

- [ ] **Step 2: Rename gate outputs only after full test parity**

The full-equivalence gate can change display names only after tests prove behavior unchanged.

- [ ] **Step 3: Run full Gate 7 verification**

```bash
cd /Users/woosung/Desktop/Dev/Projects/pareto/frontend
npx tsc --noEmit
npx playwright test e2e/v3_tech_optimizer.spec.ts
npm run build
SIO_FULL_EQUIVALENCE_REQUIRED=1 node scripts/sio_full_equivalence_gate.mjs

cd /Users/woosung/Desktop/Dev/Projects/pareto
cargo test -p tttg_forge_optimizer --test tech_optimizer_performance -- --nocapture
cargo test -p tttg_forge_wasm --test tech_parts_exports -- --nocapture
wasm-pack build tttg_forge_wasm --target web --release -- --features compat-exports
git diff --check
```

Expected: behavior remains equivalent. Any remaining `SIO|sio|Sio` hit is either non-public private provenance or explicitly allowlisted in `naming_migration_audit.md`.

## Recommended Execution Order

1. Gate 0: Baseline Lock
2. Sprint 0.2: Early Public Tangtang Naming Pass
3. Gate 1: Import Profile Flow
4. Gate 3: Translator Contract
5. Gate 2: Named Editors
6. Gate 4: SIO Comparison Loop
7. Gate 5: Product UX Hardening
8. Gate 6: Release Readiness
9. Post-Launch Gate 7: Internal Source-Reference Rename

## Stop Conditions

Stop and ask for guidance if:

- `fullSioEquivalent` becomes false.
- `currentScorer` is anything other than `sio_full_lm_equivalence`.
- A required SIO live artifact is unavailable and the gap cannot be classified from existing evidence.
- A fix requires changing SIO LM/scoring core without a RED test proving translator/core mismatch.
- A pre-launch sprint attempts to rename internal `sio*` identifiers instead of only visible copy.
- A public rename task attempts to delete private audit/provenance records instead of moving or classifying them.
- Existing unrelated dirty worktree changes block a clean implementation path.
