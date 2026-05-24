# Tangtang Imported Calculation Comparison Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a user who pastes a calculation link the imported baseline result, the current Tangtang result, and the difference without exposing source-specific internals.

**Architecture:** Preserve the existing full-equivalence scorer and add only a product-layer comparison summary. Capture the imported run inputs as a snapshot at import time, then compute that baseline beside the current UI inputs when the user runs the optimizer.

**Tech Stack:** Next.js/React, TypeScript, Playwright, existing WASM worker, Node-based unit scripts.

---

### Task 1: Comparison Summary Helper

**Files:**
- Create: `frontend/app/lib/pareto-store/calculation-comparison.ts`
- Create: `frontend/scripts/tangtang_calculation_comparison_unit_test.mjs`

- [x] Write RED unit tests for top-build damage extraction, delta percentage, zero-baseline guard, and no internal scorer wording.
- [x] Run `node scripts/tangtang_calculation_comparison_unit_test.mjs` and confirm it fails because the helper is missing.
- [x] Implement the helper with a small typed API.
- [x] Re-run the unit test and confirm it passes.

### Task 2: Product UI Wiring

**Files:**
- Modify: `frontend/components/v3/optimizer.tsx`
- Modify: `frontend/components/v3/tech/techLocaleCopy.ts`
- Modify: `frontend/scripts/tech_account_context_unit_test.mjs`
- Modify: `frontend/e2e/v3_tech_optimizer.spec.ts`

- [x] Write RED UI coverage requiring the comparison panel after importing and running a calculation link.
- [x] Write RED locale assertions for English/Korean labels.
- [x] Run focused tests and confirm the expected failures.
- [x] Store imported run inputs at import time and compute the imported baseline beside the current run.
- [x] Render comparison cards labeled `Imported calculation`, `Tangtang calculation`, and `Difference`; Korean labels are `가져온 계산`, `Tangtang 계산`, and `차이`.
- [x] Keep visible UI free of source-specific terms and raw scorer/debug controls.

### Task 3: User Screenshot Evidence Intake

**Files:**
- Create: `frontend/scripts/tangtang_user_set_threshold_photo_evidence_unit_test.mjs`
- Create: `frontend/artifacts/td11/tangtang_user_set_threshold_photo_evidence.json`
- Create: `frontend/artifacts/td11/tangtang_user_set_threshold_photo_evidence.md`

- [x] Write RED evidence test requiring seven photo rows, 18/19 threshold notes, and no scoring change.
- [x] Generate JSON/Markdown evidence artifacts with `--write`.
- [x] Re-run the evidence test and confirm it passes.

### Task 4: Verification And Local Commit

- [x] Run focused unit/e2e tests.
- [x] Run `npx tsc --noEmit`.
- [x] Run full equivalence gate.
- [x] Run `git diff --check`.
- [x] Commit locally only and update `/Users/woosung/Desktop/Dev/Woosdom_Brain/00_System/Templates/from_codex.md`.
