import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';

const workerSummaryPath =
  process.env.WORKER_SUMMARY_PATH ??
  path.join(process.cwd(), 'artifacts/td11/sio_worker_decoded_summary_2026-05-20.json');
const outputPath =
  process.env.OUTPUT_PATH ??
  path.join(process.cwd(), 'artifacts/td11/sio_lm_trace_summary_2026-05-20.json');

function percent(value) {
  return (value + 100) * 0.01;
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function num(object, key, fallback = 0) {
  const value = object?.[key];
  return Number.isFinite(value) ? value : fallback;
}

function optionalMultiplier(stats, key) {
  return Number.isFinite(stats?.[key]) ? stats[key] : 1;
}

const BASE_STAT_COMPONENT_LABELS = [
  'baseStats',
  'heroes',
  'synergy',
  'harmony',
  'collectibles',
  'collectibleSets',
  'customSets',
  'evoTree',
  'turf',
  'pets',
  'mounts',
  'skills',
  'lmeTestaments',
  'eeSkills',
];

const STAT_ATTRIBUTION_KEYS = [
  'atkPercent',
  'chilled',
  'critDamage',
  'critRate',
  'damageBoss',
  'damageTransmute',
  'poisoned',
  'shieldDamage',
  'skillDamage',
  'ssMiscPath',
  'vulnerability',
];

function nonZeroSortedEntries(object) {
  return Object.fromEntries(
    Object.entries(object ?? {})
      .filter(([, value]) => Number(value) !== 0)
      .sort(([left], [right]) => left.localeCompare(right)),
  );
}

function trackedNonZeroStats(stats) {
  return Object.fromEntries(
    STAT_ATTRIBUTION_KEYS.map((key) => [key, Number(stats?.[key]) || 0])
      .filter(([, value]) => value !== 0)
      .sort(([left], [right]) => left.localeCompare(right)),
  );
}

function statTraceDeltas(snapshots) {
  if (!Array.isArray(snapshots)) {
    return undefined;
  }
  const deltas = [];
  let previous = null;
  for (const snapshot of snapshots) {
    const stats = snapshot?.stats ?? {};
    if (!previous) {
      deltas.push({
        label: snapshot.label,
        stats: trackedNonZeroStats(stats),
        delta: trackedNonZeroStats(stats),
      });
      previous = stats;
      continue;
    }
    const delta = {};
    for (const key of STAT_ATTRIBUTION_KEYS) {
      const value = Number(stats?.[key]) || 0;
      const prior = Number(previous?.[key]) || 0;
      if (value !== prior) {
        delta[key] = value - prior;
      }
    }
    deltas.push({
      label: snapshot.label,
      stats: trackedNonZeroStats(stats),
      delta: nonZeroSortedEntries(delta),
    });
    previous = stats;
  }
  return deltas;
}

function techStageDeltas(snapshots) {
  if (!Array.isArray(snapshots)) {
    return undefined;
  }
  return snapshots.map((snapshot) => {
    const stats = snapshot?.stats ?? {};
    const before = snapshot?.beforeStats ?? {};
    const delta = {};
    for (const key of STAT_ATTRIBUTION_KEYS) {
      const value = Number(stats?.[key]) || 0;
      const prior = Number(before?.[key]) || 0;
      if (value !== prior) {
        delta[key] = value - prior;
      }
    }
    return {
      tech: snapshot.tech,
      mode: snapshot.mode,
      rarity: snapshot.rarity,
      resonance: snapshot.resonance,
      overload: snapshot.overload,
      active: Boolean(snapshot.active),
      stats: trackedNonZeroStats(stats),
      delta: nonZeroSortedEntries(delta),
    };
  });
}

function findWorkerSourceDir() {
  if (process.env.SIO_WORKER_SRC_DIR) {
    return process.env.SIO_WORKER_SRC_DIR;
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

function patchBaseStatComponentCapture(code) {
  const needle = 'll=(0,s.x)([';
  const start = code.indexOf(needle);
  if (start < 0) {
    throw new Error('Unable to find worker-skills ll base stat aggregation expression');
  }
  const argumentStart = start + 'll=(0,s.x)('.length;
  let depth = 0;
  let inString = false;
  let expressionEnd = -1;
  for (let index = argumentStart; index < code.length; index += 1) {
    const char = code[index];
    if (inString) {
      if (char === '\\') {
        index += 1;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }
    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === '[' || char === '(' || char === '{') {
      depth += 1;
      continue;
    }
    if (char === ']' || char === ')' || char === '}') {
      depth -= 1;
      if (depth === 0) {
        expressionEnd = index + 1;
        break;
      }
    }
  }
  if (expressionEnd < 0) {
    throw new Error('Unable to parse worker-skills ll base stat aggregation expression');
  }
  const arrayExpression = code.slice(argumentStart, expressionEnd);
  const callEnd = code[expressionEnd] === ')' ? expressionEnd + 1 : expressionEnd;
  return `${code.slice(0, start)}__llParts=${arrayExpression},ll=(0,s.x)(__llParts)${code.slice(
    callEnd,
  )}`;
}

async function loadPatchedWorker(sourceDir, posted) {
  const context = createWorkerContext(sourceDir, posted);
  context.__traceLmBaseComponentsEnabled = process.env.TRACE_LM_BASE_COMPONENTS === '1';
  context.__traceLmStatAttributionEnabled = process.env.TRACE_LM_STAT_ATTRIBUTION === '1';
  context.__traceLmTechStageEnabled = process.env.TRACE_LM_TECH_STAGE === '1';
  const sourcePath = path.join(sourceDir, 'worker-skills-8663.js');
  let code = fs.readFileSync(sourcePath, 'utf8');
  code = patchBaseStatComponentCapture(code);
  const techStageStartNeedle =
    'function Q(e,l){var t,r,o,n,s,a;if(!(null==l?void 0:l.deployed))return;let{rarity:c=p.LZ.Legend,resonance:h,overload:m}=l,b=null!=(n=l.mode)?n:g.zD[e],x=!!O[b],E=null==(t=d.c.techs[e])?void 0:t[b];';
  const techStageStartReplacement =
    'function Q(e,l){var t,r,o,n,s,a;if(!(null==l?void 0:l.deployed))return;let __beforeStats=self.__traceLmTechStageEnabled?{...N}:void 0;let{rarity:c=p.LZ.Legend,resonance:h,overload:m}=l,b=null!=(n=l.mode)?n:g.zD[e],x=!!O[b],E=null==(t=d.c.techs[e])?void 0:t[b];';
  const techStageEndNeedle = 'X[b]=w,_+=w}';
  const techStageEndReplacement =
    'X[b]=w,_+=w,self.__traceLmTechStageEnabled&&self.__activeLmTechStageSnapshots&&self.__activeLmTechStageSnapshots.push({tech:e,mode:b,rarity:c,resonance:h,overload:m,active:x,beforeStats:__beforeStats,stats:{...N}})}';
  const baseNeedle =
    'let{ceDamage:o,passivePools:n}=E({evolvePassives:li,cooldownReduction:r,techs:e,skills:lh,collectibles:eO,upgradedCollectibles:e7,settings:e5,gameMode:eb,eeOmnipower:eA,eeSkills:eL,staticCache:e8,stableTechEntries:t?V:void 0},la);';
  const baseReplacement =
    'let __baseStatsBeforeTech={...la},__lmStatSnapshots=[],__recordLmStatSnapshot=e=>{self.__traceLmStatAttributionEnabled&&__lmStatSnapshots.push({label:e,stats:{...la}})};self.__activeLmTechStageSnapshots=self.__traceLmTechStageEnabled?[]:void 0;__recordLmStatSnapshot("beforeTech");let{ceDamage:o,passivePools:n}=E({evolvePassives:li,cooldownReduction:r,techs:e,skills:lh,collectibles:eO,upgradedCollectibles:e7,settings:e5,gameMode:eb,eeOmnipower:eA,eeSkills:eL,staticCache:e8,stableTechEntries:t?V:void 0},la);__recordLmStatSnapshot("afterTech");';
  const activeSkillNeedle =
    'la.cooldownReduction=r,e4>=7&&((lh["Rocket Mode"]||lh.Rocket)&&(la.lacerationUptime=1),e4>=8&&lh["Laser Mode"]&&(la.lacerationUptime=1),e4>=10&&(lh["Drone Mode"]||lh.Drone)&&(la.lacerationUptime=1));let s=0;';
  const activeSkillReplacement =
    'la.cooldownReduction=r,__recordLmStatSnapshot("afterCooldown"),e4>=7&&((lh["Rocket Mode"]||lh.Rocket)&&(la.lacerationUptime=1),e4>=8&&lh["Laser Mode"]&&(la.lacerationUptime=1),e4>=10&&(lh["Drone Mode"]||lh.Drone)&&(la.lacerationUptime=1));__recordLmStatSnapshot("afterActiveSkillPostprocess");let s=0;';
  const equipmentNeedle = '(0,v.Dp)(la,ls[s]),(0,_.zP)(ld);';
  const equipmentReplacement =
    '(0,v.Dp)(la,ls[s]),__recordLmStatSnapshot("afterEquipmentTransmute"),(0,_.zP)(ld),__recordLmStatSnapshot("afterEquipmentDynamicSpecials");';
  const needle = 'return(0,_.IE)(lv),(0,H.f)(la,lu,a,i,e5.calcMode,lh,n,eb)';
  const replacement =
    'return(()=>{(0,_.IE)(lv);__recordLmStatSnapshot("afterEvolvePassivesPostprocess");let __score=(0,H.f)(la,lu,a,i,e5.calcMode,lh,n,eb);if(__score>((self.__bestLmTrace&&self.__bestLmTrace.score)||0))self.__bestLmTrace={score:__score,mask:l,calcMode:e5.calcMode,gameMode:eb,attackMeta:{...lu},damageFactor:a,ceDamage:i,baseStats:{...__baseStatsBeforeTech},baseStatComponents:self.__traceLmBaseComponentsEnabled?__llParts.map(e=>e&&typeof e==="object"?{...e}:e):void 0,statSnapshots:self.__traceLmStatAttributionEnabled?__lmStatSnapshots.map(e=>({label:e.label,stats:{...e.stats}})):void 0,techStageSnapshots:self.__traceLmTechStageEnabled&&self.__activeLmTechStageSnapshots?self.__activeLmTechStageSnapshots.map(e=>({tech:e.tech,mode:e.mode,rarity:e.rarity,resonance:e.resonance,overload:e.overload,active:e.active,beforeStats:{...e.beforeStats},stats:{...e.stats}})):void 0,stats:{...la},skills:{...lh},techs:JSON.parse(JSON.stringify(e)),passivePools:Array.from(n||[])};return __score})()';
  if (!code.includes(baseNeedle)) {
    throw new Error('Unable to patch worker-skills lm() base stats expression');
  }
  if (!code.includes(techStageStartNeedle) || !code.includes(techStageEndNeedle)) {
    throw new Error('Unable to patch worker-skills E() tech stage attribution');
  }
  if (!code.includes(activeSkillNeedle)) {
    throw new Error('Unable to patch worker-skills lm() active skill postprocess expression');
  }
  if (!code.includes(equipmentNeedle)) {
    throw new Error('Unable to patch worker-skills lm() equipment postprocess expression');
  }
  if (!code.includes(needle)) {
    throw new Error('Unable to patch worker-skills lm() return expression');
  }
  code = code
    .replace(techStageStartNeedle, techStageStartReplacement)
    .replace(techStageEndNeedle, techStageEndReplacement)
    .replace(baseNeedle, baseReplacement)
    .replace(activeSkillNeedle, activeSkillReplacement)
    .replace(equipmentNeedle, equipmentReplacement)
    .replace(needle, replacement);
  code = code.replace('_N_E=t.x()', 'self.__webpack_require__=t;self.__webpack_ready__=t.x()');
  vm.runInContext(code, context, { filename: sourcePath });
  await context.__webpack_ready__;
  return context;
}

function computeStageFactors(trace, damageOrder, passiveIndex) {
  const stats = trace.stats ?? {};
  const attack = trace.attackMeta ?? {};
  const critRate = clamp01(num(stats, 'critRate') / 100);
  const critDamage = Math.max(num(stats, 'critDamage') / 100, 2);
  const factors = [
    {
      key: 'attack',
      value:
        (num(attack, 'atkBase') +
          num(stats, 'atkEquip') * percent(num(stats, 'atkEquipPercent')) +
          num(stats, 'atkHero') * percent(num(stats, 'atkHeroPercent'))) *
          percent(num(stats, 'atkPercent')) +
        num(attack, 'atkFinal') +
        num(stats, 'atkFinal'),
    },
    { key: 'crit', value: critRate * critDamage + (1 - critRate) },
    { key: 'skillDamage', value: percent(Math.max(0, num(stats, 'skillDamage'))) },
    { key: 'vulnerability', value: percent(Math.max(0, num(stats, 'vulnerability'))) },
    {
      key: 'shieldDamage',
      value: percent(Math.max(0, num(stats, 'shieldDamage') * num(stats, 'shieldDamageUptime'))),
    },
    {
      key: 'statusDamage',
      value: percent(
        Math.max(0, num(stats, 'poisoned') * num(stats, 'poisonedUptime')) +
          Math.max(0, num(stats, 'weakened') * num(stats, 'weakenedUptime')) +
          Math.max(0, num(stats, 'chilled') * num(stats, 'chilledUptime')) +
          num(stats, 'exposedDamage'),
      ),
    },
    { key: 'clarity', value: percent(num(stats, 'clarity')) },
    { key: 'eternalMultiplier', value: percent(num(stats, 'eternalMultiplier')) },
    { key: 'glacialBloodline', value: percent(num(stats, 'glacialBloodline')) },
    {
      key: 'lacerationDivineFire',
      value: percent(
        Math.max(0, num(stats, 'laceration') * num(stats, 'lacerationUptime')) +
          Math.max(0, num(stats, 'divineFire') * num(stats, 'divineFireUptime')),
      ),
    },
    { key: 'joeyWeakSpot', value: percent(num(stats, 'joeyWeakSpot')) },
    { key: 'ssGlovesLaser', value: percent(num(stats, 'ssGlovesLaser')) },
    { key: 'flashriftRip', value: percent(num(stats, 'flashriftRip')) },
    { key: 'taloxaOverload', value: percent(num(stats, 'taloxaOverload')) },
    { key: 'eternalSuitBoost', value: optionalMultiplier(stats, 'eternalSuitBoost') },
    {
      key: 'voidNeckBoost',
      value: optionalMultiplier(stats, 'voidNeckBoost') * num(stats, 'voidNeckBoostUptime'),
    },
    { key: 'voidGlovesInstakill', value: optionalMultiplier(stats, 'voidGlovesInstakill') },
    { key: 'voidBootsBoost', value: optionalMultiplier(stats, 'voidBootsBoost') },
    { key: 'chaosBeltBoost', value: optionalMultiplier(stats, 'chaosBeltBoost') },
    { key: 'hpBulletBoost', value: optionalMultiplier(stats, 'hpBulletBoost') },
    { key: 'damageDealt', value: percent(num(stats, 'damageDealt')) },
    { key: 'adrenaline', value: percent(num(stats, 'adrenaline')) },
    { key: 'damageTransmute', value: percent(num(stats, 'damageTransmute')) },
    { key: 'damageBoss', value: percent(num(stats, 'damageBoss')) },
    { key: 'xenoResMultiplier', value: percent(num(stats, 'xenoResMultiplier')) },
  ];

  if (trace.gameMode === 'lme1') {
    factors.push({ key: 'lme1Damage', value: percent(num(stats, 'lme1Damage')) });
  }

  if (trace.calcMode === 'damage') {
    const inverseDamageFactor = 1 / (trace.damageFactor || 1);
    const ceDamage = trace.ceDamage ?? {};
    const passivePools = trace.passivePools ?? [];
    const skillEnabled = trace.skills ?? {};
    const pool = (mode, passive) => passivePools[passiveIndex?.[mode]?.[passive]] ?? 1;
    let exo = 0;
    let ammo = 0;
    let fuel = 0;
    let cube = 0;
    let normalization = 0;
    const useExo = Boolean(skillEnabled['Exo Bracer']);
    const useAmmo = Boolean(skillEnabled['Ammo Thruster']);
    const useFuel = Boolean(skillEnabled['HE Fuel']);
    const useCube = Boolean(num(stats, 'cooldownReduction'));

    for (const mode of damageOrder) {
      const contribution = Number(ceDamage[mode]) || 0;
      if (!contribution) {
        continue;
      }
      let divisor = 1;
      if (useExo) {
        const value = pool(mode, 'Exo Bracer');
        exo += contribution * (value - 1);
        divisor *= value;
      }
      if (useAmmo) {
        const value = pool(mode, 'Ammo Thruster');
        ammo += contribution * (value - 1);
        divisor *= value;
      }
      if (useFuel) {
        const value = pool(mode, 'HE Fuel');
        fuel += contribution * (value - 1);
        divisor *= value;
      }
      if (useCube) {
        const value = pool(mode, 'Energy Cube');
        cube += contribution * (value - 1);
        divisor *= value;
      }
      normalization += contribution / divisor - contribution;
    }

    factors.push({ key: 'damageFactor', value: trace.damageFactor || 1 });
    factors.push({ key: 'damageNormalization', value: normalization * inverseDamageFactor + 1 || 1 });
    factors.push({ key: 'exoBracerCorrection', value: useExo ? exo * inverseDamageFactor + 1 || 1 : 1 });
    factors.push({ key: 'ammoThrusterCorrection', value: useAmmo ? ammo * inverseDamageFactor + 1 || 1 : 1 });
    factors.push({ key: 'heFuelCorrection', value: useFuel ? fuel * inverseDamageFactor + 1 || 1 : 1 });
    factors.push({ key: 'energyCubeCorrection', value: useCube ? cube * inverseDamageFactor + 1 || 1 : 1 });
  }

  const product = factors.reduce((acc, factor) => acc * factor.value, 1);
  return { factors, product };
}

async function traceCase(sourceDir, workerCase) {
  const bestRequest = workerCase.skillsRequests[workerCase.best?.requestIndex ?? 0];
  if (!bestRequest) {
    throw new Error(`No best request for ${workerCase.id}`);
  }
  const posted = [];
  const context = await loadPatchedWorker(sourceDir, posted);
  const catalog = context.__webpack_require__(32085);
  const passiveCatalog = context.__webpack_require__(6914);
  await context.onmessage({
    data: {
      speedMode: bestRequest.speedMode,
      tasks: bestRequest.tasks,
      skillsMap: bestRequest.skillsMap,
      configString: bestRequest.configString,
      robotNames: bestRequest.robotNames,
      modes: bestRequest.modes,
      skillsCount: bestRequest.skillsCount,
    },
  });
  const result = posted.filter((message) => message?.type === 'result').at(-1);
  const trace = context.__bestLmTrace;
  if (!result || !trace) {
    throw new Error(`No traced result for ${workerCase.id}`);
  }
  const decodeConfig = context.__webpack_require__(73755).P;
  const normalizeConfig = context.__webpack_require__(27473).Z;
  const expandedConfig = normalizeConfig(decodeConfig(JSON.parse(bestRequest.configString)));
  const stages = computeStageFactors(trace, passiveCatalog.y7, passiveCatalog.AS);
  return {
    id: workerCase.id,
    expectedMultiplier: workerCase.best?.multiplier ?? null,
    replayedTopMultiplier: result.value?.[0]?.[1] ?? null,
    tracedMultiplier: trace.score,
    recomputedStageProduct: stages.product,
    stageProductRelativeError:
      trace.score !== 0 ? Math.abs(stages.product - trace.score) / Math.abs(trace.score) : null,
    mask: trace.mask,
    calcMode: trace.calcMode,
    gameMode: trace.gameMode,
    expandedConfig: {
      meta: expandedConfig.meta,
      settings: expandedConfig.settings,
      skills: expandedConfig.skills,
      techsOptimizer: expandedConfig.techsOptimizer,
    },
    exportedSkillOrder: catalog.J3,
    enabledSkills: Object.entries(trace.skills)
      .filter(([, enabled]) => enabled)
      .map(([skill]) => skill),
    activeResultSkills: (workerCase.best?.skillBits ?? [])
      .map((enabled, index) => (enabled ? catalog.J3[index] : null))
      .filter(Boolean),
    damageFactor: trace.damageFactor,
    attackMeta: trace.attackMeta,
    baseStats: nonZeroSortedEntries(trace.baseStats),
    baseStatComponents: Array.isArray(trace.baseStatComponents)
      ? trace.baseStatComponents.map((stats, index) => ({
          index,
          label: BASE_STAT_COMPONENT_LABELS[index] ?? `component${index}`,
          stats: nonZeroSortedEntries(stats),
        }))
      : undefined,
    statTraceSnapshots: Array.isArray(trace.statSnapshots)
      ? trace.statSnapshots.map((snapshot) => ({
          label: snapshot.label,
          stats: trackedNonZeroStats(snapshot.stats),
        }))
      : undefined,
    statTraceDeltas: statTraceDeltas(trace.statSnapshots),
    techStageDeltas: techStageDeltas(trace.techStageSnapshots),
    techs: trace.techs,
    nonZeroStats: nonZeroSortedEntries(trace.stats),
    ceDamage: trace.ceDamage,
    passivePools: trace.passivePools,
    stageFactors: stages.factors,
  };
}

const sourceDir = findWorkerSourceDir();
const workerSummary = JSON.parse(await fsp.readFile(workerSummaryPath, 'utf8'));
const cases = [];
for (const workerCase of workerSummary.cases) {
  cases.push(await traceCase(sourceDir, workerCase));
}

const summary = {
  workerSummaryPath,
  outputPath,
  sourceDir,
  cases: cases.length,
  stageProductPassed: cases.filter((row) => row.stageProductRelativeError <= 1e-12).length,
  replayedPassed: cases.filter((row) => row.replayedTopMultiplier === row.expectedMultiplier).length,
  calcModes: [...new Set(cases.map((row) => row.calcMode))],
  gameModes: [...new Set(cases.map((row) => row.gameMode))],
  damageFactorRange: {
    min: Math.min(...cases.map((row) => row.damageFactor).filter(Number.isFinite)),
    max: Math.max(...cases.map((row) => row.damageFactor).filter(Number.isFinite)),
  },
};

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
