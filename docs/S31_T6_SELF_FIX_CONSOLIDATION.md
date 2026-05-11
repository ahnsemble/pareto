# S31 T6 Self-Fix Consolidation

## Status

T6 status: CONDITIONAL.

No P0 launch blocker was found. Three repository-local fixes were completed and verified:

```text
9fcb300 fix(s31-t6): mobile optimize touch targets and labels
aab65e9 fix(s31-t6): structure game data endpoint errors
a887608 fix(s31-t6): scope mobile a11y guard
```

## Fixed

### T4-F2 Touch Targets

Root cause: some mobile controls relied on padding and browser defaults instead of explicit target dimensions. The affected controls were the optimize header back link, hero select, equipment selects, pet select, and compact collectible action buttons.

Fix: added explicit `min-h-[44px]`, `min-w-[44px]`, and centered inline-flex layout where appropriate.

Verification:

```text
self_fix_mobile_a11y mobile guard: PASS
focused user-flow suite: 5 passed, 1 skipped
```

### T4-F3 Visible Label / Accessible Name Mismatch

Root cause: collectible switch buttons used `aria-label` values that replaced visible numeric labels. On mobile list rows, the accessible name was only the collectible name while the visible label also included the numeric prefix.

Fix: grid switches now include the visible numeric prefix in `aria-label`; mobile list switches derive their accessible name from visible text, with the decorative state dot hidden from assistive technology.

Verification:

```text
Playwright accessible name guard: PASS
Lighthouse desktop accessibility: 100, failed audits 0
Lighthouse mobile accessibility: 100, failed audits 0
```

### T5-F1 Script Failure Shape

Root cause: the live game data detector aborted on the first URL error, producing a traceback instead of a complete machine-readable result.

Fix: the detector now catches per-source fetch errors, records `error` and `error_type`, continues through all configured sources, and exits nonzero when any source changed or failed.

Verification:

```text
python3 scripts/test_detect_game_data_changes.py: OK
dry-run detector: exit 0, source_count 5, changed 0
live detector: exit 1, 5 structured HTTPError rows, no traceback
```

## Carryover

```text
Sev-one carryover 1: real external message delivery still requires explicit approval and configured production channel validation.
Sev-one carryover 2: Lighthouse Performance remains below the 90 target in the measured optimize page runs.
Sev-one carryover 3: public game data source paths still return HTTP 404; the repo now reports this cleanly, but the correct published paths must be supplied outside this code-only fix.
```

## Sev-Two Notes

```text
Sev-two note 1: regression brief could include explicit cargo count, raw WASM bytes, and launch-readiness wording.
Sev-two note 2: iPad numeric-grid cutoff detector produced pseudo-element false positives; phone CJK cutoff remained 0.
Sev-two note 3: connect-src is self-only today; future browser-side live data fetch needs a CSP allowlist update in the same change.
```

## Regression Posture

The T6-local checks are green. Full branch verification remains part of T7 final gates:

```text
npm run build
npx playwright test
cargo test --workspace --release
scripts/launch_verify.sh
raw WASM byte cap
public confidentiality grep on new artifacts
```
