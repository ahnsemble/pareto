import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { createHash, webcrypto } from 'node:crypto';

const manifestPath =
  process.env.MANIFEST_PATH ??
  path.join(process.cwd(), 'artifacts/td11/arbitrary_compact_s59/compact_fixture_manifest.json');
const templateWorkerSummaryPath =
  process.env.TEMPLATE_WORKER_SUMMARY_PATH ??
  path.join(process.cwd(), 'artifacts/td11/sio_worker_decoded_summary_2026-05-20.json');
const outputPath =
  process.env.OUTPUT_PATH ??
  path.join(process.cwd(), 'artifacts/td11/arbitrary_compact_s59/live_capture_summary.json');

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

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function mergeCompactConfigPatch(base, patch) {
  if (patch === undefined) {
    return structuredClone(base);
  }
  if (Array.isArray(base) && Array.isArray(patch)) {
    const merged = structuredClone(base);
    patch.forEach((value, index) => {
      merged[index] = mergeCompactConfigPatch(base[index], value);
    });
    return merged;
  }
  if (isPlainObject(base) && isPlainObject(patch)) {
    const merged = structuredClone(base);
    Object.entries(patch).forEach(([key, value]) => {
      merged[key] = mergeCompactConfigPatch(base[key], value);
    });
    return merged;
  }
  return structuredClone(patch);
}

function findWorkerSourceDir() {
  if (process.env.SIO_WORKER_SRC_DIR) {
    return process.env.SIO_WORKER_SRC_DIR;
  }
  const preferred = '/tmp/sio-tools-src.current';
  if (fs.existsSync(path.join(preferred, 'worker-skills-8663.js'))) {
    return preferred;
  }
  const candidates = fs
    .readdirSync('/tmp', { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith('sio-tools-src.'))
    .map((entry) => path.join('/tmp', entry.name))
    .filter((dir) => fs.existsSync(path.join(dir, 'worker-skills-8663.js')))
    .sort();
  const latest = candidates.at(-1);
  if (!latest) {
    throw new Error('Unable to find /tmp/sio-tools-src.* with worker-skills-8663.js');
  }
  return latest;
}

class BroadcastChannelStub {
  constructor(name) {
    this.name = name;
  }
  postMessage() {}
  close() {}
  addEventListener() {}
  removeEventListener() {}
}

function makeStorageStub() {
  const storage = new Map();
  return {
    getItem(key) {
      return storage.has(key) ? storage.get(key) : null;
    },
    setItem(key, value) {
      storage.set(key, String(value));
    },
    removeItem(key) {
      storage.delete(key);
    },
    clear() {
      storage.clear();
    },
  };
}

function createWorkerContext(sourceDir, posted) {
  const storage = makeStorageStub();
  const context = {
    console,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    Promise,
    Uint8Array,
    Uint16Array,
    Uint32Array,
    Int8Array,
    Int16Array,
    Int32Array,
    Float32Array,
    Float64Array,
    Array,
    Object,
    Number,
    String,
    Boolean,
    Math,
    Map,
    Set,
    WeakMap,
    Date,
    RegExp,
    JSON,
    Error,
    TypeError,
    TextEncoder,
    TextDecoder,
    URL,
    URLSearchParams,
    crypto: globalThis.crypto ?? webcrypto,
    navigator: { userAgent: 'node' },
    location: {
      href: 'https://sio-tools.vercel.app/',
      origin: 'https://sio-tools.vercel.app/',
    },
    BroadcastChannel: BroadcastChannelStub,
    localStorage: storage,
    sessionStorage: storage,
    document: { cookie: '' },
    addEventListener() {},
    removeEventListener() {},
  };
  context.self = context;
  context.window = context;
  context.globalThis = context;
  context.postMessage = (message) => posted.push(message);
  context.self.postMessage = context.postMessage;
  context.importScripts = (url) => {
    const file = path.join(sourceDir, path.basename(String(url)));
    const code = fs.readFileSync(file, 'utf8');
    vm.runInContext(code, context, { filename: file });
  };
  vm.createContext(context);
  return context;
}

async function loadPatchedWorker(sourceDir, posted) {
  const context = createWorkerContext(sourceDir, posted);
  const sourcePath = path.join(sourceDir, 'worker-skills-8663.js');
  let code = fs.readFileSync(sourcePath, 'utf8');
  const baseNeedle =
    'let{ceDamage:o,passivePools:n}=E({evolvePassives:li,cooldownReduction:r,techs:e,skills:lh,collectibles:eO,upgradedCollectibles:e7,settings:e5,gameMode:eb,eeOmnipower:eA,eeSkills:eL,staticCache:e8,stableTechEntries:t?V:void 0},la);';
  const baseReplacement =
    'let __baseStatsBeforeTech={...la};let{ceDamage:o,passivePools:n}=E({evolvePassives:li,cooldownReduction:r,techs:e,skills:lh,collectibles:eO,upgradedCollectibles:e7,settings:e5,gameMode:eb,eeOmnipower:eA,eeSkills:eL,staticCache:e8,stableTechEntries:t?V:void 0},la);';
  const needle = 'return(0,_.IE)(lv),(0,H.f)(la,lu,a,i,e5.calcMode,lh,n,eb)';
  const replacement =
    'return(()=>{(0,_.IE)(lv);let __score=(0,H.f)(la,lu,a,i,e5.calcMode,lh,n,eb);if(__score>((self.__bestLmTrace&&self.__bestLmTrace.score)||0))self.__bestLmTrace={score:__score,mask:l,calcMode:e5.calcMode,gameMode:eb,attackMeta:{...lu},damageFactor:a,ceDamage:i,baseStats:{...__baseStatsBeforeTech},stats:{...la},skills:{...lh},techs:JSON.parse(JSON.stringify(e)),passivePools:Array.from(n||[])};return __score})()';
  if (!code.includes(baseNeedle)) {
    throw new Error('Unable to patch worker-skills lm() base stats expression');
  }
  if (!code.includes(needle)) {
    throw new Error('Unable to patch worker-skills lm() return expression');
  }
  code = code.replace(baseNeedle, baseReplacement).replace(needle, replacement);
  code = code.replace('_N_E=t.x()', 'self.__webpack_require__=t;self.__webpack_ready__=t.x()');
  vm.runInContext(code, context, { filename: sourcePath });
  await context.__webpack_ready__;
  return context;
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
    requestIndex: 0,
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

function statSignature(trace) {
  const stats = trace?.stats ?? {};
  const ceDamage = trace?.ceDamage ?? {};
  return {
    calcMode: trace?.calcMode ?? null,
    gameMode: trace?.gameMode ?? null,
    nonZeroStats: Object.entries(stats)
      .filter(([, value]) => Number(value) !== 0)
      .map(([key]) => key)
      .sort(),
    ceDamageKeys: Object.keys(ceDamage).sort(),
    passivePoolsLength: Array.isArray(trace?.passivePools) ? trace.passivePools.length : 0,
    damageFactor: trace?.damageFactor ?? null,
  };
}

async function captureCase(sourceDir, workerVersionHash, templateRequest, fixtureCase) {
  const templateConfig = JSON.parse(templateRequest.configString);
  const config = mergeCompactConfigPatch(templateConfig, fixtureCase.compactConfig);
  const request = structuredClone(templateRequest);
  request.configString = JSON.stringify(config);
  request.messageIndex = 0;
  request.requestSource = 'arbitrary_compact_live_capture';
  request.compactPayloadHash = fixtureCase.compactPayloadHash ?? sha256(stableStringify(config));

  const posted = [];
  const context = await loadPatchedWorker(sourceDir, posted);
  await context.onmessage({
    data: {
      speedMode: request.speedMode,
      tasks: request.tasks,
      skillsMap: request.skillsMap,
      configString: request.configString,
      robotNames: request.robotNames,
      modes: request.modes,
      skillsCount: request.skillsCount,
    },
  });
  const result = posted.filter((message) => message?.type === 'result').at(-1);
  const rows = (result?.value ?? []).map((row, rank) => decodeResultRow(request, row, rank));
  const best =
    rows
      .filter((row) => Number.isFinite(row.multiplier))
      .sort((left, right) => right.multiplier - left.multiplier)[0] ?? null;
  const trace = context.__bestLmTrace ?? null;
  const topSignature = best
    ? {
        rank: best.rank,
        multiplier: best.multiplier,
        rowSignature: best.rowSignature,
        statSignature: statSignature(trace),
      }
    : null;
  const capturedAt = new Date().toISOString();
  const captureMetadata = {
    source: 'local-live-sio-tools-skills-worker-vm',
    sourceDir,
    workerFile: 'worker-skills-8663.js',
    versionHash: workerVersionHash,
    capturedAt,
    fixtureId: fixtureCase.id,
    compactPayloadHash: request.compactPayloadHash,
  };

  return {
    id: fixtureCase.id,
    domain: fixtureCase.domain,
    purpose: fixtureCase.purpose,
    evidenceState: best && rows.length > 0 ? 'live-captured' : 'missing',
    captureMetadata,
    compactConfig: fixtureCase.compactConfig,
    compactPayloadHash: request.compactPayloadHash,
    skillsRequests: [request],
    decodedResults: [
      {
        messageIndex: 0,
        workerId: 'local-vm',
        requestIndex: 0,
        requestMatchScore: null,
        workerUrl: 'worker-skills-8663.js',
        rows,
        top: rows[0] ?? null,
      },
    ],
    best: best ?? {
      requestIndex: 0,
      multiplier: null,
      skillBits: [],
      rowSignature: [],
    },
    liveExpected: best
      ? {
          multiplier: best.multiplier,
          skillBits: best.skillBits,
          rowSignature: best.rowSignature,
        }
      : null,
    decodedRowStatSignatures: topSignature ? [topSignature] : [],
  };
}

const manifest = JSON.parse(await fsp.readFile(manifestPath, 'utf8'));
const template = JSON.parse(await fsp.readFile(templateWorkerSummaryPath, 'utf8'));
const templateCase = template.cases?.[0];
const templateRequest = templateCase?.skillsRequests?.[templateCase.best?.requestIndex ?? 0];
if (!templateRequest) {
  throw new Error('Unable to locate template skills request');
}

const sourceDir = findWorkerSourceDir();
const workerSource = fs.readFileSync(path.join(sourceDir, 'worker-skills-8663.js'), 'utf8');
const workerVersionHash = sha256(workerSource);
const cases = [];
for (const fixtureCase of manifest.cases ?? []) {
  cases.push(await captureCase(sourceDir, workerVersionHash, templateRequest, fixtureCase));
}

const summary = {
  manifestPath,
  templateWorkerSummaryPath,
  outputPath,
  source: 'local live sio-tools skills worker VM capture',
  sourceDir,
  versionHash: workerVersionHash,
  cases: cases.length,
  liveCaptured: cases.filter((item) => item.evidenceState === 'live-captured').length,
  missing: cases.filter((item) => item.evidenceState === 'missing').length,
  bestMultipliers: Object.fromEntries(cases.map((item) => [item.id, item.best?.multiplier ?? null])),
};

await fsp.mkdir(path.dirname(outputPath), { recursive: true });
await fsp.writeFile(
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
