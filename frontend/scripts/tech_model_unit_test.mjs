import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';

const root = process.cwd();
const buildDir = path.join(root, 'artifacts/td11-tech-parts-performance/tech-model-test-build');

async function transpileModule(sourcePath, outPath) {
  const source = await fs.readFile(sourcePath, 'utf8');
  const result = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
      strict: true,
      resolveJsonModule: true,
    },
    fileName: sourcePath,
  });
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, result.outputText);
}

async function loadTechModules() {
  await fs.rm(buildDir, { recursive: true, force: true });
  await transpileModule(
    path.join(root, 'app/lib/pareto-store/tech/types.ts'),
    path.join(buildDir, 'tech/types.js'),
  );
  await transpileModule(
    path.join(root, 'app/lib/pareto-store/tech/defaults.ts'),
    path.join(buildDir, 'tech/defaults.js'),
  );
  await transpileModule(
    path.join(root, 'app/lib/pareto-store/tech/migration.ts'),
    path.join(buildDir, 'tech/migration.js'),
  );
  const require = createRequire(import.meta.url);
  return {
    types: require(path.join(buildDir, 'tech/types.js')),
    defaults: require(path.join(buildDir, 'tech/defaults.js')),
    migration: require(path.join(buildDir, 'tech/migration.js')),
  };
}

const { types, defaults, migration } = await loadTechModules();

assert.equal(types.TECH_RARITIES.length, 10);
assert.equal(types.TWINBORN_CATEGORIES.length, 10);
assert.equal(types.TECH_MODES.length, 12);
assert.equal(defaults.DEFAULT_TECH_CONFIGS.energyGuidanceSystem.mode, 'droneMode');
assert.equal(defaults.DEFAULT_TECH_CONFIGS.energyGuidanceSystem.resonance, 3000);
assert.equal(defaults.DEFAULT_TECH_CONFIGS.quantumNanobot.mode, 'durianMode');
assert.equal(defaults.DEFAULT_TECH_CONFIGS.energyDiffuser.resonance, 2100);

const migrated = migration.migrateLegacyTechState({
  equipped_slots: { attack_1: 'drone' },
  tech_parts: [{ id: 'energyGuidanceSystem', resonance_chip_allocated: 1234, is_twinborn: true }],
});
assert.equal(migrated.configs.energyGuidanceSystem.resonance, 1234);
assert.ok(migrated.legacyWarnings.length >= 1);

console.log('tech model unit checks passed');
