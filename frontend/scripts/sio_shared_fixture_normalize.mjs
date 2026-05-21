import fs from 'node:fs/promises';
import path from 'node:path';

const providedCode = process.env.SIO_CODE ?? null;
const safeCode = (providedCode ?? 'unknown').replace(/[^A-Za-z0-9_-]/g, '_');
const fixtureDir =
  process.env.FIXTURE_DIR ?? path.join(process.cwd(), 'artifacts/td11', `shared_${safeCode}`);
const capturePath =
  process.env.CAPTURE_PATH ?? path.join(fixtureDir, 'optimizer_current_config_capture.json');
const localStoragePath =
  process.env.LOCAL_STORAGE_PATH ?? path.join(fixtureDir, 'local_storage_snapshot.json');
const outputPath = process.env.OUTPUT_PATH ?? path.join(fixtureDir, 'pareto_fixture.json');

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

function normalizeMode(value) {
  return modeNameToId[value] ?? value;
}

function normalizeStrategy(value) {
  if (typeof value === 'string') return value;
  return 'optimize';
}

function normalizeSpeedMode(value) {
  if (typeof value === 'string') return value;
  return (
    {
      0: 'fast',
      1: 'fast',
      2: 'normal',
      3: 'precise',
      4: 'precise+',
      5: 'full',
    }[value] ?? 'normal'
  );
}

function normalizeFodder(value) {
  if (typeof value === 'string') return value;
  return (
    {
      1: 'none',
      2: 'excess',
      3: 'smart',
    }[value] ?? 'excess'
  );
}

function parseStorageEntries(capture, snapshot) {
  return capture.localStorageEntries ?? snapshot.localStorageEntries ?? {};
}

function readTechsOptimizer(entries) {
  const key = Object.keys(entries).find((candidate) => candidate.endsWith('_techsOptimizer'));
  if (!key) {
    throw new Error('Unable to find *_techsOptimizer in captured localStorage');
  }
  const parsed = JSON.parse(entries[key]);
  return { key, data: parsed.data ?? parsed };
}

function normalizeModeEntries(entries) {
  return Object.fromEntries(
    Object.entries(entries ?? {}).map(([mode, entry]) => [normalizeMode(mode), entry]),
  );
}

function normalizeSkillsMap(skillsMap) {
  return Object.fromEntries(
    Object.entries(skillsMap ?? {}).map(([skill, status]) => [normalizeMode(skill), status]),
  );
}

const capture = JSON.parse(await fs.readFile(capturePath, 'utf8'));
const snapshot = JSON.parse(await fs.readFile(localStoragePath, 'utf8'));
const { key: techsOptimizerKey, data: optimizerData } = readTechsOptimizer(
  parseStorageEntries(capture, snapshot),
);
const captureCase = capture.cases?.[0];
if (!captureCase) {
  throw new Error('Shared capture has no cases');
}

const fixtureCode = capture.code ?? providedCode ?? path.basename(fixtureDir).replace(/^shared_/, '');
const optimizer = {
  strategy: normalizeStrategy(optimizerData.strategy),
  speedMode: normalizeSpeedMode(optimizerData.speedMode),
  fodder: normalizeFodder(optimizerData.fodder),
  overloadable: Boolean(optimizerData.overloadable),
  limit: optimizerData.limit ?? 'basic',
  modes: (optimizerData.modes ?? []).map(normalizeMode),
  modeEntries: normalizeModeEntries(optimizerData.modeEntries),
  skillsMap: normalizeSkillsMap(optimizerData.skillsMap),
};

const fixture = {
  generatedAt: new Date().toISOString(),
  source: `shared_${fixtureCode} normalized Pareto fixture candidate`,
  sioUrl: capture.sioUrl,
  playerState: {
    damage: {},
    mode: 'damage',
    selected_hero: { id: 'common' },
    conditional_state: {},
    xeno_transmute_modifier: null,
    ss_equipment: [],
    tech_configs: {},
  },
  cases: [
    {
      id: 'current_config',
      inputs: optimizerData.inputs ?? {},
      chips: optimizerData.chips ?? 0,
      skills: optimizerData.skills ?? 0,
      optimizer,
      expected: captureCase.expected ?? [],
      sourceCaptureCaseId: captureCase.id,
    },
  ],
};

await fs.writeFile(outputPath, `${JSON.stringify(fixture, null, 2)}\n`);
console.log(
  JSON.stringify(
    {
      fixtureDir,
      outputPath,
      techsOptimizerKey,
      cases: fixture.cases.length,
      inputs: fixture.cases[0].inputs,
      chips: fixture.cases[0].chips,
      skills: fixture.cases[0].skills,
      speedMode: fixture.cases[0].optimizer.speedMode,
      fodder: fixture.cases[0].optimizer.fodder,
      overloadable: fixture.cases[0].optimizer.overloadable,
      expectedResults: fixture.cases[0].expected.length,
    },
    null,
    2,
  ),
);
