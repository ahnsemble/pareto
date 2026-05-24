import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const __dirname = dirname(fileURLToPath(import.meta.url));
const modulePath = resolve(__dirname, '../app/lib/pareto-store/tech-data-confidence.ts');
const tmpDir = resolve(tmpdir(), 'pareto-tangtang-tech-data-confidence-tests');

if (!existsSync(modulePath)) {
  throw new Error(`tech data confidence helper missing: ${modulePath}`);
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
const outputPath = resolve(tmpDir, 'tech-data-confidence.js');
writeFileSync(outputPath, transpiled.outputText);

const {
  buildTechDataConfidenceSummary,
} = createRequire(import.meta.url)(outputPath);

assert.equal(typeof buildTechDataConfidenceSummary, 'function');

const manual = buildTechDataConfidenceSummary({ coverage: [], locale: 'en' });
assert.equal(manual.level, 'low');
assert.match(manual.details.join('\n'), /manual inputs/i);
assert.equal(manual.importedCount, 0);

const review = buildTechDataConfidenceSummary({
  coverage: [
    { id: 'buildStats', label: 'Build stats', status: 'imported' },
    { id: 'accountContext', label: 'Account context', status: 'needsReview' },
    { id: 'collectibles', label: 'Collectibles', status: 'missing' },
  ],
  hasImportedRunSnapshot: true,
  locale: 'en',
});
assert.equal(review.level, 'medium');
assert.equal(review.importedCount, 1);
assert.equal(review.reviewCount, 1);
assert.equal(review.missingCount, 1);
assert.match(review.details.join('\n'), /1 confirmed, 1 need review, 1 missing/);

const high = buildTechDataConfidenceSummary({
  coverage: [
    { id: 'buildStats', label: 'Build stats', status: 'imported' },
    { id: 'techInventory', label: 'Tech inventory', status: 'imported' },
    { id: 'accountContext', label: 'Account context', status: 'imported' },
  ],
  hasImportedRunSnapshot: true,
  hasTechSnapshot: true,
  hasCollectibleSnapshot: true,
  locale: 'ko',
});
assert.equal(high.level, 'high');
assert.match(high.details.join('\n'), /3개 확인/);
assert.match(high.details.join('\n'), /계산 기준값/);
assert.equal(/sio/i.test(JSON.stringify([manual, review, high])), false);

console.log('tangtang_tech_data_confidence_unit_test: passed');
