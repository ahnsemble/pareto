#!/usr/bin/env bash
set -uo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WASM_CAP_BYTES="${LAUNCH_WASM_CAP_BYTES:-162860}"
WASM_GZIP_CAP_BYTES="${LAUNCH_WASM_GZIP_CAP_BYTES:-70000}"
BENCH_ITERS="${BENCH_REGRESSION_ITERATIONS:-1}"
FAILED=0

run_check() {
  local name="$1"
  shift
  printf '\n[%s] %s\n' "$name" "START"
  if "$@"; then
    printf '[%s] PASS\n' "$name"
  else
    printf '[%s] FAIL\n' "$name"
    FAILED=1
  fi
}

run_shell() {
  (cd "$ROOT_DIR" && bash -lc "$1")
}

run_check "AUTO-01 cargo release tests" run_shell "cargo test --workspace --release"
run_check "AUTO-02 production wasm build" run_shell "wasm-pack build tttg_forge_wasm --target web --release"
run_check "AUTO-03 wasm raw size cap" run_shell "test \"\$(wc -c < tttg_forge_wasm/pkg/tttg_forge_wasm_bg.wasm | tr -d ' ')\" -le \"$WASM_CAP_BYTES\""
run_check "AUTO-04 wasm gzip size cap" run_shell "test \"\$(gzip -n -c tttg_forge_wasm/pkg/tttg_forge_wasm_bg.wasm | wc -c | tr -d ' ')\" -le \"$WASM_GZIP_CAP_BYTES\""
run_check "AUTO-05 bench regression" run_shell "BENCH_REGRESSION_ITERATIONS=\"$BENCH_ITERS\" cargo run -p tttg_forge_optimizer --bin check_bench_regression --release"
run_check "AUTO-06 i18n key consistency" run_shell "cargo test -p tttg_forge_optimizer --test i18n_catalog --release"
run_check "AUTO-07 frontend production build" run_shell "cd frontend && npm run build"
run_check "AUTO-08 game data dry run" run_shell "python3 scripts/detect_game_data_changes.py --dry-run >/tmp/pareto-game-data-dry-run.json"
run_check "AUTO-09 workflow files present" run_shell "test -f .github/workflows/regression.yml && test -f .github/workflows/wasm-size.yml && test -f .github/workflows/game-data-watch.yml"
run_check "AUTO-10 public confidentiality value grep" run_shell "! rg -n \"(sk-[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9]{20,}|pat_[A-Za-z0-9]{20,}|xox[baprs]-[A-Za-z0-9-]{20,}|[0-9]{8,}:[A-Za-z0-9_-]{35,})\" .github frontend scripts tttg_forge_core tttg_forge_optimizer tttg_forge_wasm docs README.md LICENSE NOTICE"
run_check "AUTO-11 CSP header config" run_shell "test -f frontend/public/_headers && rg -q \"Content-Security-Policy\" frontend/public/_headers"
run_check "AUTO-12 robots route" run_shell "test -f frontend/app/robots.ts && rg -q \"sitemap.xml\" frontend/app/robots.ts"
run_check "AUTO-13 sitemap route" run_shell "test -f frontend/app/sitemap.ts && rg -q \"ROUTES\" frontend/app/sitemap.ts"
run_check "AUTO-14 og image presence" run_shell "test -s frontend/public/og-community.png"
run_check "AUTO-15 manifest json valid" run_shell "node -e \"const fs=require('fs'); const m=JSON.parse(fs.readFileSync('frontend/public/manifest.json','utf8')); if(!m.name || !m.start_url) process.exit(1)\""
run_check "AUTO-16 README bilingual sections" run_shell "rg -q \"## 한국어\" README.md && rg -q \"## English\" README.md"
run_check "AUTO-17 license and notice present" run_shell "test -s LICENSE && test -s NOTICE"
run_check "AUTO-18 changelog covers G10" run_shell "rg -q \"G.10\" docs/CHANGELOG.md"
run_check "AUTO-19 launch checklist split" run_shell "test \"\$(rg -c -- \"- \\[ \\] AUTO-\" LAUNCH_CHECKLIST.md)\" -eq 20 && test \"\$(rg -c -- \"- \\[ \\] MANUAL-\" LAUNCH_CHECKLIST.md)\" -eq 10"
run_check "AUTO-20 diff whitespace check" run_shell "git diff --check"

exit "$FAILED"
