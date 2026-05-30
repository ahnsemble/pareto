import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const sharedIds = ['shared_4ZgaBw', 'shared_ihACJy', 'shared_rm8mHx', 'shared_Zglrn9', 'shared_qN5n40', 'shared_zcpPVi'];
const artifactRoot = path.join(process.cwd(), 'artifacts/td11');
const outputRoot =
  process.env.SIO_PARITY_OUTPUT_DIR ??
  path.join(os.tmpdir(), 'pareto_sio_parity_verify');
const rollupPath = path.join(outputRoot, 'sio_parity_rollup.json');

function runScript(script, env) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [script], {
      cwd: process.cwd(),
      env: { ...process.env, ...env },
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
      resolve({ script, code, stdout, stderr });
    });
  });
}

function parseSummary(result) {
  try {
    return JSON.parse(result.stdout);
  } catch (error) {
    return {
      parseError: error.message,
      stdout: result.stdout,
    };
  }
}

async function verifySharedFixture(id) {
  const dir = path.join(outputRoot, id);
  await fs.mkdir(dir, { recursive: true });

  const workerSummaryPath = path.join(dir, 'worker_decoded_summary_fresh.json');
  const lmTracePath = path.join(dir, 'lm_trace_summary_fresh.json');
  const parityPath = path.join(dir, 'worker_parity_fresh.json');

  const workerSummary = await runScript('scripts/sio_worker_message_summary.mjs', {
    WORKER_MESSAGES_DIR: path.join(artifactRoot, id, 'worker-messages'),
    OUTPUT_PATH: workerSummaryPath,
  });

  const lmTrace =
    workerSummary.code === 0
      ? await runScript('scripts/sio_lm_trace_summary.mjs', {
          WORKER_SUMMARY_PATH: workerSummaryPath,
          OUTPUT_PATH: lmTracePath,
        })
      : null;

  const parity =
    lmTrace?.code === 0
      ? await runScript('scripts/sio_worker_golden_parity_check.mjs', {
          USE_SIO_LM_CONTEXT: '1',
          FIXTURE_PATH: path.join(artifactRoot, id, 'pareto_fixture.json'),
          WORKER_SUMMARY_PATH: workerSummaryPath,
          LM_TRACE_PATH: lmTracePath,
          OUTPUT_PATH: parityPath,
        })
      : null;

  const paritySummary = parity ? parseSummary(parity) : null;
  return {
    id,
    pass:
      workerSummary.code === 0 &&
      lmTrace?.code === 0 &&
      parity?.code === 0 &&
      paritySummary?.cases === 1 &&
      paritySummary?.passed === 1 &&
      paritySummary?.multiplierPassed === 1 &&
      paritySummary?.fullRowPassed === 1 &&
      paritySummary?.scoringContextPassed === 1,
    artifacts: {
      workerSummaryPath,
      lmTracePath,
      parityPath,
    },
    workerSummary: {
      code: workerSummary.code,
      summary: parseSummary(workerSummary),
      stderr: workerSummary.stderr,
    },
    lmTrace: lmTrace
      ? {
          code: lmTrace.code,
          summary: parseSummary(lmTrace),
          stderr: lmTrace.stderr,
        }
      : null,
    parity: parity
      ? {
          code: parity.code,
          summary: paritySummary,
          stderr: parity.stderr,
        }
      : null,
  };
}

await fs.mkdir(outputRoot, { recursive: true });

const rows = [];
for (const id of sharedIds) {
  rows.push(await verifySharedFixture(id));
}

const summary = {
  outputRoot,
  rollupPath,
  useSioLmContext: true,
  fixtures: rows.length,
  passed: rows.filter((row) => row.pass).length,
  failed: rows.filter((row) => !row.pass).length,
  exactWorkerParity: rows.every((row) => row.pass),
};

const payload = {
  generatedAt: new Date().toISOString(),
  summary,
  rows,
};

await fs.writeFile(rollupPath, `${JSON.stringify(payload, null, 2)}\n`);
console.log(JSON.stringify(summary, null, 2));

if (summary.failed > 0) {
  process.exitCode = 1;
}
