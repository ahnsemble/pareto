import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
export const frontendRoot = resolve(scriptDir, '..');

export const predeployCommands = [
  command('node scripts/sio_worker_source_discovery_unit_test.mjs', process.execPath, [
    'scripts/sio_worker_source_discovery_unit_test.mjs',
  ]),
  command('node scripts/sio_worker_source_materialize_unit_test.mjs', process.execPath, [
    'scripts/sio_worker_source_materialize_unit_test.mjs',
  ]),
  command('node scripts/sio_lm_trace_alignment_unit_test.mjs', process.execPath, [
    'scripts/sio_lm_trace_alignment_unit_test.mjs',
  ]),
  command('node scripts/sio_arbitrary_compact_live_capture_patch_unit_test.mjs', process.execPath, [
    'scripts/sio_arbitrary_compact_live_capture_patch_unit_test.mjs',
  ]),
  command('node scripts/tangtang_language_toggle_unit_test.mjs', process.execPath, [
    'scripts/tangtang_language_toggle_unit_test.mjs',
  ]),
  command('node scripts/tangtang_tech_profile_storage_unit_test.mjs', process.execPath, [
    'scripts/tangtang_tech_profile_storage_unit_test.mjs',
  ]),
  command('node scripts/tangtang_tech_profile_share_unit_test.mjs', process.execPath, [
    'scripts/tangtang_tech_profile_share_unit_test.mjs',
  ]),
  command('node scripts/tangtang_tech_action_layout_unit_test.mjs', process.execPath, [
    'scripts/tangtang_tech_action_layout_unit_test.mjs',
  ]),
  command('node scripts/tech_upgrade_recommendations_unit_test.mjs', process.execPath, [
    'scripts/tech_upgrade_recommendations_unit_test.mjs',
  ]),
  command('node scripts/tangtang_public_download_surface_unit_test.mjs', process.execPath, [
    'scripts/tangtang_public_download_surface_unit_test.mjs',
  ]),
  command('node scripts/external_calculation_link_unit_test.mjs', process.execPath, [
    'scripts/external_calculation_link_unit_test.mjs',
  ]),
  command('node scripts/sio_lm_context_unit_test.mjs', process.execPath, [
    'scripts/sio_lm_context_unit_test.mjs',
  ]),
  command('node scripts/sio_generated_optimizer_parity_gate_unit_test.mjs', process.execPath, [
    'scripts/sio_generated_optimizer_parity_gate_unit_test.mjs',
  ]),
  command('npx tsc --noEmit', 'npx', ['tsc', '--noEmit']),
  command(
    'SIO_FULL_EQUIVALENCE_REQUIRED=1 node scripts/sio_full_equivalence_gate.mjs',
    process.execPath,
    ['scripts/sio_full_equivalence_gate.mjs'],
    { SIO_FULL_EQUIVALENCE_REQUIRED: '1' },
  ),
  command('node scripts/sio_generated_optimizer_parity_gate.mjs', process.execPath, [
    'scripts/sio_generated_optimizer_parity_gate.mjs',
  ]),
  command('npm run build', 'npm', ['run', 'build']),
  command('node scripts/tangtang_public_build_surface_unit_test.mjs', process.execPath, [
    'scripts/tangtang_public_build_surface_unit_test.mjs',
  ]),
];

function command(label, executable, args, env = {}) {
  return { label, executable, args, env };
}

function runCommand(commandConfig, index, total) {
  return new Promise((resolveCommand) => {
    console.log(`[${index + 1}/${total}] ${commandConfig.label}`);
    const child = spawn(commandConfig.executable, commandConfig.args, {
      cwd: frontendRoot,
      env: { ...process.env, ...commandConfig.env },
      stdio: 'inherit',
    });

    child.on('error', (error) => {
      resolveCommand({
        ...commandConfig,
        status: 'error',
        error: error.message,
      });
    });
    child.on('close', (exitCode, signal) => {
      resolveCommand({
        ...commandConfig,
        status: exitCode === 0 ? 'passed' : 'failed',
        exitCode,
        signal,
      });
    });
  });
}

export async function runPredeployVerify(commands = predeployCommands) {
  const results = [];
  for (const [index, commandConfig] of commands.entries()) {
    const result = await runCommand(commandConfig, index, commands.length);
    results.push(result);
    if (result.status !== 'passed') {
      return { status: 'failed', failedCommand: result, results };
    }
  }
  return { status: 'passed', results };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const summary = await runPredeployVerify();
  const printable = {
    status: summary.status,
    commandCount: summary.results.length,
    failedCommand: summary.failedCommand?.label ?? null,
    exitCode: summary.failedCommand?.exitCode ?? null,
    signal: summary.failedCommand?.signal ?? null,
    error: summary.failedCommand?.error ?? null,
  };
  const output = JSON.stringify(printable, null, 2);
  if (summary.status === 'passed') {
    console.log(output);
  } else {
    console.error(output);
    process.exitCode = 1;
  }
}
