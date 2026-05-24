import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const __dirname = dirname(fileURLToPath(import.meta.url));
const modulePath = resolve(__dirname, '../app/lib/pareto-store/tech-mode-presets.ts');
const tmpDir = resolve(tmpdir(), 'pareto-tangtang-tech-mode-presets-tests');

if (!existsSync(modulePath)) {
  throw new Error(`tech mode presets helper missing: ${modulePath}`);
}

mkdirSync(tmpDir, { recursive: true });
const source = readFileSync(modulePath, 'utf8');
const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    esModuleInterop: true,
    strict: true,
  },
  fileName: modulePath,
});
const outputPath = resolve(tmpDir, 'tech-mode-presets.js');
writeFileSync(outputPath, transpiled.outputText);

const {
  TECH_MODE_PRESETS,
  getTechModePreset,
} = createRequire(import.meta.url)(outputPath);

assert.deepEqual(TECH_MODE_PRESETS.map((preset) => preset.id), ['endersEcho', 'guildExpedition']);

const enders = getTechModePreset('endersEcho');
assert.equal(enders.skillSlots, 4);
assert.equal(enders.overloadable, false);
assert.equal(enders.maxOverload, 4);
assert.equal(enders.speedMode, 'normal');
assert.equal(enders.limit, 'basic');
assert.equal(enders.skillStatusOverrides.rocketMode, 'disabled');
assert.equal(enders.skillStatusOverrides.guardianMode, 'disabled');

const guild = getTechModePreset('guildExpedition');
assert.equal(guild.skillSlots, 6);
assert.equal(guild.overloadable, true);
assert.equal(guild.maxOverload, 18);
assert.equal(guild.speedMode, 'precise');
assert.equal(guild.limit, 'advanced');
assert.equal(guild.skillStatusOverrides.rocketMode, 'auto');
assert.equal(guild.skillStatusOverrides.guardianMode, 'auto');

assert.notDeepEqual(enders, guild);
assert.equal(/sio/i.test(JSON.stringify(TECH_MODE_PRESETS)), false);

console.log('tangtang_tech_mode_presets_unit_test: passed');
