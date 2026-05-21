import { readFile } from 'node:fs/promises';
import init, { tech_optimizer_run_js } from '../../tttg_forge_wasm/pkg/tttg_forge_wasm.js';

const wasmPath = new URL('../../tttg_forge_wasm/pkg/tttg_forge_wasm_bg.wasm', import.meta.url);
await init({ module_or_path: await readFile(wasmPath) });

const playerState = {
  tech_configs: {
    energyGuidanceSystem: {
      resonance: 3000,
      mode: 'droneMode',
      equipped: true,
      twinbornLevel: 3,
    },
    quantumNanobot: {
      resonance: 3000,
      mode: 'durianMode',
      equipped: true,
      twinbornLevel: 3,
    },
    energyDiffuser: {
      resonance: 2100,
      mode: null,
      equipped: true,
      twinbornLevel: 2,
    },
  },
};
const smallExactState = {
  tech_configs: {
    energyGuidanceSystem: playerState.tech_configs.energyGuidanceSystem,
    quantumNanobot: playerState.tech_configs.quantumNanobot,
  },
};
const defaultCatalogState = { tech_configs: {} };
const sioFormulaState = {
  damage: {
    base_attack: 1000,
    skill_damage_percent: 10,
  },
  mode: 'damage',
  selected_hero: { id: 'common' },
  conditional_state: {},
  xeno_transmute_modifier: null,
  ss_equipment: [],
  tech_configs: {
    energyGuidanceSystem: {
      resonance: 3000,
      mode: 'laserMode',
      equipped: true,
      twinbornLevel: 3,
    },
  },
};
const sioFormulaOptions = {
  topK: 5,
  beamWidth: 16,
  maxExactNodes: 10,
  techsOptimizer: {
    strategy: 'precise+',
    speedMode: 'full',
    fodder: 'smart',
    skills: 6,
    chips: 100,
    overloadable: true,
    overload: 'full',
    inputs: { legend: 2, epic: 8 },
    modes: ['laserMode', 'rocketMode'],
    limit: 'advanced',
    modeEntries: {
      rocketMode: {
        minResonance: 1000,
        maxResonance: 3000,
        minOverload: 0,
        maxOverload: 2,
      },
    },
    skillsMap: {
      Laser: 'disabled',
      Rocket: 'preferred',
    },
  },
};

function assertResult(result, expectedGuarantee) {
  if (!result.builds || result.builds.length === 0) {
    throw new Error('tech optimizer returned no builds');
  }
  if (result.quality?.guarantee !== expectedGuarantee) {
    throw new Error(`expected ${expectedGuarantee}, got ${result.quality?.guarantee ?? 'missing quality'}`);
  }
  for (let index = 1; index < result.builds.length; index += 1) {
    if (result.builds[index - 1].score < result.builds[index].score) {
      throw new Error('tech optimizer builds are not sorted by score');
    }
  }
}

function percentile(runs, p) {
  return runs[Math.min(runs.length - 1, Math.floor(runs.length * p))];
}

function runCase(name, state, options, expectedGuarantee, iterations) {
  const runs = [];
  let lastResult = null;
  for (let i = 0; i < iterations; i += 1) {
    const started = performance.now();
    const result = tech_optimizer_run_js(state, options);
    runs.push(performance.now() - started);
    lastResult = result;
    assertResult(result, expectedGuarantee);
  }

  runs.sort((left, right) => left - right);
  return {
    name,
    runs: iterations,
    guarantee: lastResult?.quality?.guarantee,
    scoreGapPercent: lastResult?.quality?.score_gap_percent,
    optimizerSchema: lastResult?.scope?.optimizer_schema,
    problemScope: lastResult?.scope?.problem_scope,
    fullSioEquivalent: lastResult?.scope?.full_sio_equivalent,
    estimatedFullJointNodes: lastResult?.scope?.estimated_full_joint_nodes,
    estimatedSchemaMultiplier: lastResult?.scope?.estimated_schema_multiplier,
    schemaDimensions: lastResult?.scope?.schema_dimensions ?? [],
    builds: lastResult?.builds?.length ?? 0,
    minMs: runs[0],
    p50Ms: percentile(runs, 0.5),
    p95Ms: percentile(runs, 0.95),
    maxMs: runs[runs.length - 1],
  };
}

const exactCase = runCase(
  'sample_2_config_exact_joint_provisional',
  smallExactState,
  {
    topK: 10,
    beamWidth: 64,
    maxExactNodes: 250000,
  },
  'exact_joint_provisional',
  50,
);

const sampleBeamCase = runCase(
  'sample_3_config_beam_bounded_provisional',
  playerState,
  {
    topK: 10,
    beamWidth: 64,
    maxExactNodes: 250000,
  },
  'beam_bounded_provisional',
  50,
);

const fullCatalogBeamCase = runCase(
  'default_10_config_beam_bounded_provisional',
  defaultCatalogState,
  {
    topK: 10,
    beamWidth: 64,
    maxExactNodes: 250000,
  },
  'beam_bounded_provisional',
  50,
);

const beamCase = runCase(
  'default_10_config_beam_cap_10',
  defaultCatalogState,
  {
    topK: 10,
    beamWidth: 16,
    maxExactNodes: 10,
  },
  'beam_bounded_provisional',
  50,
);

const sioSchemaCase = runCase(
  'default_10_config_sio_schema_beam',
  defaultCatalogState,
  {
    topK: 10,
    beamWidth: 16,
    maxExactNodes: 10,
    techsOptimizer: {
      strategy: 'precise+',
      speedMode: 'full',
      fodder: 'smart',
      skills: 6,
      chips: 100,
      overloadable: true,
      overload: 'full',
      inputs: { legend: 2, epic: 8 },
      modes: ['droneMode', 'rocketMode'],
      limit: 'advanced',
      modeEntries: {
        droneMode: {
          minResonance: 0,
          maxResonance: 3000,
          minOverload: 0,
          maxOverload: 2,
        },
      },
      skillsMap: {
        Drone: 'preferred',
        Molotov: 'enabled',
        Laser: 'disabled',
      },
    },
  },
  'beam_bounded_provisional',
  20,
);

const sioFormulaCase = runCase(
  'sio_schema_formula_adapter_beam_bounded',
  sioFormulaState,
  sioFormulaOptions,
  'beam_bounded_formula',
  20,
);

const cases = [
  exactCase,
  sampleBeamCase,
  fullCatalogBeamCase,
  beamCase,
  sioSchemaCase,
  sioFormulaCase,
];

for (const item of cases) {
  if (item.p95Ms >= 3000) {
    throw new Error(`${item.name} p95 exceeded 3000ms: ${item.p95Ms}`);
  }
}

console.log(
  JSON.stringify(
    {
      runs: cases.reduce((sum, item) => sum + item.runs, 0),
      cases,
    },
    null,
    2,
  ),
);
