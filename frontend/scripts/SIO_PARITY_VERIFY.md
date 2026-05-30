# SIO Parity Verification

`verify:sio-parity` replays the six checked share-link fixtures against the current worker source. The check must set `USE_SIO_LM_CONTEXT=1`; without the captured compact config and fresh trace context, a direct parity command can compare against stale or incomplete inputs and report a false mismatch.

Run from `frontend`:

```bash
npm run verify:sio-default-golden
npm run verify:sio-parity
npm run verify:sio-all
```

Expected `verify:sio-default-golden` summary:

```json
{
  "variants": 2,
  "passed": 2,
  "failed": 0,
  "cases": [3, 3],
  "multiplierPassed": [3, 3]
}
```

Expected `verify:sio-parity` summary:

```json
{
  "fixtures": 6,
  "passed": 6,
  "failed": 0,
  "exactWorkerParity": true
}
```

Expected `verify:sio-all` summary:

```json
{
  "checks": 2,
  "passed": 2,
  "failed": 0
}
```

Artifacts are written outside the repo by default so the verification does not dirty the worktree:

```text
${TMPDIR:-/tmp}/pareto_sio_parity_verify/
  shared_<code>/worker_decoded_summary_fresh.json
  shared_<code>/lm_trace_summary_fresh.json
  shared_<code>/worker_parity_fresh.json
  sio_parity_rollup.json
```

```text
${TMPDIR:-/tmp}/pareto_sio_default_golden_verify/
  default_plain_worker_golden.json
  default_lm_context_worker_golden.json
  sio_default_golden_rollup.json
```

The old manual form that only runs `node scripts/sio_worker_golden_parity_check.mjs` is incomplete for these share-link fixtures. The reproducible recipe is: generate the fresh worker summary, generate the LM trace from that summary, then run `sio_worker_golden_parity_check.mjs` with `USE_SIO_LM_CONTEXT=1`, `FIXTURE_PATH`, `WORKER_SUMMARY_PATH`, and `LM_TRACE_PATH` set for each shared fixture.

Default golden artifacts are source-freshness sensitive. If the materialized worker source changes, regenerate the default LM trace and rebaseline the default worker summary before treating the default 3-case gate as authoritative.
