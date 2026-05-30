import assert from 'node:assert/strict';

import { predeployCommands } from './tangtang_predeploy_verify.mjs';

const labels = predeployCommands.map((command) => command.label);

const requiredLabels = [
  'node scripts/sio_worker_source_discovery_unit_test.mjs',
  'node scripts/sio_worker_source_materialize_unit_test.mjs',
  'node scripts/sio_lm_trace_alignment_unit_test.mjs',
  'node scripts/sio_arbitrary_compact_live_capture_patch_unit_test.mjs',
  'node scripts/tangtang_language_toggle_unit_test.mjs',
  'node scripts/tangtang_tech_profile_storage_unit_test.mjs',
  'node scripts/tangtang_tech_profile_share_unit_test.mjs',
  'node scripts/tangtang_tech_action_layout_unit_test.mjs',
  'node scripts/tech_upgrade_recommendations_unit_test.mjs',
  'node scripts/tangtang_public_download_surface_unit_test.mjs',
  'node scripts/external_calculation_link_unit_test.mjs',
  'node scripts/sio_lm_context_unit_test.mjs',
  'node scripts/sio_generated_optimizer_parity_gate_unit_test.mjs',
  'npx tsc --noEmit',
  'SIO_FULL_EQUIVALENCE_REQUIRED=1 node scripts/sio_full_equivalence_gate.mjs',
  'node scripts/sio_generated_optimizer_parity_gate.mjs',
  'npm run build',
  'node scripts/tangtang_public_build_surface_unit_test.mjs',
];

for (const label of requiredLabels) {
  assert.ok(labels.includes(label), `missing predeploy command: ${label}`);
}

assert.equal(new Set(labels).size, labels.length, 'predeploy commands must not repeat');

const fullEquivalenceCommand = predeployCommands.find((command) =>
  command.label.includes('sio_full_equivalence_gate.mjs'),
);
assert.equal(fullEquivalenceCommand.env.SIO_FULL_EQUIVALENCE_REQUIRED, '1');

assert.ok(
  labels.indexOf('node scripts/sio_generated_optimizer_parity_gate_unit_test.mjs') <
    labels.indexOf('node scripts/sio_generated_optimizer_parity_gate.mjs'),
);
assert.ok(
  labels.indexOf('npm run build') <
    labels.indexOf('node scripts/tangtang_public_build_surface_unit_test.mjs'),
);

console.log('tangtang_predeploy_verify_unit_test: passed');
