import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import ts from 'typescript';

const __dirname = dirname(fileURLToPath(import.meta.url));
const modulePath = resolve(__dirname, '../app/lib/pareto-store/calculation-comparison.ts');
const tmpDir = resolve(tmpdir(), 'pareto-tangtang-calculation-comparison-tests');

if (!existsSync(modulePath)) {
  throw new Error(`calculation comparison helper missing: ${modulePath}`);
}

mkdirSync(tmpDir, { recursive: true });
const source = readFileSync(modulePath, 'utf8');
const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
    strict: true,
  },
});
const outputPath = resolve(tmpDir, `calculation-comparison-${Date.now()}-${Math.random().toString(16).slice(2)}.mjs`);
writeFileSync(outputPath, transpiled.outputText);

const {
  buildCalculationComparisonSummary,
  topBuildDamageFactor,
} = await import(pathToFileURL(outputPath));

assert.equal(typeof buildCalculationComparisonSummary, 'function');
assert.equal(typeof topBuildDamageFactor, 'function');

assert.equal(
  topBuildDamageFactor({ builds: [{ damageFactor: 123.456 }, { damageFactor: 789 }] }),
  123.456,
);
assert.equal(topBuildDamageFactor({ builds: [] }), null);
assert.equal(topBuildDamageFactor({ builds: [{ damageFactor: Number.NaN }] }), null);

const equalSummary = buildCalculationComparisonSummary({
  importedDamage: 1000,
  tangtangDamage: 1000,
});
assert.deepEqual(equalSummary, {
  status: 'ready',
  importedDamage: 1000,
  tangtangDamage: 1000,
  delta: 0,
  deltaPct: 0,
  changed: false,
});

const improvedSummary = buildCalculationComparisonSummary({
  importedDamage: 1000,
  tangtangDamage: 1125,
});
assert.equal(improvedSummary.status, 'ready');
assert.equal(improvedSummary.delta, 125);
assert.equal(improvedSummary.deltaPct, 12.5);
assert.equal(improvedSummary.changed, true);

assert.deepEqual(
  buildCalculationComparisonSummary({
    importedDamage: 0,
    tangtangDamage: 1000,
  }),
  { status: 'unavailable', reason: 'missing-baseline' },
);
assert.deepEqual(
  buildCalculationComparisonSummary({
    importedDamage: 1000,
    tangtangDamage: Number.NaN,
  }),
  { status: 'unavailable', reason: 'missing-current' },
);

assert.equal(JSON.stringify(equalSummary).includes('sio'), false);
assert.equal(JSON.stringify(improvedSummary).includes('SIO'), false);

console.log(
  JSON.stringify({
    script: 'tangtang_calculation_comparison_unit_test',
    status: 'passed',
    summaryHashPrefix: Buffer.from(JSON.stringify(improvedSummary)).toString('base64url').slice(0, 12),
  }),
);
