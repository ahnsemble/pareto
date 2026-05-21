# Pareto Product Completion Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the SIO-equivalent calculation engine into a user-complete Pareto product flow that accepts real Survivor.io inventory/account state, compares against SIO Tools, finds missing product gaps, and fixes them without breaking `fullSioEquivalent=true`.

**Architecture:** Keep the SIO LM/scoring core stable and attach product layers around it: resource wallet schema, account context forms, domain translators, import/export, and human-readable result UX. Treat each domain as a separately testable slice that can be compared with SIO live/artifact evidence before being marked product-ready.

**Tech Stack:** Rust optimizer/WASM (`tttg_forge_optimizer`, `tttg_forge_wasm`), Next.js frontend (`frontend/components/v3/optimizer.tsx`, Zustand Pareto store), Playwright e2e, existing SIO capture/parity scripts under `frontend/scripts`.

---

## Scope Split

This is not one feature. Execute it as independent product-completion slices:

1. Resource wallet and terminology.
2. Tech optimizer result UX.
3. Account context detail editors.
4. SIO import/profile flow.
5. SIO live comparison and gap audit loop.
6. Final release readiness gate.

Do not modify the SIO LM/scoring core unless a test proves the product translator is feeding it incorrectly.

## Files

- Modify: `frontend/components/v3/optimizer.tsx`
  - Current tech optimizer route UI.
- Modify/Test: `frontend/e2e/v3_tech_optimizer.spec.ts`
  - Product vocabulary, input, result, and mobile/desktop e2e.
- Create: `frontend/app/lib/pareto-store/resource-wallet.ts`
  - User-facing resource taxonomy and wallet normalizer.
- Modify: `frontend/app/lib/pareto-store/types/index.ts`
  - Add typed resource wallet fields if needed.
- Modify: `frontend/app/lib/pareto-store/selectors/index.ts`
  - Project wallet/account inputs into `PlayerState`.
- Modify: `frontend/app/lib/wasm-worker.ts`
  - Keep worker API stable; pass product context without exposing debug fields.
- Modify: `frontend/app/lib/wasm.ts`
  - Type additions for product input contracts.
- Test: `tttg_forge_wasm/tests/tech_parts_exports.rs`
  - Product input contract exported through WASM.
- Test: `tttg_forge_optimizer/tests/tech_optimizer_performance.rs`
  - Only if translator/profile behavior changes.
- Audit: `frontend/artifacts/td11/sio_product_flow_gap_audit.md`
  - Update after each comparison pass.
- Record: `/Users/woosung/Desktop/Dev/Woosdom_Brain/00_System/Templates/from_codex.md`

## Task 1: Resource Wallet And Product Terminology

**Why:** The current tech page shows only resonance chips because it only solves the tech-part allocation problem. Product-wise, Survivor.io has many resource types: relic/artifact cores, resonance chips, survivor awakening cores, otherworld/forge cores, mount cores, etc. Users need a wallet and scope labels so they understand which resources affect the current optimizer and which are account context.

- [ ] **Step 1: Write failing e2e for resource wallet labels**

Test in `frontend/e2e/v3_tech_optimizer.spec.ts`:

```ts
test('shows a resource wallet and separates tech spend from account resources', async ({ page }) => {
  await expect(page.getByTestId('tech-resource-wallet')).toBeVisible();
  await expect(page.getByText('Tech resonance chips')).toBeVisible();
  await expect(page.getByText('Relic cores')).toBeVisible();
  await expect(page.getByText('Survivor awakening cores')).toBeVisible();
  await expect(page.getByText('Otherworld cores')).toBeVisible();
  await expect(page.getByText('Mount cores')).toBeVisible();
  await expect(page.getByText(/^Resonance chips$/)).toHaveCount(0);
});
```

- [ ] **Step 2: Run RED**

Run:

```bash
cd /Users/woosung/Desktop/Dev/Projects/pareto/frontend
npx playwright test e2e/v3_tech_optimizer.spec.ts --project=chromium-desktop --grep "resource wallet"
```

Expected: FAIL because `tech-resource-wallet` does not exist.

- [ ] **Step 3: Implement minimal wallet UI**

Add a `ResourceWalletPanel` in `frontend/components/v3/optimizer.tsx` with editable inputs:

- `Tech resonance chips` -> maps to `sioTechInventory.chips`.
- `Relic cores` -> account context only unless relic optimizer is selected.
- `Survivor awakening cores` -> account context for survivor editor.
- `Otherworld cores` -> equipment/forge context.
- `Mount cores` -> mount context.

Keep the current tech optimizer run constrained only by `Tech resonance chips`.

- [ ] **Step 4: Run GREEN**

Run the same Playwright test. Expected: PASS.

- [ ] **Step 5: Commit/checkpoint**

Do not commit unless user requests commits. At minimum record changed files and test evidence.

## Task 2: Human-Readable Results

**Why:** Internal labels like `energyGuidanceSystem:droneMode:o10+...` are not product-ready.

- [ ] **Step 1: Write failing e2e**

Assert result rows show display names:

```ts
await expect(page.getByText('Energy Guidance System')).toBeVisible();
await expect(page.getByText('Drone Mode')).toBeVisible();
await expect(page.getByText('Chips left')).toBeVisible();
await expect(page.getByText(/^energyGuidanceSystem:/)).toHaveCount(0);
```

- [ ] **Step 2: Implement result presenter**

Create local helpers or a new file:

- `frontend/components/v3/tech/techResultPresenter.ts`

Responsibilities:

- Convert tech part ids to display names.
- Convert mode ids to display names.
- Show per-part rows with chip allocation and overload.
- Show a short summary: score, damage, chips left, active skills.
- Preserve raw labels only in hidden data attributes if needed for tests.

- [ ] **Step 3: Verify**

Run:

```bash
npx playwright test e2e/v3_tech_optimizer.spec.ts
npx tsc --noEmit
```

Expected: PASS.

## Task 3: Account Context Detail Editors

**Why:** The first-screen quick inputs are useful but not enough for a complete Pareto product. Build detail editors by domain while keeping scoring core untouched.

- [ ] **Step 1: Collections**
  - RED: e2e expects per-set collection rows or import summary.
  - Implement: collection set progress and custom set slots from store/schema.
  - Compare: update `sio_product_flow_gap_audit.md`.

- [ ] **Step 2: Survivors**
  - RED: e2e expects survivor level/star/awakening/teamwork/passive fields.
  - Implement: selected survivor and teamwork summary/edit fields.
  - Compare against SIO live/artifact captured fields.

- [ ] **Step 3: Pets**
  - RED: e2e expects pet awakening, assist pets, xeno flag, resonance stats.
  - Implement detail fields without changing scorer.

- [ ] **Step 4: Mounts**
  - RED: e2e expects mount core/puzzle/stat inputs.
  - Implement collapsed mount inputs and visible scope.

- [ ] **Step 5: Equipment/Forge**
  - RED: e2e expects six slots, item selection, EAF/VAF, chaos, xeno/otherworld core inputs.
  - Implement per-slot editor or link to existing equipment state.

After each subtask, run:

```bash
npx playwright test e2e/v3_tech_optimizer.spec.ts --project=chromium-desktop
npx playwright test e2e/v3_tech_optimizer.spec.ts --project=chromium-mobile-375
npx tsc --noEmit
```

## Task 4: SIO Import/Profile Flow

**Why:** A complete product should let users import or paste profile/account data without seeing raw SIO LM JSON.

- [ ] **Step 1: Write failing test**

Test that a visible `Import profile` control accepts a compact/profile payload and fills wallet/account/tech fields.

- [ ] **Step 2: Implement parser path**

Use existing translator patterns:

- `frontend/app/lib/pareto-store/playerState/sioTranslator.ts`
- `frontend/app/lib/wasm.ts`
- `tttg_forge_wasm/src/sio_state_translator.rs`

Do not show raw `sioLm` JSON textarea.

- [ ] **Step 3: Verify**

Run e2e and full gate.

## Task 5: SIO Tools Comparison Loop

**Why:** The agent must independently find missing product gaps while the user sleeps.

- [ ] **Step 1: Read existing evidence**

Read:

- `/Users/woosung/Desktop/Dev/Woosdom_Brain/00_System/Templates/from_codex.md`
- `frontend/artifacts/td11/sio_product_flow_gap_audit.md`
- `frontend/artifacts/td11/sio_lm_equivalence_matrix.json`
- `frontend/artifacts/td11/sio_tech_optimizer_live_expected_2026-05-20.json`
- SIO screenshots under `frontend/artifacts/td11/sio-tech-live-screenshots/`

- [ ] **Step 2: Capture or compare SIO live if needed**

Prefer existing scripts first:

```bash
cd /Users/woosung/Desktop/Dev/Projects/pareto/frontend
node scripts/sio_tech_optimizer_live_capture.mjs
node scripts/sio_tech_optimizer_parity_check.mjs
```

If scripts need current live browser access, browse/capture SIO Tools and record the date/time.

- [ ] **Step 3: Build a gap table**

Update `frontend/artifacts/td11/sio_product_flow_gap_audit.md` with:

- SIO field name.
- Pareto field name.
- Formula engine status.
- UI status.
- Translator status.
- Test status.
- Missing/follow-up.

- [ ] **Step 4: Fix the highest-impact gaps**

Prioritize:

1. User confusion/blockers.
2. Inputs that affect result score.
3. Inputs visible in SIO default tech optimizer modal.
4. Account context fields users must enter manually.

## Task 6: Full Verification And Record

Run, in order:

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

Record in:

```text
/Users/woosung/Desktop/Dev/Woosdom_Brain/00_System/Templates/from_codex.md
```

The record must include:

- What changed.
- RED failures observed.
- GREEN commands and pass counts.
- Whether `fullSioEquivalent=true` remains true.
- Remaining product gaps.
- Exact artifact paths.
