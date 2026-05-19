import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import init, {
  initSync,
  relic_core_optimize_js,
  twinborn_auto_assign_js,
} from '../node_modules/tttg_forge_wasm/tttg_forge_wasm.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const outputDir = path.resolve(
  repoRoot,
  '..',
  '..',
  'Woosdom_Brain',
  '01_Domains',
  'System',
  'codex_output',
  'pareto_v3_optimizer_ui_relic_twinborn_2026-05-17',
);
const outputPath = path.join(outputDir, 'optimizer_benchmark.json');

const wasmBytes = await readFile(
  path.resolve(repoRoot, 'tttg_forge_wasm', 'pkg', 'tttg_forge_wasm_bg.wasm'),
);
initSync({ module: wasmBytes });
await init();

const playerState = {
  base_attack: 1000,
  tech_parts: [
    { id: 'drone', equipped_slot: 'attack_1', is_twinborn: true, resonance_chip_allocated: 0 },
    { id: 'molotov', equipped_slot: 'attack_2', is_twinborn: false, resonance_chip_allocated: 1 },
    { id: 'rocket', equipped_slot: 'defense_1', is_twinborn: true, resonance_chip_allocated: 2 },
  ],
  ss_equipment: [],
};

const constraints = {
  eternalCores: 18,
  voidCores: 12,
  chaosCores: 8,
  relicKeys: 10,
  gold: 600000,
  topK: 5,
};

const chipPool = {
  availableChips: 24,
  iterationCap: 10000,
  assignmentCount: 3,
};

function measure(iterations, fn) {
  const values = [];
  let last;
  for (let index = 0; index < iterations; index += 1) {
    const started = performance.now();
    last = fn();
    values.push(performance.now() - started);
  }
  values.sort((a, b) => a - b);
  const total = values.reduce((sum, value) => sum + value, 0);
  return {
    iterations,
    avg_ms: total / iterations,
    p95_ms: values[Math.floor(values.length * 0.95)],
    max_ms: values.at(-1),
    last,
  };
}

for (let index = 0; index < 10; index += 1) {
  relic_core_optimize_js(playerState, constraints);
  twinborn_auto_assign_js(playerState, chipPool);
}

const relic = measure(100, () => relic_core_optimize_js(playerState, constraints));
const twinborn = measure(100, () => twinborn_auto_assign_js(playerState, chipPool));
const payload = {
  created_at: new Date().toISOString(),
  relic_core: {
    avg_ms: relic.avg_ms,
    p95_ms: relic.p95_ms,
    max_ms: relic.max_ms,
    builds: relic.last.builds.length,
    pareto_set: relic.last.paretoSet.length,
    search_space_size: relic.last.searchSpaceSize,
  },
  twinborn_auto_assign: {
    avg_ms: twinborn.avg_ms,
    p95_ms: twinborn.p95_ms,
    max_ms: twinborn.max_ms,
    assignments: twinborn.last.assignments.length,
    iterations: twinborn.last.iterations,
    iteration_cap: twinborn.last.iterationCap,
  },
};

await mkdir(outputDir, { recursive: true });
await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
console.log(outputPath);
