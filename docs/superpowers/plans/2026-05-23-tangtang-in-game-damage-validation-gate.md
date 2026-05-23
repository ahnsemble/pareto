# Tangtang In-Game Damage Validation Gate Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a deterministic gate that distinguishes Tangtang=SIO equivalence from direct in-game damage validation, and blocks any Tangtang-vs-SIO formula correction until enough in-game observation trials exist.

**Architecture:** Add one script that generates a JSON validation matrix and Markdown protocol from existing formula/evidence artifacts. The initial gate is protocol-only with zero direct in-game damage trials, records high-risk domains to test, and explicitly states no formula/scoring/UI behavior changes.

**Tech Stack:** Node.js ESM scripts, checked-in td11 artifacts, existing schema/transpile patterns where needed, Markdown audit records.

---

## Chunk 1: Validation Gate

### Task 1: Add RED Gate Script

**Files:**
- Create: `frontend/scripts/tangtang_in_game_damage_validation_unit_test.mjs`
- Create by write mode: `frontend/artifacts/td11/tangtang_in_game_damage_validation_matrix.json`
- Create by write mode: `frontend/artifacts/td11/tangtang_in_game_damage_validation_protocol.md`

- [ ] Write a failing script that reads existing formula/evidence artifacts and builds the expected matrix/protocol.
- [ ] Assert initial direct in-game observed damage trial count is `0`.
- [ ] Assert `claim === "in-game-validation-protocol"`.
- [ ] Assert no correction is allowed while direct trials are missing.
- [ ] Assert SIO-equivalent contract remains true and behavior change remains false.
- [ ] Run `node scripts/tangtang_in_game_damage_validation_unit_test.mjs` and verify it fails because artifacts do not exist.

### Task 2: Generate Matrix And Protocol

**Files:**
- Modify: `frontend/scripts/tangtang_in_game_damage_validation_unit_test.mjs`
- Create: `frontend/artifacts/td11/tangtang_in_game_damage_validation_matrix.json`
- Create: `frontend/artifacts/td11/tangtang_in_game_damage_validation_protocol.md`

- [ ] Implement `--write`.
- [ ] Matrix includes status, claim, behaviorChange, sourceInputs, validationScope, observationSchema, trialGroups, decisionPolicy, correctionPolicy, currentEvidenceSummary, blockers, verificationCommands, artifactPaths.
- [ ] Protocol explains ratio-first validation, absolute-damage caveats, high-risk stage/domain order, and Tangtang-vs-SIO divergence policy.
- [ ] Run `node scripts/tangtang_in_game_damage_validation_unit_test.mjs --write`.
- [ ] Run `node scripts/tangtang_in_game_damage_validation_unit_test.mjs` and verify GREEN.

## Chunk 2: Integration And Records

### Task 3: Link Gate From Provenance/Spec/Audit

**Files:**
- Modify: `frontend/scripts/damage_formula_provenance_matrix_unit_test.mjs`
- Modify: `frontend/artifacts/td11/damage_formula_provenance_matrix.md`
- Modify: `frontend/artifacts/td11/sio_product_flow_gap_audit.md`
- Optionally modify: `frontend/artifacts/td11/tangtang_damage_formula_spec.md`
- Optionally modify: `frontend/scripts/tangtang_damage_formula_spec_unit_test.mjs`

- [ ] Add validation matrix/protocol artifact references to provenance matrix.
- [ ] Add assertions that the validation gate status/claim/zero observed trials/blocking policy are preserved.
- [ ] Add audit section stating this gate validates SIO-vs-in-game correctness separately from Tangtang=SIO equivalence.
- [ ] Run relevant write/test commands and ensure deterministic artifacts.

### Task 4: Verify, Commit, And Record

**Files:**
- Modify: `/Users/woosung/Desktop/Dev/Woosdom_Brain/00_System/Templates/from_codex.md`

- [ ] Run validation, formula, provenance, live/source evidence, TypeScript, full equivalence, and `git diff --check`.
- [ ] Stage only intended files; do not stage existing untracked plan files from 2026-05-22 and low-impact product depth.
- [ ] Commit locally only.
- [ ] Append from_codex.md with timestamp, paths, commit hash, verification results, caveats, and no push/PR note.
