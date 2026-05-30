import fs from 'node:fs/promises';
import path from 'node:path';

import { rebaselineWorkerSummaryFromTrace } from './lib/sio_default_golden_rebaseline.mjs';

const workerSummaryPath =
  process.env.WORKER_SUMMARY_PATH ??
  path.join(process.cwd(), 'artifacts/td11/sio_worker_decoded_summary_2026-05-20.json');
const lmTracePath =
  process.env.LM_TRACE_PATH ??
  path.join(process.cwd(), 'artifacts/td11/sio_lm_trace_summary_2026-05-20.json');
const outputPath = process.env.OUTPUT_PATH ?? workerSummaryPath;

const workerSummary = JSON.parse(await fs.readFile(workerSummaryPath, 'utf8'));
const lmTrace = JSON.parse(await fs.readFile(lmTracePath, 'utf8'));
const rebaselined = rebaselineWorkerSummaryFromTrace(workerSummary, lmTrace, {
  source: lmTracePath,
});

await fs.writeFile(outputPath, `${JSON.stringify(rebaselined, null, 2)}\n`);

console.log(
  JSON.stringify(
    {
      workerSummaryPath,
      lmTracePath,
      outputPath,
      updatedCases: rebaselined.rebaseline.updatedCases.length,
      cases: rebaselined.cases?.length ?? 0,
    },
    null,
    2,
  ),
);
