import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const root = process.cwd();
const sourceDir = '/private/tmp/sio-tools-src.current';
const outputPath = '/private/tmp/sio_lm_trace_attribution_unit_test.json';

await execFileAsync('node', ['scripts/sio_lm_trace_summary.mjs'], {
  cwd: root,
  env: {
    ...process.env,
    SIO_WORKER_SRC_DIR: sourceDir,
    WORKER_SUMMARY_PATH: 'artifacts/td11/shared_qN5n40/worker_decoded_summary.json',
    OUTPUT_PATH: outputPath,
    TRACE_LM_BASE_COMPONENTS: '1',
    TRACE_LM_STAT_ATTRIBUTION: '1',
    TRACE_LM_TECH_STAGE: '1',
  },
  maxBuffer: 8 * 1024 * 1024,
});

const payload = JSON.parse(await fs.readFile(outputPath, 'utf8'));
const traceCase = payload.cases[0];
assert.ok(Array.isArray(traceCase.statTraceDeltas), 'statTraceDeltas should be emitted');
assert.ok(
  traceCase.statTraceDeltas.some((entry) => entry.delta?.shieldDamage || entry.delta?.vulnerability),
  'statTraceDeltas should include tracked equipment residual stats',
);
assert.ok(
  traceCase.statTraceDeltas.some((entry) => entry.label === 'afterEquipmentDynamicSpecials'),
  'statTraceDeltas should include the equipment dynamic specials stage',
);
assert.ok(Array.isArray(traceCase.techStageDeltas), 'techStageDeltas should be emitted');
assert.ok(
  traceCase.techStageDeltas.some((entry) => Number(entry.delta?.vulnerability) !== 0),
  'techStageDeltas should include per-tech vulnerability attribution',
);

console.log(
  JSON.stringify(
    {
      outputPath: path.relative(root, outputPath),
      deltas: traceCase.statTraceDeltas.length,
      techDeltas: traceCase.techStageDeltas.length,
    },
    null,
    2,
  ),
);
