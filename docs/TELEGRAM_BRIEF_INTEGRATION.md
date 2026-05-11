# Telegram Brief Integration Path

- Date: 2026-05-11 KST
- Branch: `sprint-g-rust-integration`
- Scope: Pareto regression brief integration boundary
- Status: documented

## Purpose

This note closes the S33 traceability gap for the Telegram morning brief script used in the
Woosdom regression workflow. The executable script is intentionally outside the Pareto
repository, while the Pareto repository owns the GitHub Actions `telegram_brief` job that
posts the weekly regression status when Telegram secrets are present.

The split is important for launch review:

- Pareto repository: owns product code, regression workflows, static export, and launch docs.
- Woosdom vault: owns cross-project operator automation such as the morning brief script.
- GitHub Actions: owns the Pareto production regression brief path through `.github/workflows/regression.yml`.

## Script Location

The active morning brief script was found at:

```text
/Users/woosung/Desktop/Dev/Woosdom_Brain/05_Projects/task_bridge/morning_brief.py
```

The search command used from `/Users/woosung/Desktop` was:

```bash
find /Users/woosung/Desktop/Dev -name morning_brief.py -type f
```

It returned the active task-bridge script and one backup copy:

```text
/Users/woosung/Desktop/Dev/Woosdom_Brain/05_Projects/task_bridge/morning_brief.py
/Users/woosung/Desktop/Dev/Woosdom_Brain/_backup_health100/morning_brief.py
```

The active script fingerprint on 2026-05-11 KST was:

```text
sha256: c29ce5b64f29bb60012fa6731bfd3cea781e93d3c2a9795bddb79d95368e8ee2
size: 25061 bytes
modified: May 6 20:53:05 2026
```

Syntax verification was run with:

```bash
python3 -m py_compile /Users/woosung/Desktop/Dev/Woosdom_Brain/05_Projects/task_bridge/morning_brief.py
```

Result: exit `0`.

## Runtime Interface

The script exposes an argparse interface with these relevant modes:

```text
--dry-run
--test
```

The environment variables read by the Telegram dispatch path are:

```text
TELEGRAM_BOT_TOKEN
TG_BOT_TOKEN
TELEGRAM_CHAT_ID
TG_CHAT_ID
ALLOWED_USERS
```

Secret values are never stored in this repository. A real outbound Telegram dispatch remains
an operator-approved action because it crosses the local development boundary and uses live
credentials.

## Pareto Workflow Boundary

Pareto production regression messages are sent by:

```text
.github/workflows/regression.yml
job: telegram_brief
```

That job is secrets-gated. If `TELEGRAM_BOT_TOKEN` or `TELEGRAM_CHAT_ID` is missing, the job
prints a skip message and exits successfully. If both secrets exist, the job posts aggregate
status for:

```text
cargo
bench_regression
pytest_battery
frontend_build
playwright_pareto
```

This means Pareto launch readiness does not depend on checking a vault script into the public
repository. The repository-local dispatch path is the GitHub Actions job; the vault script is
operator automation used for broader Woosdom daily and regression summaries.

## Schedule

The Pareto regression workflow is scheduled as:

```text
0 14 * * 0 UTC
```

Korean standard time is UTC plus nine hours, so this is:

```text
Sunday 23:00 KST
```

The schedule remains consistent with the S31 verification ledger: it runs after the Sunday
regression window and before the Monday operating cycle.

## Review Notes

The prior S31 Telegram ledger recorded successful local `--test` and `--dry-run` execution,
but did not name the script path or file hash. This document provides that missing evidence.
The real Telegram send path remains approval-gated and is not re-attempted here.

For future audits, use the following evidence chain:

1. Confirm this document names the active vault path and sha256.
2. Confirm `.github/workflows/regression.yml` still contains the `telegram_brief` job.
3. Confirm the cron schedule remains `0 14 * * 0`.
4. Confirm live Telegram secrets are handled only by GitHub Actions secrets or the operator
   runtime environment.

## Result

The morning brief traceability gap is closed for S33. The active script is outside the Pareto
repository by design, its path and hash are now documented in the repository, and the Pareto
production dispatch path remains the secrets-gated GitHub Actions regression job.
