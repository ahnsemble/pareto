import fs from 'node:fs/promises';
import path from 'node:path';

const inputDir =
  process.env.WORKER_MESSAGES_DIR ??
  path.join(process.cwd(), 'artifacts/td11/sio-tech-live-worker-messages');
const outputPath =
  process.env.OUTPUT_PATH ??
  path.join(process.cwd(), 'artifacts/td11/sio_worker_decoded_summary_2026-05-20.json');

const rarityOrder = [
  'Eternal',
  'Legend4',
  'Legend3',
  'Legend2',
  'Legend1',
  'Legend',
  'Epic3',
  'Epic2',
  'Epic1',
  'Epic',
  'None',
];

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

const workerGlobalModeOrder = [
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

const robotNameToId = {
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

function isSkillsRequest(message) {
  return (
    message &&
    typeof message === 'object' &&
    !Array.isArray(message) &&
    Array.isArray(message.robotNames) &&
    Array.isArray(message.modes) &&
    Array.isArray(message.tasks)
  );
}

function isSkillsResult(message) {
  if (
    !message ||
    typeof message !== 'object' ||
    message.type !== 'result' ||
    !Array.isArray(message.value)
  ) {
    return false;
  }
  const first = message.value[0];
  return (
    Array.isArray(first) &&
    first.length >= 4 &&
    Array.isArray(first[2]) &&
    Array.isArray(first[3])
  );
}

function decodeRarity(index) {
  if (!Number.isInteger(index) || index < 0) {
    return null;
  }
  return rarityOrder[index] ?? `unknown:${index}`;
}

function decodeMode(request, index) {
  if (!Number.isInteger(index) || index < 0) {
    return null;
  }
  return workerGlobalModeOrder[index] ?? request.modes[index] ?? `unknown:${index}`;
}

function decodeSkillBits(bits) {
  return bits
    .map((enabled, index) => (enabled ? index : null))
    .filter((index) => index !== null);
}

function decodeRobotTuple(request, tuple, index) {
  const [chip, overload, deployed, modeIndex, rarityIndex, partIndexes] = tuple;
  const mode = decodeMode(request, modeIndex);
  const techName = request.robotNames[index] ?? `unknown:${index}`;
  return {
    tech: robotNameToId[techName] ?? techName,
    techName,
    chip,
    overload,
    deployed: Boolean(deployed),
    mode,
    modeId: modeNameToId[mode] ?? mode,
    modeIndex,
    rarity: decodeRarity(rarityIndex),
    rarityIndex,
    parts: Array.isArray(partIndexes) ? partIndexes.map(decodeRarity) : [],
    partIndexes: Array.isArray(partIndexes) ? partIndexes : [],
  };
}

function decodeResultRow(request, row, rank) {
  const [chipRemainder, multiplier, skillBits, robotTuples] = row;
  const robots = robotTuples.map((tuple, index) => decodeRobotTuple(request, tuple, index));
  return {
    rank,
    chipRemainder,
    multiplier,
    enabledSkillIndexes: decodeSkillBits(skillBits),
    skillBits,
    rowSignature: robots.map((robot) => ({
      tech: robot.tech,
      mode: robot.modeId,
      chip: robot.chip,
      overload: robot.overload,
      rarity: robot.rarity,
      parts: robot.parts,
    })),
    robots,
  };
}

function summarizeTask(task) {
  return {
    chipRemainder: task.chipRemainder ?? null,
    legendRemainder: task.legendRemainder ?? null,
    robots: (task.robots ?? []).map((robot) => ({
      parts: robot.parts ?? [],
      chip: robot.chip ?? null,
      resonance: robot.resonance ?? null,
      target: robot.target ?? null,
      targetRich: robot.targetRich ?? null,
    })),
  };
}

function robotTupleKeyFromIndexes(chip, partIndexes) {
  const parts = Array.isArray(partIndexes) ? partIndexes.map(decodeRarity) : [];
  return `${chip}:${parts.join('|')}`;
}

function robotTupleKeyFromTask(robot) {
  return `${robot.chip ?? null}:${(robot.parts ?? []).join('|')}`;
}

function multisetCounts(values) {
  const counts = new Map();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return counts;
}

function scoreRequestMatch(request, resultRows) {
  const taskKeys = request.tasks.flatMap((task) =>
    task.robots.map((robot) => robotTupleKeyFromTask(robot)),
  );
  const taskCounts = multisetCounts(taskKeys);
  const rowKeys = resultRows.flatMap((row) =>
    (row[3] ?? []).map((tuple) => robotTupleKeyFromIndexes(tuple[0], tuple[5])),
  );
  let matched = 0;
  for (const key of rowKeys) {
    const remaining = taskCounts.get(key) ?? 0;
    if (remaining <= 0) {
      continue;
    }
    taskCounts.set(key, remaining - 1);
    matched += 1;
  }
  return matched;
}

function selectBestRequestIndex(skillsRequests, latestRequestIndex, resultRows) {
  let bestIndex = latestRequestIndex;
  let bestScore = -1;
  for (let index = 0; index < skillsRequests.length; index += 1) {
    const score = scoreRequestMatch(skillsRequests[index], resultRows);
    if (score > bestScore || (score === bestScore && index === latestRequestIndex)) {
      bestIndex = index;
      bestScore = score;
    }
  }
  return { bestIndex, bestScore };
}

async function decodeFile(filePath) {
  const messages = JSON.parse(await fs.readFile(filePath, 'utf8'));
  const skillsRequests = [];
  const decodedResults = [];
  const pendingRequestIndexesByWorkerId = new Map();
  let latestRequestIndex = -1;

  messages.forEach((entry, messageIndex) => {
    const message = entry.message;
    if (entry.direction === 'to-worker' && isSkillsRequest(message)) {
      latestRequestIndex = skillsRequests.length;
      const workerId = entry.workerId ?? null;
      skillsRequests.push({
        messageIndex,
        workerId,
        workerUrl: entry.url,
        speedMode: message.speedMode,
        skillsCount: message.skillsCount,
        configString: message.configString,
        robotNames: message.robotNames,
        robotIds: message.robotNames.map((name) => robotNameToId[name] ?? name),
        modes: message.modes,
        modeIds: message.modes.map((name) => modeNameToId[name] ?? name),
        skillsMap: message.skillsMap,
        tasks: message.tasks.map(summarizeTask),
        rawTaskCount: message.tasks.length,
      });
      if (workerId !== null) {
        const pending = pendingRequestIndexesByWorkerId.get(workerId) ?? [];
        pending.push(latestRequestIndex);
        pendingRequestIndexesByWorkerId.set(workerId, pending);
      }
      return;
    }

    if (entry.direction !== 'from-worker' || !isSkillsResult(message)) {
      return;
    }

    const workerId = entry.workerId ?? null;
    const pending = workerId !== null ? pendingRequestIndexesByWorkerId.get(workerId) : null;
    const directRequestIndex = pending?.shift();
    const { bestIndex, bestScore } =
      directRequestIndex === undefined
        ? selectBestRequestIndex(skillsRequests, latestRequestIndex, message.value)
        : { bestIndex: directRequestIndex, bestScore: null };
    const request = skillsRequests[bestIndex];
    if (!request) {
      return;
    }
    const decodedRows = message.value.map((row, rank) => decodeResultRow(request, row, rank));
    decodedResults.push({
      messageIndex,
      workerId,
      requestIndex: bestIndex,
      requestMatchScore: bestScore,
      workerUrl: entry.url,
      rows: decodedRows,
      top: decodedRows[0] ?? null,
    });
  });

  const allRows = decodedResults.flatMap((result) =>
    result.rows.map((row) => ({
      ...row,
      workerId: result.workerId,
      requestIndex: result.requestIndex,
      resultMessageIndex: result.messageIndex,
    })),
  );
  const best =
    allRows
      .filter((row) => Number.isFinite(row.multiplier))
      .sort((left, right) => right.multiplier - left.multiplier)[0] ?? null;

  return {
    id: path.basename(filePath, '.json'),
    filePath,
    messageCount: messages.length,
    skillsRequestCount: skillsRequests.length,
    skillsResultCount: decodedResults.length,
    nonEmptySkillsResultCount: decodedResults.filter((result) => result.rows.length > 0).length,
    skillsRequests,
    decodedResults,
    best,
  };
}

const files = (await fs.readdir(inputDir))
  .filter((file) => file.endsWith('.json'))
  .sort()
  .map((file) => path.join(inputDir, file));

const cases = [];
for (const file of files) {
  cases.push(await decodeFile(file));
}

const summary = {
  inputDir,
  outputPath,
  cases: cases.length,
  skillsRequests: cases.reduce((sum, item) => sum + item.skillsRequestCount, 0),
  skillsResults: cases.reduce((sum, item) => sum + item.skillsResultCount, 0),
  nonEmptySkillsResults: cases.reduce((sum, item) => sum + item.nonEmptySkillsResultCount, 0),
  bestMultipliers: Object.fromEntries(cases.map((item) => [item.id, item.best?.multiplier ?? null])),
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
