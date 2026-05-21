import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

const artifactRoot = path.join(process.cwd(), 'artifacts/td11');
const outputPath =
  process.env.OUTPUT_PATH ??
  path.join(artifactRoot, 'sio_compact_parity_matrix_check_s59.json');
const compactOnly = process.env.SIO_LM_COMPACT_ONLY ?? '1';
const useLmContext = process.env.USE_SIO_LM_CONTEXT ?? '1';

const fixtureDescriptors = [
  {
    id: 'default',
    fixturePath: 'artifacts/td11/sio_tech_optimizer_live_expected_2026-05-20.json',
    workerSummaryPath: 'artifacts/td11/sio_worker_decoded_summary_2026-05-20.json',
    lmTracePath: 'artifacts/td11/sio_lm_trace_summary_2026-05-20.json',
  },
  ...['shared_4ZgaBw', 'shared_ihACJy', 'shared_rm8mHx', 'shared_Zglrn9', 'shared_qN5n40', 'shared_zcpPVi'].map(
    (id) => ({
      id,
      fixturePath: `artifacts/td11/${id}/pareto_fixture.json`,
      workerSummaryPath: `artifacts/td11/${id}/worker_decoded_summary.json`,
      lmTracePath: `artifacts/td11/${id}/lm_trace_summary.json`,
    }),
  ),
];

function parseJsonStdout(stdout, script) {
  try {
    return JSON.parse(stdout);
  } catch (error) {
    throw new Error(`Could not parse ${script} stdout as JSON: ${error.message}\n${stdout}`);
  }
}

function runNodeScript(script, descriptor, outputSuffix) {
  const env = {
    ...process.env,
    USE_SIO_LM_CONTEXT: useLmContext,
    SIO_LM_COMPACT_ONLY: compactOnly,
    FIXTURE_PATH: descriptor.fixturePath,
    WORKER_SUMMARY_PATH: descriptor.workerSummaryPath,
    LM_TRACE_PATH: descriptor.lmTracePath,
    OUTPUT_PATH: path.join(
      artifactRoot,
      descriptor.id,
      `${outputSuffix}_compact_parity_matrix_s59.json`,
    ),
  };

  return new Promise((resolve) => {
    const child = spawn(process.execPath, [script], {
      cwd: process.cwd(),
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('close', (code) => {
      resolve({
        script,
        code,
        stdout,
        stderr,
        summary: code === 0 ? parseJsonStdout(stdout, script) : null,
      });
    });
  });
}

const rows = [];
for (const descriptor of fixtureDescriptors) {
  await fs.mkdir(path.join(artifactRoot, descriptor.id), { recursive: true });
  const worker = await runNodeScript(
    'scripts/sio_worker_golden_parity_check.mjs',
    descriptor,
    'worker',
  );
  const optimizer = await runNodeScript(
    'scripts/sio_tech_optimizer_parity_check.mjs',
    descriptor,
    'optimizer',
  );
  rows.push({
    id: descriptor.id,
    fixturePath: descriptor.fixturePath,
    worker,
    optimizer,
    pass:
      worker.code === 0 &&
      optimizer.code === 0 &&
      worker.summary?.passed === worker.summary?.cases &&
      optimizer.summary?.passed === optimizer.summary?.cases,
  });
}

const summary = {
  outputPath,
  useSioLmContext: useLmContext === '1',
  compactOnlyContext: compactOnly === '1',
  fixtures: fixtureDescriptors.length,
  passed: rows.filter((row) => row.pass).length,
  failed: rows.filter((row) => !row.pass).length,
  workerCases: rows.reduce((total, row) => total + (row.worker.summary?.cases ?? 0), 0),
  workerPassed: rows.reduce((total, row) => total + (row.worker.summary?.passed ?? 0), 0),
  optimizerCases: rows.reduce((total, row) => total + (row.optimizer.summary?.cases ?? 0), 0),
  optimizerPassed: rows.reduce((total, row) => total + (row.optimizer.summary?.passed ?? 0), 0),
};

const payload = {
  generatedAt: new Date().toISOString(),
  summary,
  rows,
};

await fs.writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
console.log(JSON.stringify(summary, null, 2));

if (summary.failed > 0 && process.env.ALLOW_MISMATCH !== '1') {
  process.exitCode = 1;
}
