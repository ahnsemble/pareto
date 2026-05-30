import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const outputRoot =
  process.env.SIO_DEFAULT_GOLDEN_OUTPUT_DIR ??
  path.join(os.tmpdir(), 'pareto_sio_default_golden_verify');
const rollupPath = path.join(outputRoot, 'sio_default_golden_rollup.json');

function runGoldenCheck(label, env) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ['scripts/sio_worker_golden_parity_check.mjs'], {
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
      let summary = null;
      try {
        summary = JSON.parse(stdout);
      } catch (error) {
        summary = { parseError: error.message, stdout };
      }
      resolve({ label, code, summary, stderr });
    });
  });
}

await fs.mkdir(outputRoot, { recursive: true });

const rows = [
  await runGoldenCheck('default_plain', {
    OUTPUT_PATH: path.join(outputRoot, 'default_plain_worker_golden.json'),
  }),
  await runGoldenCheck('default_lm_context', {
    USE_SIO_LM_CONTEXT: '1',
    OUTPUT_PATH: path.join(outputRoot, 'default_lm_context_worker_golden.json'),
  }),
];

const summary = {
  outputRoot,
  rollupPath,
  variants: rows.length,
  passed: rows.filter((row) => row.code === 0 && row.summary?.cases === 3 && row.summary?.passed === 3).length,
  failed: rows.filter((row) => !(row.code === 0 && row.summary?.cases === 3 && row.summary?.passed === 3)).length,
  cases: rows.map((row) => row.summary?.cases ?? 0),
  multiplierPassed: rows.map((row) => row.summary?.multiplierPassed ?? 0),
};

await fs.writeFile(rollupPath, `${JSON.stringify({ generatedAt: new Date().toISOString(), summary, rows }, null, 2)}\n`);
console.log(JSON.stringify(summary, null, 2));

if (summary.failed > 0) {
  process.exitCode = 1;
}
