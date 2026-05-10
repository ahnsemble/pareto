# Launch Verification Checklist

## Build And Runtime

- [ ] `cargo test --workspace --release` passes.
- [ ] WASM production build passes.
- [ ] WASM size is at or below `225,000 B`.
- [ ] WASM gzip artifact is refreshed.
- [ ] Bench regression check passes with `BENCH_REGRESSION_ITERATIONS=50`.
- [ ] Game data detector dry-run passes.
- [ ] Workflow YAML parses.
- [ ] Frontend production build passes.
- [ ] Playwright optimize worker spec passes.
- [ ] Playwright mobile optimize spec passes.

## Product Flow

- [ ] Home route loads in Korean.
- [ ] Home route loads in English.
- [ ] Optimize route loads in Korean.
- [ ] Optimize route loads in English.
- [ ] Optimizer worker initializes only after optimize flow starts.
- [ ] Default WASM package loads without compatibility exports.
- [ ] Search-space controls update results.
- [ ] Pareto frontier chart renders non-empty data.
- [ ] Build diff data is available.
- [ ] Heatmap data is available.
- [ ] Empty input error is user-friendly.
- [ ] Malformed JSON error is user-friendly.
- [ ] Large input guard is user-friendly.
- [ ] WASM initialization failure path is user-friendly.
- [ ] Share URL event payload contains no raw build data.

## Quality

- [ ] Lighthouse performance is at least 90.
- [ ] Lighthouse accessibility is at least 90.
- [ ] Keyboard navigation reaches all primary controls.
- [ ] Mobile viewport has no overlapping text.
- [ ] Desktop viewport has no overlapping text.
- [ ] Korean and English message files have matching route coverage.
- [ ] README Korean and English sections are consistent.
- [ ] LICENSE is present.
- [ ] NOTICE is present.
- [ ] CHANGELOG covers G.1 through G.10.
- [ ] Public confidentiality grep returns 0 hits.
- [ ] Git status is clean after final commit.
- [ ] Push is performed only by the release owner.
- [ ] Cloudflare Pages environment variables are set by the release owner.
- [ ] Telegram secrets are set by the release owner.
