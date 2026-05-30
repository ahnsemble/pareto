import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const outputRoot =
  process.env.SIO_ALL_OUTPUT_DIR ??
  path.join(os.tmpdir(), 'pareto_sio_all_verify');
const rollupPath = path.join(outputRoot, 'sio_all_rollup.json');

function runScript(label, script, env = {}) {
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
      let summary = null;
      try {
        summary = JSON.parse(stdout);
      } catch (error) {
        summary = { parseError: error.message, stdout };
      }
      resolve({ label, script, code, summary, stderr });
    });
  });
}

await fs.mkdir(outputRoot, { recursive: true });

const rows = [
  await runScript('default_golden', 'scripts/verify_sio_default_golden.mjs', {
    SIO_DEFAULT_GOLDEN_OUTPUT_DIR: path.join(outputRoot, 'default_golden'),
  }),
  await runScript('share_links', 'scripts/verify_sio_parity.mjs', {
    SIO_PARITY_OUTPUT_DIR: path.join(outputRoot, 'share_links'),
  }),
];

const summary = {
  outputRoot,
  rollupPath,
  checks: rows.length,
  passed: rows.filter((row) => row.code === 0).length,
  failed: rows.filter((row) => row.code !== 0).length,
};

await fs.writeFile(rollupPath, `${JSON.stringify({ generatedAt: new Date().toISOString(), summary, rows }, null, 2)}\n`);
console.log(JSON.stringify(summary, null, 2));

if (summary.failed > 0) {
  process.exitCode = 1;
}
