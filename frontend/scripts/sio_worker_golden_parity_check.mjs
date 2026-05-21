import fs from 'node:fs/promises';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import init, { tech_optimizer_run_js } from '../../tttg_forge_wasm/pkg/tttg_forge_wasm.js';
import { applySioLmContext } from './lib/sio_lm_context.mjs';

const fixturePath =
  process.env.FIXTURE_PATH ??
  path.join(process.cwd(), 'artifacts/td11/sio_tech_optimizer_live_expected_2026-05-20.json');
const workerSummaryPath =
  process.env.WORKER_SUMMARY_PATH ??
  path.join(process.cwd(), 'artifacts/td11/sio_worker_decoded_summary_2026-05-20.json');
const lmTracePath =
  process.env.LM_TRACE_PATH ??
  path.join(process.cwd(), 'artifacts/td11/sio_lm_trace_summary_2026-05-20.json');
const useSioLmContext = process.env.USE_SIO_LM_CONTEXT === '1';
const compactOnlyContext = process.env.SIO_LM_COMPACT_ONLY === '1';
const suppliedSioLmScorers = new Set(['sio_full_lm_equivalence']);
const outputPath =
  process.env.OUTPUT_PATH ??
  path.join(
    process.cwd(),
    useSioLmContext
      ? 'artifacts/td11/sio_worker_golden_parity_check_sio_lm_context_2026-05-20.json'
      : 'artifacts/td11/sio_worker_golden_parity_check_2026-05-20.json',
  );

const wasmPath = new URL('../../tttg_forge_wasm/pkg/tttg_forge_wasm_bg.wasm', import.meta.url);
await init({ module_or_path: await readFile(wasmPath) });

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

const basePassiveSkills = new Set(['Energy Cube', 'HP Bullet', 'Exo Bracer', 'Ammo Thruster', 'HE Fuel']);

function normalizeInputs(inputs) {
  return Object.fromEntries(
    Object.entries(inputs ?? {}).map(([key, value]) => [key.toLowerCase(), value]).filter(([, value]) => Number(value) > 0),
  );
}

function toParetoOptions(fixtureCase) {
  return {
    topK: 5,
    beamWidth: 16,
    maxExactNodes: 10,
    techsOptimizer: {
      strategy: fixtureCase.optimizer.strategy,
      speedMode: fixtureCase.optimizer.speedMode,
      fodder: fixtureCase.optimizer.fodder,
      skills: fixtureCase.skills,
      chips: fixtureCase.chips,
      overloadable: fixtureCase.optimizer.overloadable,
      overload: fixtureCase.optimizer.overloadable ? 'full' : 'excess',
      inputs: normalizeInputs(fixtureCase.inputs),
      modes: fixtureCase.optimizer.modes,
      limit: fixtureCase.optimizer.limit,
      skillsMap: fixtureCase.optimizer.skillsMap,
    },
  };
}

function toParetoPlayerState(fixture, fixtureCase, workerCaseById, traceCaseById) {
  const playerState = structuredClone(fixture.playerState ?? {});
  if (!useSioLmContext) {
    return playerState;
  }
  const workerCase = workerCaseById.get(fixtureCase.id);
  const traceCase = traceCaseById.get(fixtureCase.id);
  return applySioLmContext(playerState, workerCase, traceCase);
}

function actualRows(build) {
  return (build?.config?.loadout ?? []).map((row) => ({
    tech: row.id,
    mode: row.mode,
    chip: row.sio?.chip ?? null,
    overload: row.overload ?? null,
    parts: row.sio?.parts ?? [],
    resonance: row.resonance ?? null,
    target: row.sio?.target ?? null,
    targetRich: row.sio?.targetRich ?? null,
  }));
}

function expectedRows(workerCase) {
  return workerCase?.best?.rowSignature ?? [];
}

function expectedActiveSkills(workerCase) {
  return (workerCase?.best?.enabledSkillIndexes ?? [])
    .map((index) => skillOrder[index])
    .filter((skill) => skill && !basePassiveSkills.has(skill));
}

function actualActiveSkills(build) {
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

function compareRows(expected, actual) {
  const actualByTech = new Map(actual.map((row) => [row.tech, row]));
  return expected.map((expectedRow) => {
    const actualRow = actualByTech.get(expectedRow.tech);
    const modeMatches = actualRow?.mode === expectedRow.mode;
    const chipMatches = actualRow?.chip === expectedRow.chip;
    const overloadMatches = actualRow?.overload === expectedRow.overload;
    const partsMatch =
      Array.isArray(actualRow?.parts) &&
      actualRow.parts.length === expectedRow.parts.length &&
      actualRow.parts.every((part, index) => part === expectedRow.parts[index]);
    return {
      tech: expectedRow.tech,
      expected: expectedRow,
      actual: actualRow ?? null,
      modeMatches,
      chipMatches,
      overloadMatches,
      partsMatch,
      fullRowMatches: Boolean(actualRow) && modeMatches && chipMatches && overloadMatches && partsMatch,
    };
  });
}

const fixture = JSON.parse(await fs.readFile(fixturePath, 'utf8'));
const workerSummary = JSON.parse(await fs.readFile(workerSummaryPath, 'utf8'));
const lmTrace = useSioLmContext
  ? JSON.parse(await fs.readFile(lmTracePath, 'utf8'))
  : { cases: [] };
const workerCaseById = new Map(workerSummary.cases.map((item) => [item.id, item]));
const traceCaseById = new Map(lmTrace.cases.map((item) => [item.id, item]));

const rows = fixture.cases.map((fixtureCase) => {
  const workerCase = workerCaseById.get(fixtureCase.id);
  const result = tech_optimizer_run_js(
    toParetoPlayerState(fixture, fixtureCase, workerCaseById, traceCaseById),
    toParetoOptions(fixtureCase),
  );
  const actualTop = result.builds?.[0] ?? null;
  const expected = expectedRows(workerCase);
  const actual = actualRows(actualTop);
  const expectedSkills = expectedActiveSkills(workerCase);
  const actualSkills = actualActiveSkills(actualTop);
  const activeSkillsMatch = sameArray(expectedSkills, actualSkills);
  const rowComparison = compareRows(expected, actual);
  const fullRowMatches =
    rowComparison.length > 0 && rowComparison.every((row) => row.fullRowMatches);
  const modeMatches =
    rowComparison.length > 0 && rowComparison.every((row) => row.modeMatches);
  const chipMatches =
    rowComparison.length > 0 && rowComparison.every((row) => row.chipMatches);
  const partsMatch =
    rowComparison.length > 0 && rowComparison.every((row) => row.partsMatch);
  const overloadMatches =
    rowComparison.length > 0 && rowComparison.every((row) => row.overloadMatches);
  const expectedMultiplier = workerCase?.best?.multiplier ?? null;
  const actualMultiplier = actualTop?.damageFactor ?? null;
  const multiplierRelativeError =
    Number.isFinite(expectedMultiplier) && Number.isFinite(actualMultiplier) && expectedMultiplier !== 0
      ? Math.abs(actualMultiplier - expectedMultiplier) / Math.abs(expectedMultiplier)
      : null;
  const scoringContextPass =
    !useSioLmContext || suppliedSioLmScorers.has(result.scope?.scoring_model);

  return {
    id: fixtureCase.id,
    pass:
      fullRowMatches &&
      activeSkillsMatch &&
      multiplierRelativeError !== null &&
      multiplierRelativeError <= 1e-9 &&
      scoringContextPass,
    fullRowMatches,
    modeMatches,
    chipMatches,
    partsMatch,
    overloadMatches,
    activeSkillsMatch,
    multiplierMatches: multiplierRelativeError !== null && multiplierRelativeError <= 1e-9,
    scoringContextPass,
    expected: {
      multiplier: expectedMultiplier,
      chipRemainder: workerCase?.best?.chipRemainder ?? null,
      activeSkills: expectedSkills,
      rows: expected,
    },
    actual: {
      multiplier: actualMultiplier,
      chipRemainder: actualTop?.config?.sioCandidate?.chipRemainder ?? null,
      activeSkills: actualSkills,
      guarantee: result.quality?.guarantee ?? null,
      scoringModel: result.scope?.scoring_model ?? null,
      reason: result.reason ?? null,
      rows: actual,
    },
    multiplierRelativeError,
    rowComparison,
  };
});

const summary = {
  fixturePath,
  workerSummaryPath,
  outputPath,
  cases: rows.length,
  passed: rows.filter((row) => row.pass).length,
  fullRowPassed: rows.filter((row) => row.fullRowMatches).length,
  modePassed: rows.filter((row) => row.modeMatches).length,
  chipPassed: rows.filter((row) => row.chipMatches).length,
  partsPassed: rows.filter((row) => row.partsMatch).length,
  overloadPassed: rows.filter((row) => row.overloadMatches).length,
  activeSkillsPassed: rows.filter((row) => row.activeSkillsMatch).length,
  activeSkillsFailed: rows.filter((row) => !row.activeSkillsMatch).length,
  multiplierPassed: rows.filter((row) => row.multiplierMatches).length,
  scoringContextPassed: rows.filter((row) => row.scoringContextPass).length,
  scoringContextFailed: rows.filter((row) => !row.scoringContextPass).length,
  useSioLmContext,
  compactOnlyContext,
};

await fs.writeFile(
  outputPath,
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      summary,
      rows,
    },
    null,
    2,
  )}\n`,
);

console.log(JSON.stringify(summary, null, 2));

if (summary.passed < summary.cases && process.env.ALLOW_MISMATCH !== '1') {
  process.exitCode = 1;
}
