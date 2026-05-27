import fs from 'node:fs/promises';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import init, { tech_optimizer_run_js } from '../../tttg_forge_wasm/pkg/tttg_forge_wasm.js';
import { applySioLmContext } from './lib/sio_lm_context.mjs';

const artifactRoot = path.join(process.cwd(), 'artifacts/td11');
const generatedRoot = path.join(artifactRoot, 'arbitrary_compact_s59');
const manifestPath = process.env.MANIFEST_PATH ?? path.join(generatedRoot, 'compact_fixture_manifest.json');
const workerSummaryPath = process.env.WORKER_SUMMARY_PATH ?? path.join(generatedRoot, 'worker_decoded_summary.json');
const lmTracePath = process.env.LM_TRACE_PATH ?? path.join(generatedRoot, 'lm_trace_summary.json');
const matrixPath = process.env.MATRIX_PATH ?? path.join(artifactRoot, 'sio_lm_equivalence_matrix.json');
const baseFixturePath =
  process.env.BASE_FIXTURE_PATH ?? path.join(artifactRoot, 'sio_tech_optimizer_live_expected_2026-05-20.json');
const outputPath =
  process.env.OUTPUT_PATH ?? path.join(artifactRoot, 'sio_generated_optimizer_parity_gate.json');

const suppliedScorer = 'sio_full_lm_equivalence';
const multiplierTolerance = 1e-9;
const caseLimit = Number(process.env.CASE_LIMIT ?? 0);

const speedModeNames = ['normal', 'fast', 'precise', 'precise+', 'full'];
const modeNameToId = {
  'Molotov Mode': 'molotovMode',
  'Durian Mode': 'durianMode',
  'Soccer Mode': 'soccerMode',
  'Drone Mode': 'droneMode',
  'Forcefield Mode': 'forcefieldMode',
  'Drill Shot Mode': 'drillShotMode',
  'Rocket Mode': 'rocketMode',
  'Lightning Mode': 'lightningMode',
  'Boomerang Mode': 'boomerangMode',
  'Guardian Mode': 'guardianMode',
  'Laser Mode': 'laserMode',
  'Brick Mode': 'brickMode',
};

const skillOrder = [
  'Energy Cube',
  'HP Bullet',
  'Exo Bracer',
  'Ammo Thruster',
  'HE Fuel',
  'Drone Mode',
  'Forcefield Mode',
  'Drill Shot Mode',
  'Rocket Mode',
  'Soccer Mode',
  'Durian Mode',
  'Lightning Mode',
  'Boomerang Mode',
  'Guardian Mode',
  'Laser Mode',
  'Brick Mode',
  'Molotov Mode',
  'Molotov',
  'Rocket',
  'Drone',
  'Drill',
];
const passiveSkills = new Set(['Energy Cube', 'HP Bullet', 'Exo Bracer', 'Ammo Thruster', 'HE Fuel']);

const wasmPath = new URL('../../tttg_forge_wasm/pkg/tttg_forge_wasm_bg.wasm', import.meta.url);
await init({ module_or_path: await readFile(wasmPath) });

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

function normalizeInputs(inputs) {
  return Object.fromEntries(
    Object.entries(inputs ?? {})
      .map(([key, value]) => [key.toLowerCase(), value])
      .filter(([, value]) => Number(value) > 0),
  );
}

function optimizerOptions(traceCase, workerCase) {
  const optimizer = traceCase?.expandedConfig?.techsOptimizer ?? {};
  const workerRequest = workerCase?.skillsRequests?.[workerCase?.best?.requestIndex ?? 0] ?? {};
  const strategy = typeof optimizer.strategy === 'number' ? 'optimize' : optimizer.strategy;
  const speedMode = typeof optimizer.speedMode === 'number' ? speedModeNames[optimizer.speedMode] : optimizer.speedMode;
  const fodder = typeof optimizer.fodder === 'number' ? 'excess' : optimizer.fodder;
  const skills = Number.isFinite(workerRequest.skillsCount) ? workerRequest.skillsCount : optimizer.skills;
  return {
    topK: 5,
    beamWidth: 16,
    maxExactNodes: 10,
    techsOptimizer: {
      strategy,
      speedMode,
      fodder,
      skills,
      chips: optimizer.chips,
      overloadable: optimizer.overloadable,
      overload: optimizer.overloadable ? 'full' : 'excess',
      inputs: normalizeInputs(optimizer.inputs),
      modes: (optimizer.modes ?? []).map((mode) => modeNameToId[mode] ?? mode),
      limit: optimizer.limit,
      skillsMap: optimizer.skillsMap,
    },
  };
}

function actualRows(build) {
  return (build?.config?.loadout ?? []).map((row) => ({
    tech: row.id,
    mode: row.mode,
    chip: row.sio?.chip ?? row.chip ?? null,
    overload: row.overload ?? row.sio?.overload ?? null,
    parts: row.sio?.parts ?? [],
  }));
}

function activeSkillsFromWorker(workerCase) {
  return (workerCase?.best?.enabledSkillIndexes ?? [])
    .map((index) => skillOrder[index])
    .filter((skill) => skill && !passiveSkills.has(skill));
}

function activeSkillsFromBuild(build) {
  return build?.config?.sioCandidate?.activeSkills ?? [];
}

function sameArray(left, right) {
  return (
    Array.isArray(left) &&
    Array.isArray(right) &&
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function compareRows(expectedRows, rows) {
  const actualByTech = new Map(rows.map((row) => [row.tech, row]));
  return expectedRows.map((expected) => {
    const actual = actualByTech.get(expected.tech);
    const modeMatches = actual?.mode === expected.mode;
    const chipMatches = actual?.chip === expected.chip;
    const overloadMatches = actual?.overload === expected.overload;
    const partsMatch = sameArray(actual?.parts, expected.parts);
    return {
      tech: expected.tech,
      expected,
      actual: actual ?? null,
      modeMatches,
      chipMatches,
      overloadMatches,
      partsMatch,
      fullRowMatches: Boolean(actual) && modeMatches && chipMatches && overloadMatches && partsMatch,
    };
  });
}

function relativeError(actual, expected) {
  if (!Number.isFinite(actual) || !Number.isFinite(expected) || expected === 0) return null;
  return Math.abs(actual - expected) / Math.abs(expected);
}

const [manifest, workerSummary, lmTrace, matrix, baseFixture] = await Promise.all([
  readJson(manifestPath),
  readJson(workerSummaryPath),
  readJson(lmTracePath),
  readJson(matrixPath),
  readJson(baseFixturePath),
]);

const workerCaseById = new Map((workerSummary.cases ?? []).map((item) => [item.id, item]));
const traceCaseById = new Map((lmTrace.cases ?? []).map((item) => [item.id, item]));
const basePlayerState = baseFixture.playerState ?? {};

const manifestCases = caseLimit > 0 ? (manifest.cases ?? []).slice(0, caseLimit) : (manifest.cases ?? []);
const rows = manifestCases.map((fixtureCase) => {
  const workerCase = workerCaseById.get(fixtureCase.id);
  const traceCase = traceCaseById.get(fixtureCase.id);
  const playerState = applySioLmContext(structuredClone(basePlayerState), workerCase, traceCase);
  playerState.sioLm = {
    ...(playerState.sioLm ?? {}),
    candidatePreselectTopK: 256,
  };
  const result = tech_optimizer_run_js(playerState, optimizerOptions(traceCase, workerCase));
  const actualTop = result.builds?.[0] ?? null;
  const expectedRows = workerCase?.best?.rowSignature ?? [];
  const actualTopRows = actualRows(actualTop);
  const rowComparison = compareRows(expectedRows, actualTopRows);
  const fullRowMatches = rowComparison.length > 0 && rowComparison.every((row) => row.fullRowMatches);
  const chipMatches = rowComparison.length > 0 && rowComparison.every((row) => row.chipMatches);
  const partsMatch = rowComparison.length > 0 && rowComparison.every((row) => row.partsMatch);
  const overloadMatches = rowComparison.length > 0 && rowComparison.every((row) => row.overloadMatches);
  const expectedActiveSkills = activeSkillsFromWorker(workerCase);
  const actualActiveSkills = activeSkillsFromBuild(actualTop);
  const activeSkillsMatch = sameArray(expectedActiveSkills, actualActiveSkills);
  const expectedMultiplier = traceCase?.tracedMultiplier ?? traceCase?.replayedTopMultiplier ?? workerCase?.best?.multiplier;
  const multiplierRelativeError = relativeError(actualTop?.damageFactor, expectedMultiplier);
  const liveExpectedRelativeError = relativeError(actualTop?.damageFactor, workerCase?.best?.multiplier);
  const multiplierMatches =
    multiplierRelativeError !== null && multiplierRelativeError <= multiplierTolerance;
  const scorerMatches = result.scope?.scoring_model === suppliedScorer;
  const fullFlagMatches = result.scope?.full_sio_equivalent === true;

  return {
    id: fixtureCase.id,
    domain: fixtureCase.domain,
    pass: fullRowMatches && activeSkillsMatch && chipMatches && partsMatch && overloadMatches && multiplierMatches && scorerMatches && fullFlagMatches,
    fullRowMatches,
    activeSkillsMatch,
    chipMatches,
    partsMatch,
    overloadMatches,
    multiplierMatches,
    multiplierRelativeError,
    scorerMatches,
    fullFlagMatches,
    expected: {
      multiplier: expectedMultiplier ?? null,
      liveExpectedMultiplier: workerCase?.best?.multiplier ?? null,
      liveExpectedRelativeError,
      activeSkills: expectedActiveSkills,
      rows: expectedRows,
    },
    actual: {
      multiplier: actualTop?.damageFactor ?? null,
      activeSkills: actualActiveSkills,
      scoringModel: result.scope?.scoring_model ?? null,
      fullSioEquivalent: result.scope?.full_sio_equivalent ?? null,
      rows: actualTopRows,
    },
    rowComparison,
  };
});

const summary = {
  manifestPath,
  workerSummaryPath,
  lmTracePath,
  matrixPath,
  outputPath,
  cases: rows.length,
  passed: rows.filter((row) => row.pass).length,
  failed: rows.filter((row) => !row.pass).length,
  fullRowPassed: rows.filter((row) => row.fullRowMatches).length,
  activeSkillsPassed: rows.filter((row) => row.activeSkillsMatch).length,
  chipPassed: rows.filter((row) => row.chipMatches).length,
  partsPassed: rows.filter((row) => row.partsMatch).length,
  overloadPassed: rows.filter((row) => row.overloadMatches).length,
  multiplierPassed: rows.filter((row) => row.multiplierMatches).length,
  scorerPassed: rows.filter((row) => row.scorerMatches).length,
  fullFlagPassed: rows.filter((row) => row.fullFlagMatches).length,
  multiplierTolerance,
  matrixFullSioEquivalent: matrix.fullSioEquivalent === true,
  matrixCurrentScorer: matrix.currentScorer ?? null,
  matrixScorer: matrix.scorer ?? null,
};

const payload = {
  generatedAt: new Date().toISOString(),
  summary,
  rows,
};

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
console.log(JSON.stringify(summary, null, 2));

if (
  summary.failed > 0 ||
  summary.matrixFullSioEquivalent !== true ||
  summary.matrixCurrentScorer !== suppliedScorer ||
  summary.matrixScorer !== suppliedScorer
) {
  process.exitCode = 1;
}
