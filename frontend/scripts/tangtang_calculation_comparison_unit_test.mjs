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
  buildCalculationComparisonExplanation,
  buildCalculationComparisonSummary,
  buildCalculationComparisonInputChangeSummary,
  topBuildDamageFactor,
} = await import(pathToFileURL(outputPath));

assert.equal(typeof buildCalculationComparisonExplanation, 'function');
assert.equal(typeof buildCalculationComparisonSummary, 'function');
assert.equal(typeof buildCalculationComparisonInputChangeSummary, 'function');
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

const inputChangeSummary = buildCalculationComparisonInputChangeSummary({
  importedAccountContext: { finalAtk: 1000, critRate: 10, movementSpeed: 5 },
  currentAccountContext: { finalAtk: 1200, critRate: 10, movementSpeed: 8 },
  importedInventory: { chips: 10, skillSlots: 4 },
  currentInventory: { chips: 6, skillSlots: 4 },
});
assert.deepEqual(inputChangeSummary, {
  accountContextChanges: 2,
  inventoryChanges: 1,
  changed: true,
});

const improvedExplanation = buildCalculationComparisonExplanation({
  summary: improvedSummary,
  inputChanges: inputChangeSummary,
  locale: 'en',
});
assert.match(improvedExplanation.headline, /Tangtang calculation is higher/);
assert.match(improvedExplanation.details.join('\n'), /current editable inputs/);
assert.match(improvedExplanation.details.join('\n'), /Account context changed in 2 fields/);
assert.match(improvedExplanation.details.join('\n'), /Tech inputs changed in 1 field/);

const koExplanation = buildCalculationComparisonExplanation({
  summary: improvedSummary,
  inputChanges: inputChangeSummary,
  locale: 'ko',
});
assert.match(koExplanation.headline, /Tangtang 계산이 더 높습니다/);
assert.match(koExplanation.details.join('\n'), /현재 화면 입력값/);

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
