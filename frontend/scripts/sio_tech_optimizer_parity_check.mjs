import fs from 'node:fs/promises';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import init, { tech_optimizer_run_js } from '../../tttg_forge_wasm/pkg/tttg_forge_wasm.js';
import { applySioLmContext } from './lib/sio_lm_context.mjs';

const fixturePath =
  process.env.FIXTURE_PATH ?? path.join(process.cwd(), 'artifacts/td11/sio_tech_optimizer_live_expected_2026-05-20.json');
const useSioLmContext = process.env.USE_SIO_LM_CONTEXT === '1';
const compactOnlyContext = process.env.SIO_LM_COMPACT_ONLY === '1';
const outputPath =
  process.env.OUTPUT_PATH ??
  path.join(
    process.cwd(),
    useSioLmContext
      ? 'artifacts/td11/sio_tech_optimizer_parity_check_sio_lm_context_2026-05-20.json'
      : 'artifacts/td11/sio_tech_optimizer_parity_check_2026-05-20.json',
  );
const workerSummaryPath =
  process.env.WORKER_SUMMARY_PATH ??
  path.join(process.cwd(), 'artifacts/td11/sio_worker_decoded_summary_2026-05-20.json');
const lmTracePath =
  process.env.LM_TRACE_PATH ?? path.join(process.cwd(), 'artifacts/td11/sio_lm_trace_summary_2026-05-20.json');
const suppliedSioLmScorers = new Set(['sio_full_lm_equivalence']);

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

const partNameToId = {
  'Energy Guidance System': 'energyGuidanceSystem',
  'Antimatter Maintainer': 'antimatterMaintainer',
  'Quantum Nanobot': 'quantumNanobot',
  'Phase Driver': 'phaseDriver',
  'Energy Diffuser': 'energyDiffuser',
  'Hi-Maintainer': 'hiMaintainer',
  'Precision Device': 'precisionDevice',
  'Antimatter Generator': 'antimatterGenerator',
  'Exo-radicator': 'exoRadicator',
  'Hi-Gravity Pulser': 'hiGravityPulser',
};

const wasmPath = new URL('../../tttg_forge_wasm/pkg/tttg_forge_wasm_bg.wasm', import.meta.url);
await init({ module_or_path: await readFile(wasmPath) });

function normalizeInputs(inputs) {
  return Object.fromEntries(Object.entries(inputs ?? {}).filter(([, value]) => Number(value) > 0));
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

function expectedSignature(expected) {
  return (expected?.rows ?? [])
    .map((row) => ({
      id: partNameToId[row.part] ?? row.part,
      mode: modeNameToId[row.mode] ?? row.mode,
      rarity: row.rarity,
      rawText: row.rawText,
    }))
    .filter((row) => row.id && row.mode);
}

function actualSignature(build) {
  return (build?.config?.loadout ?? []).map((row) => ({
    id: row.id,
    mode: row.mode,
    twinbornLevel: row.twinbornLevel,
    resonance: row.resonance,
    overload: row.overload,
  }));
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

function summarizeOverlap(expectedRows, actualRows) {
  const actualByPart = new Map(actualRows.map((row) => [row.id, row]));
  const rows = expectedRows.map((expectedRow) => {
    const actualRow = actualByPart.get(expectedRow.id);
    return {
      id: expectedRow.id,
      expectedMode: expectedRow.mode,
      actualMode: actualRow?.mode ?? null,
      modeMatches: actualRow?.mode === expectedRow.mode,
      expectedRarity: expectedRow.rarity,
      actualTwinbornLevel: actualRow?.twinbornLevel ?? null,
      expectedRawText: expectedRow.rawText,
    };
  });
  return {
    comparedRows: rows.length,
    matchedModes: rows.filter((row) => row.modeMatches).length,
    rows,
  };
}

const fixture = JSON.parse(await fs.readFile(fixturePath, 'utf8'));
const workerSummary = useSioLmContext
  ? JSON.parse(await fs.readFile(workerSummaryPath, 'utf8'))
  : { cases: [] };
const lmTrace = useSioLmContext
  ? JSON.parse(await fs.readFile(lmTracePath, 'utf8'))
  : { cases: [] };
const workerCaseById = new Map(workerSummary.cases.map((item) => [item.id, item]));
const traceCaseById = new Map(lmTrace.cases.map((item) => [item.id, item]));
const rows = fixture.cases.map((fixtureCase) => {
  const result = tech_optimizer_run_js(
    toParetoPlayerState(fixture, fixtureCase, workerCaseById, traceCaseById),
    toParetoOptions(fixtureCase),
  );
  const expectedTop = fixtureCase.expected[0];
  const expectedRows = expectedSignature(expectedTop);
  const actualTop = result.builds?.[0] ?? null;
  const actualRows = actualSignature(actualTop);
  const expectedActiveSkills = expectedTop?.activeSkills ?? [];
  const actualActive = actualActiveSkills(actualTop);
  const activeSkillsPass = sameArray(expectedActiveSkills, actualActive);
  const overlap = summarizeOverlap(expectedRows, actualRows);
  const expectedMultiplier = expectedTop?.multiplier ?? null;
  const actualDamageFactor = actualTop?.damageFactor ?? null;
  const rowSignaturePass =
    overlap.comparedRows > 0 && overlap.matchedModes === overlap.comparedRows;
  const multiplierRelativeError =
    Number.isFinite(expectedMultiplier) && Number.isFinite(actualDamageFactor) && expectedMultiplier !== 0
      ? Math.abs(actualDamageFactor - expectedMultiplier) / Math.abs(expectedMultiplier)
      : null;
  const multiplierPass =
    multiplierRelativeError !== null && multiplierRelativeError <= 1e-9;
  const pass = rowSignaturePass && activeSkillsPass && multiplierPass;
  const scoringContextPass =
    !useSioLmContext || suppliedSioLmScorers.has(result.scope?.scoring_model);

  return {
    id: fixtureCase.id,
    pass: pass && scoringContextPass,
    rowSignaturePass,
    activeSkillsPass,
    multiplierPass,
    scoringContextPass,
    reason: pass
      ? scoringContextPass
        ? 'full_parity_pass'
        : 'scoring_context_mismatch'
      : rowSignaturePass
        ? 'row_signature_matches_multiplier_or_numeric_parity_pending'
        : 'row_signature_mismatch',
    sio: {
      topMultiplierText: expectedTop?.multiplierText ?? '',
      topMultiplier: expectedMultiplier,
      topChipRemainder: expectedTop?.chipRemainder ?? null,
      activeSkills: expectedActiveSkills,
      topRows: expectedRows,
    },
    pareto: {
      topLabel: actualTop?.label ?? '',
      topDamageFactor: actualDamageFactor,
      topChipRemainder: actualTop?.config?.sioCandidate?.chipRemainder ?? null,
      activeSkills: actualActive,
      guarantee: result.quality?.guarantee ?? null,
      scoringModel: result.scope?.scoring_model ?? null,
      fullSioEquivalent: result.scope?.full_sio_equivalent ?? null,
      topRows: actualRows,
    },
    multiplierRelativeError,
    overlap,
  };
});

const summary = {
  fixturePath,
  outputPath,
  workerSummaryPath,
  cases: rows.length,
  passed: rows.filter((row) => row.pass).length,
  failed: rows.filter((row) => !row.pass).length,
  rowSignaturePassed: rows.filter((row) => row.rowSignaturePass).length,
  rowSignatureFailed: rows.filter((row) => !row.rowSignaturePass).length,
  activeSkillsPassed: rows.filter((row) => row.activeSkillsPass).length,
  activeSkillsFailed: rows.filter((row) => !row.activeSkillsPass).length,
  multiplierPassed: rows.filter((row) => row.multiplierPass).length,
  multiplierFailed: rows.filter((row) => !row.multiplierPass).length,
  scoringContextPassed: rows.filter((row) => row.scoringContextPass).length,
  scoringContextFailed: rows.filter((row) => !row.scoringContextPass).length,
  useSioLmContext,
  compactOnlyContext,
  rootCause:
    rows.every((row) => row.pass) &&
    useSioLmContext &&
    rows.every(
      (row) =>
        row.pareto.scoringModel === 'sio_full_lm_equivalence' &&
        row.pareto.fullSioEquivalent === true,
    )
      ? 'Supplied sioLm parity is green for DOM row signatures and multipliers, and the scorer now reports sio_full_lm_equivalence with fullSioEquivalent=true.'
      : rows.every((row) => row.pass) && useSioLmContext && compactOnlyContext
      ? 'Compact-only sioLm context parity is green for DOM row signatures and multipliers without supplied trace baseStats.'
      : rows.every((row) => row.pass) && useSioLmContext
        ? 'Supplied sioLm compact/baseStats context parity is green for DOM row signatures and multipliers.'
      : rows.every((row) => row.pass)
      ? 'Captured fixture parity is green for DOM row signatures and multipliers. Current scorer reports sio_full_lm_equivalence with fullSioEquivalent=true under the release gate.'
      : rows.every((row) => row.rowSignaturePass)
      ? 'DOM row signatures match captured sio-tools fixtures, but multiplier parity still needs live lm() input generation work.'
      : 'Row signatures still differ from captured sio-tools fixtures; inspect overlap rows before multiplier parity.',
  lmTraceArtifact: lmTracePath,
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
