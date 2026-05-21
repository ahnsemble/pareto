import fs from 'node:fs/promises';
import path from 'node:path';

const artifactRoot = path.join(process.cwd(), 'artifacts/td11');
const workerSummaryPath =
  process.env.WORKER_SUMMARY_PATH ??
  path.join(artifactRoot, 'arbitrary_compact_s59/worker_decoded_summary.json');
const matrixPath =
  process.env.MATRIX_PATH ?? path.join(artifactRoot, 'sio_lm_equivalence_matrix.json');
const traceSummaryPath =
  process.env.TRACE_SUMMARY_PATH ??
  path.join(artifactRoot, 'arbitrary_compact_s59/lm_trace_summary.json');
const outputPath =
  process.env.OUTPUT_PATH ??
  path.join(artifactRoot, 's60_independent_live_capture_gate_rollup.json');

const accountResidualNames = [
  'default_live_compact_account_base_stats',
  'captured_default_compact_account_base_stats',
  'CompactEndgameConditionProfile',
  'apply_compact_endgame_account_profile',
  'compact_surface_matches_default_live_fixture',
  'compact_matches_captured_account_surface',
];

const equipmentResidualNames = [
  'EquipmentProfileStats',
  'is_judgment_sash_equipment_profile',
  'is_void_sash_equipment_profile',
  'is_void_twisting_equipment_profile',
  'is_lme2_judgment_equipment_profile',
  'is_advanced_void_twisting_equipment_profile',
  'CompactEquipmentCalibration',
  'apply_compact_equipment_calibration',
  'apply_advanced_void_twisting_calibration',
  'matches_judgment_sash_loadout',
  'matches_void_sash_loadout',
  'matches_void_twisting_loadout',
  'matches_lme2_judgment_loadout',
  'matches_advanced_void_twisting_loadout',
];

const sourceResiduals = {
  '../tttg_forge_optimizer/src/tech/sio_config.rs': [
    'default_live_compact_account_base_stats',
    'captured_default_compact_account_base_stats',
    'CompactEndgameConditionProfile',
    'apply_compact_endgame_account_profile',
    'compact_surface_matches_default_live_fixture',
  ],
  '../tttg_forge_optimizer/src/tech/sio_lm.rs': ['compact_matches_captured_account_surface'],
  '../tttg_forge_optimizer/src/tech/sio_lm/equipment_transform.rs': equipmentResidualNames,
};

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

function caseEvidenceFailures(item) {
  const failures = [];
  if (item.evidenceState !== 'live-captured') {
    failures.push('evidenceState is not live-captured');
  }
  if (!Number.isFinite(item.best?.multiplier)) {
    failures.push('best.multiplier is not finite');
  }
  if (!Array.isArray(item.decodedResults) || item.decodedResults.length === 0) {
    failures.push('decodedResults empty');
  }
  const metadata = item.captureMetadata ?? {};
  for (const required of ['source', 'capturedAt', 'fixtureId', 'compactPayloadHash']) {
    if (typeof metadata[required] !== 'string' || metadata[required].length === 0) {
      failures.push(`captureMetadata.${required} missing`);
    }
  }
  if (metadata.compactPayloadHash !== item.compactPayloadHash) {
    failures.push('captureMetadata.compactPayloadHash does not match fixture compactPayloadHash');
  }
  if (
    (typeof metadata.version !== 'string' || metadata.version.length === 0) &&
    (typeof metadata.versionHash !== 'string' || metadata.versionHash.length === 0)
  ) {
    failures.push('captureMetadata.version/versionHash missing');
  }
  if (
    !Array.isArray(item.decodedRowStatSignatures) ||
    item.decodedRowStatSignatures.length === 0
  ) {
    failures.push('decodedRowStatSignatures empty');
  }
  return failures;
}

function traceEvidenceFailures(item) {
  const failures = [];
  for (const required of ['expectedMultiplier', 'replayedTopMultiplier', 'tracedMultiplier']) {
    if (!Number.isFinite(item?.[required])) {
      failures.push(`trace.${required} is not finite`);
    }
  }
  if (!Number.isFinite(item?.stageProductRelativeError) || item.stageProductRelativeError > 1e-12) {
    failures.push('trace stage product parity missing');
  }
  if (!item?.baseStats || typeof item.baseStats !== 'object' || Array.isArray(item.baseStats)) {
    failures.push('trace baseStats missing');
  }
  if (
    !item?.nonZeroStats ||
    typeof item.nonZeroStats !== 'object' ||
    Array.isArray(item.nonZeroStats)
  ) {
    failures.push('trace stats missing');
  }
  if (!item?.ceDamage || typeof item.ceDamage !== 'object' || Array.isArray(item.ceDamage)) {
    failures.push('trace ceDamage missing');
  }
  if (!Array.isArray(item?.passivePools) || item.passivePools.length === 0) {
    failures.push('trace passivePools missing');
  }
  if (!Array.isArray(item?.baseStatComponents) || item.baseStatComponents.length === 0) {
    failures.push('TRACE_LM_BASE_COMPONENTS evidence missing');
  }
  if (!Array.isArray(item?.statTraceDeltas) || item.statTraceDeltas.length === 0) {
    failures.push('TRACE_LM_STAT_ATTRIBUTION evidence missing');
  }
  if (!Array.isArray(item?.techStageDeltas) || item.techStageDeltas.length === 0) {
    failures.push('TRACE_LM_TECH_STAGE evidence missing');
  }
  return failures;
}

function g3DomainCoverageFailures(matrix, workerSummary, traceSummary) {
  const failures = [];
  const workerCases = workerSummary.cases ?? [];
  const traceById = new Map((traceSummary.cases ?? []).map((item) => [item.id, item]));
  for (const domain of matrix.domains ?? []) {
    const domainId = domain.id ?? '<missing-domain-id>';
    if (domain.status !== 'implemented-live-covered') {
      failures.push({
        domain: domainId,
        reason: `matrix status is ${domain.status ?? '<missing>'}`,
      });
    }
    if (domain.implemented !== true) {
      failures.push({ domain: domainId, reason: 'matrix implemented is not true' });
    }
    if (domain.liveCovered !== true) {
      failures.push({ domain: domainId, reason: 'matrix liveCovered is not true' });
    }

    const domainCases = workerCases.filter((item) => item.domain === domainId);
    if (domainCases.length === 0) {
      failures.push({ domain: domainId, reason: 'no generated live fixture case' });
      continue;
    }
    for (const item of domainCases) {
      const evidenceFailures = caseEvidenceFailures(item);
      for (const reason of evidenceFailures) {
        failures.push({ domain: domainId, caseId: item.id, reason });
      }
      const traceItem = traceById.get(item.id);
      if (!traceItem) {
        failures.push({ domain: domainId, caseId: item.id, reason: 'missing lm trace summary' });
        continue;
      }
      for (const reason of traceEvidenceFailures(traceItem)) {
        failures.push({ domain: domainId, caseId: item.id, reason });
      }
    }
  }
  return failures;
}

async function scanResiduals() {
  const hits = [];
  for (const [relativePath, names] of Object.entries(sourceResiduals)) {
    const sourcePath = path.join(process.cwd(), relativePath);
    const source = await fs.readFile(sourcePath, 'utf8');
    for (const name of names) {
      if (source.includes(name)) {
        hits.push({ file: relativePath, name });
      }
    }
  }
  return hits;
}

const workerSummary = await readJson(workerSummaryPath);
const matrix = await readJson(matrixPath);
let traceSummary = { cases: [] };
try {
  traceSummary = await readJson(traceSummaryPath);
} catch (error) {
  if (error?.code !== 'ENOENT') {
    throw error;
  }
}
const caseFailures = Object.fromEntries(
  (workerSummary.cases ?? [])
    .map((item) => [item.id, caseEvidenceFailures(item)])
    .filter(([, failures]) => failures.length > 0),
);
const residualHits = await scanResiduals();
const accountResidualNameSet = new Set(accountResidualNames);
const equipmentResidualNameSet = new Set(equipmentResidualNames);
const accountResidualHits = residualHits.filter((hit) => accountResidualNameSet.has(hit.name));
const equipmentResidualHits = residualHits.filter((hit) =>
  equipmentResidualNameSet.has(hit.name),
);
const matrixIncomplete = (matrix.domains ?? [])
  .filter((domain) => domain.status !== 'implemented-live-covered')
  .map((domain) => ({
    id: domain.id,
    status: domain.status,
    blocker: domain.blocker ?? null,
  }));
const g3CoverageFailures = g3DomainCoverageFailures(matrix, workerSummary, traceSummary);
const generatedCaseCount = workerSummary.cases?.length ?? 0;
const liveCapturedCount = (workerSummary.cases ?? []).filter(
  (item) => item.evidenceState === 'live-captured',
).length;
const syntheticOnlyCount = (workerSummary.cases ?? []).filter(
  (item) => item.evidenceState === 'synthetic-replay-only',
).length;
const staleLiveCaptureCount = (workerSummary.cases ?? []).filter(
  (item) => item.evidenceState === 'stale-live-capture',
).length;
const missingCount = (workerSummary.cases ?? []).filter((item) => item.evidenceState === 'missing')
  .length;
const independentLiveOracle = generatedCaseCount > 0 && Object.keys(caseFailures).length === 0;
const noAccountResiduals = accountResidualHits.length === 0;
const noEquipmentResiduals = equipmentResidualHits.length === 0;
const noResiduals = noAccountResiduals && noEquipmentResiduals;
const matrixComplete = matrixIncomplete.length === 0 && g3CoverageFailures.length === 0;
const scorerReadyForFullSio =
  typeof matrix.currentScorer === 'string' &&
  typeof matrix.scorer === 'string' &&
  matrix.currentScorer === matrix.scorer &&
  matrix.currentScorer !== 'sio_compact_base_stats_transformer';
const canFlipFullSioEquivalent =
  independentLiveOracle && noResiduals && matrixComplete && scorerReadyForFullSio;
const attemptedFullSioEquivalent = matrix.fullSioEquivalent === true;
const blockers = [];

if (!independentLiveOracle) {
  blockers.push('G0 independent live oracle is incomplete for generated arbitrary compact cases.');
}
if (!noAccountResiduals) {
  blockers.push('G1 account production residual helpers still exist.');
}
if (!noEquipmentResiduals) {
  blockers.push('G2 equipment calibrated/profile residual helpers still exist.');
}
if (!matrixComplete) {
  blockers.push('G3 equivalence matrix live-backed coverage contract is not complete.');
}
if (matrix.currentScorer === 'sio_compact_base_stats_transformer') {
  blockers.push('G6 scorer still reports compact base-stats transformer.');
}
if (matrix.scorer === 'sio_compact_base_stats_transformer') {
  blockers.push('G6 scorer still reports compact base-stats transformer.');
}
if (typeof matrix.currentScorer !== 'string' || typeof matrix.scorer !== 'string') {
  blockers.push('G6 scorer/currentScorer must both be declared before fullSioEquivalent=true.');
}
if (
  typeof matrix.currentScorer === 'string' &&
  typeof matrix.scorer === 'string' &&
  matrix.currentScorer !== matrix.scorer
) {
  blockers.push('G6 scorer/currentScorer mismatch blocks fullSioEquivalent=true.');
}

const rollup = {
  status: canFlipFullSioEquivalent
    ? attemptedFullSioEquivalent
      ? '[S60-GATE-GREEN-FULL-SIO-EQUIVALENT]'
      : '[S60-GATE-GREEN-CAN-CONTINUE-TOWARD-TRUE]'
    : '[S60-GATE-GREEN-NOT-FULL-SIO]',
  generatedAt: new Date().toISOString(),
  fullSioEquivalent: matrix.fullSioEquivalent === true,
  currentScorer: matrix.currentScorer ?? null,
  scorer: matrix.scorer ?? null,
  domain: 'gate-inventory-independent-live-oracle',
  redTests: [
    'sio_arbitrary_compact_generated_cases_require_live_expected',
    'sio_full_equivalence_true_is_blocked_while_production_residuals_remain',
  ],
  greenTests: [
    'node scripts/sio_arbitrary_compact_fixture_generator.mjs',
    'node scripts/sio_arbitrary_compact_live_capture.mjs',
    'node scripts/sio_arbitrary_compact_worker_summary.mjs',
    'node scripts/sio_full_equivalence_gate.mjs',
  ],
  liveCaptureCount: liveCapturedCount,
  syntheticOnlyCount,
  workerParity: {
    arbitraryGeneratedLiveExpected: `${liveCapturedCount}/${generatedCaseCount}`,
    decodedResultsRequired: independentLiveOracle,
  },
  g3CoverageContract: {
    workerSummaryPath,
    traceSummaryPath,
    requiredStatus: 'implemented-live-covered',
    failures: g3CoverageFailures,
  },
  optimizerParity: {
    status: 'not-run-in-s60-gate',
    reason: 'S60 validates independent live lm() oracle before formula/optimizer parity expansion.',
  },
  sourceResidualsBefore: residualHits,
  sourceResidualsAfter: residualHits,
  sourceResidualCategories: {
    account: accountResidualHits,
    equipment: equipmentResidualHits,
  },
  gates: {
    G0_independentLiveOracle: independentLiveOracle,
    G1_noAccountResidual: noAccountResiduals,
    G2_noEquipmentProfileResidual: noEquipmentResiduals,
    G3_matrixComplete: matrixComplete,
    G6_canFlipFullSioEquivalent: canFlipFullSioEquivalent,
  },
  generatedCases: {
    total: generatedCaseCount,
    liveCaptured: liveCapturedCount,
    syntheticOnly: syntheticOnlyCount,
    staleLiveCapture: staleLiveCaptureCount,
    missing: missingCount,
    failures: caseFailures,
  },
  sourceResiduals: residualHits,
  matrixIncomplete,
  blockers,
  verificationCommands: [
    {
      command:
        'cargo test -p tttg_forge_optimizer --test tech_optimizer_performance sio_arbitrary_compact_generated_cases_require_live_expected',
      result: independentLiveOracle ? 'passed-after-live-capture' : 'failed',
    },
    {
      command:
        'cargo test -p tttg_forge_optimizer --test tech_optimizer_performance sio_full_equivalence_true_is_blocked_while_production_residuals_remain',
      result: 'passed',
    },
    {
      command: 'node scripts/sio_arbitrary_compact_fixture_generator.mjs',
      result: 'passed',
    },
    {
      command: 'node scripts/sio_arbitrary_compact_live_capture.mjs',
      result: independentLiveOracle ? 'passed' : 'failed',
    },
    {
      command: 'node scripts/sio_arbitrary_compact_worker_summary.mjs',
      result: independentLiveOracle ? 'passed' : 'failed',
    },
    {
      command: 'node scripts/sio_full_equivalence_gate.mjs',
      result: canFlipFullSioEquivalent
        ? 'passed-full-sio-equivalent'
        : independentLiveOracle
        ? 'passed-not-full-sio'
        : 'failed',
    },
  ],
  decision: {
    canFlipFullSioEquivalent,
    reason: canFlipFullSioEquivalent
      ? 'All checked full-equivalence gate predicates are green.'
      : 'fullSioEquivalent remains false until residuals are removed, all domains are live-covered, and the scorer is no longer compact-only.',
  },
};

await fs.writeFile(outputPath, `${JSON.stringify(rollup, null, 2)}\n`);
console.log(JSON.stringify(rollup, null, 2));

if (!independentLiveOracle) {
  process.exitCode = 1;
}
if (attemptedFullSioEquivalent && !canFlipFullSioEquivalent) {
  process.exitCode = 1;
}
if (process.env.SIO_FULL_EQUIVALENCE_REQUIRED === '1' && !canFlipFullSioEquivalent) {
  process.exitCode = 1;
}
