# Pareto SIO Generalized Transformer S29 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move TD-11 from captured `lm()` bridge parity toward a directly verified compact-config/baseStats stat-transformer path while keeping `fullSioEquivalent=false`.

**Architecture:** Preserve the current SIO resonance/chip/mode solver and captured fallback. Add a separate supplied-context parity gate that passes `sioLm.compactConfig`, `baseStats`, and active skills into WASM, then report whether the new `sio_compact_base_stats_transformer` path reproduces captured rows/multipliers.

**Tech Stack:** Rust `tttg_forge_optimizer`, Rust/WASM `tttg_forge_wasm`, Node ESM parity scripts, captured TD-11 artifacts.

---

### Task 1: Direct Supplied-Context Parity Gate

**Files:**
- Modify: `frontend/scripts/sio_worker_golden_parity_check.mjs`
- Modify: `frontend/scripts/sio_tech_optimizer_parity_check.mjs`
- Test: run both scripts with supplied-context mode enabled.

- [ ] **Step 1: Write failing script assertion**

Add an env-driven mode, `USE_SIO_LM_CONTEXT=1`, that expects `result.scope.scoring_model === "sio_compact_base_stats_transformer"`.

- [ ] **Step 2: Verify RED**

Run:

```bash
cd frontend && USE_SIO_LM_CONTEXT=1 node scripts/sio_tech_optimizer_parity_check.mjs
```

Expected: fail before the scripts inject `sioLm`.

- [ ] **Step 3: Inject `sioLm` context**

Read `frontend/artifacts/td11/sio_lm_trace_summary_2026-05-20.json` and `frontend/artifacts/td11/sio_worker_decoded_summary_2026-05-20.json`; for each fixture case, pass:

```js
sioLm: {
  compactConfig,
  baseStats,
  enabledSkills,
}
```

- [ ] **Step 4: Verify GREEN**

Run both:

```bash
cd frontend && USE_SIO_LM_CONTEXT=1 node scripts/sio_worker_golden_parity_check.mjs
cd frontend && USE_SIO_LM_CONTEXT=1 node scripts/sio_tech_optimizer_parity_check.mjs
```

Expected: scripts execute through `sio_compact_base_stats_transformer`. If multiplier parity fails, report exact pass counts instead of hiding the mismatch.

### Task 2: Rust Transformer Input Boundary Cleanup

**Files:**
- Modify: `tttg_forge_optimizer/src/tech/sio_lm.rs`
- Modify: `tttg_forge_optimizer/tests/tech_optimizer_performance.rs`

- [ ] **Step 1: Add test for context extraction**

Assert compact config decodes `attackMeta`, `calcMode`, `gameMode`, and enabled skills from `sioLm`.

- [ ] **Step 2: Move captured defaults behind explicit fallback**

Keep captured defaults only for no-context fallback, not as hidden behavior for supplied context.

- [ ] **Step 3: Verify**

Run:

```bash
cargo test -p tttg_forge_optimizer --test tech_optimizer_performance
```

### Task 3: Release Documentation and Verification

**Files:**
- Modify: `frontend/artifacts/td11/release_readiness_audit.md`
- Modify: `frontend/artifacts/td11/verification_summary.txt`
- Modify: `/Users/woosung/Desktop/Dev/Woosdom_Brain/00_System/Templates/from_codex.md`
- Modify: `/Users/woosung/Desktop/Dev/Woosdom_Brain/00_System/Templates/from_codex_2.md`

- [ ] **Step 1: Rebuild WASM**

Run:

```bash
cd tttg_forge_wasm && wasm-pack build --target web --release -- --features compat-exports
```

- [ ] **Step 2: Run full verification**

Run:

```bash
cargo fmt --check
cargo test --workspace
cd frontend && npm run build
```

- [ ] **Step 3: Record S29**

Document supplied-context parity counts separately from captured fallback parity. Keep `fullSioEquivalent=false`.
