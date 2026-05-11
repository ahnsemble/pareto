# S31 T5 CSP and External Dependency Verification

## Scope

This ledger records the production-facing CSP, metadata, and external dependency checks for S31 T5. The checks were run against the static export in `frontend/out` and the source definitions used by the game data watcher.

## CSP Result

`frontend/out/_headers` exposes a single production CSP for all paths:

```text
default-src 'self'
connect-src 'self'
img-src 'self' data:
script-src 'self' 'wasm-unsafe-eval'
style-src 'self' 'unsafe-inline'
font-src 'self'
object-src 'none'
base-uri 'self'
frame-ancestors 'none'
```

Result: PASS for the current static frontend. WASM execution is covered by `script-src 'wasm-unsafe-eval'`, and there are no browser runtime analytics, monitoring, or external font calls found in the application source.

## Metadata Result

Static export validation:

```text
manifest.json valid: true
robots.txt valid: true
sitemap.xml url count: 8
og image dimensions: 1200x630
```

Result: PASS. The sitemap includes both locales for the home, optimize, twodeck, and community routes.

## External Endpoint Result

The game data watcher has five public source URLs under `raw.githubusercontent.com`. Dry run passes because it compares fixture baselines without network access:

```text
dry-run source_count: 5
dry-run changed rows: 0
```

Live network simulation reached the host, but every configured game data source returned HTTP 404:

```text
public_equipment_catalog: 404
public_pet_catalog: 404
public_skill_catalog: 404
public_tech_catalog: 404
public_mode_coefficients: 404
```

Result: CONDITIONAL. This does not block the current browser app because the exported frontend does not fetch these URLs at runtime. It does mean the manual or scheduled non-dry-run game data watcher would fail until the public data repository paths are corrected or the watcher is kept in dry-run mode.

## Findings

```text
T5-F1 sev-one: game data live endpoint check reaches raw.githubusercontent.com but configured source paths return HTTP 404.
T5-F2 sev-two: CSP connect-src is intentionally self-only; if browser-side live game data fetch is added later, the allowlist must be updated at the same time.
```

## Commit Policy

This T5 ledger is documentation-only. No production code or endpoint value was changed in T5 because the correct public data paths are outside this repository's current evidence.
