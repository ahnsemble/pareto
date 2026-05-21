import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const workerSummaryPath =
  process.env.WORKER_SUMMARY_PATH ??
  path.join(process.cwd(), 'artifacts/td11/sio_worker_decoded_summary_2026-05-20.json');
const outputPath =
  process.env.OUTPUT_PATH ??
  path.join(process.cwd(), 'artifacts/td11/sio_lm_input_summary_2026-05-20.json');

const liveWorkerSkillOrder = [
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

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function parseConfigString(raw) {
  if (!raw) {
    return { parseError: 'missing_config_string' };
  }
  try {
    const parsed = JSON.parse(raw);
    return {
      topLevelKeys: Object.keys(parsed),
      playerKeys: parsed.a && typeof parsed.a === 'object' ? Object.keys(parsed.a) : [],
      gameMode: parsed.a?.I ?? null,
      calcMode: parsed.E?.O ?? null,
      atkBase: parsed.a?.['('] ?? null,
      atkFinal: parsed.a?.$ ?? null,
      designs: parsed.a?.['*'] ?? null,
      rawLength: raw.length,
      rawSha256: sha256(raw),
    };
  } catch (error) {
    return {
      parseError: error instanceof Error ? error.message : String(error),
      rawLength: raw.length,
      rawSha256: sha256(raw),
    };
  }
}

function summarizeCase(item) {
  const bestRequest = item.skillsRequests[item.best?.requestIndex ?? 0] ?? item.skillsRequests[0];
  const bestResult = item.decodedResults.find(
    (result) => result.messageIndex === item.best?.resultMessageIndex,
  );
  return {
    id: item.id,
    bestMultiplier: item.best?.multiplier ?? null,
    bestChipRemainder: item.best?.chipRemainder ?? null,
    bestRequestIndex: item.best?.requestIndex ?? null,
    bestResultMessageIndex: item.best?.resultMessageIndex ?? null,
    requestMatchScore: bestResult?.requestMatchScore ?? null,
    speedMode: bestRequest?.speedMode ?? null,
    skillsCount: bestRequest?.skillsCount ?? null,
    robotIds: bestRequest?.robotIds ?? [],
    modeIds: bestRequest?.modeIds ?? [],
    skillsMap: bestRequest?.skillsMap ?? {},
    enabledSkillIndexes: item.best?.enabledSkillIndexes ?? [],
    enabledSkillNames: (item.best?.enabledSkillIndexes ?? []).map(
      (index) => liveWorkerSkillOrder[index] ?? `unknown:${index}`,
    ),
    skillBitsLength: item.best?.skillBits?.length ?? null,
    skillBits: item.best?.skillBits ?? [],
    rowSignature: item.best?.rowSignature ?? [],
    config: parseConfigString(bestRequest?.configString),
  };
}

const workerSummary = JSON.parse(await fs.readFile(workerSummaryPath, 'utf8'));
const cases = workerSummary.cases.map(summarizeCase);
const summary = {
  workerSummaryPath,
  outputPath,
  cases: cases.length,
  uniqueConfigHashes: [...new Set(cases.map((item) => item.config.rawSha256).filter(Boolean))],
  multiplierRange: {
    min: Math.min(...cases.map((item) => item.bestMultiplier).filter(Number.isFinite)),
    max: Math.max(...cases.map((item) => item.bestMultiplier).filter(Number.isFinite)),
  },
};

await fs.writeFile(
  outputPath,
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      summary,
      cases,
    },
    null,
    2,
  )}\n`,
);

console.log(JSON.stringify(summary, null, 2));
