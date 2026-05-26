import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const legacyOptimizePage = readFileSync(resolve(root, 'app/[locale]/optimize/page.tsx'), 'utf8');
const homePage = readFileSync(resolve(root, 'app/[locale]/page.tsx'), 'utf8');
const communityPage = readFileSync(resolve(root, 'app/[locale]/community/page.tsx'), 'utf8');
const sitemap = readFileSync(resolve(root, 'app/sitemap.ts'), 'utf8');

const currentOptimizerPath = '/v3/optimizer/tech-parts';
const oldOptimizerImports = [
  'OptimizeInputForm',
  'OptimizeResultGrid',
  'ParetoFrontierChart',
  'TwoDeckOverlay',
  'COLLECTIBLES',
  'getWorker',
  '../../lib/wasm-worker',
];

assert.match(
  legacyOptimizePage,
  /LEGACY_OPTIMIZE_REDIRECT_TARGET\s*=\s*['"]\/v3\/optimizer\/tech-parts['"]/,
  'legacy /optimize route must explicitly target the current Tangtang tech-parts optimizer',
);
assert.match(
  legacyOptimizePage,
  /window\.location\.replace/,
  'legacy /optimize route must replace the browser location so deployed static exports leave the old screen',
);
assert.doesNotMatch(
  legacyOptimizePage,
  /Pick a hero|Configure inputs on the left|efficient frontier|Tangtang \/ optimize/,
  'legacy /optimize route must not render the old WASM optimizer screen',
);
for (const token of oldOptimizerImports) {
  assert.equal(
    legacyOptimizePage.includes(token),
    false,
    `legacy /optimize route must not import old optimizer surface token: ${token}`,
  );
}

for (const [label, source] of [
  ['home page', homePage],
  ['community page', communityPage],
]) {
  assert.equal(
    source.includes('href="/optimize"'),
    false,
    `${label} must not link users to the legacy /optimize surface`,
  );
  assert.ok(
    source.includes(`href="${currentOptimizerPath}"`),
    `${label} must link users to ${currentOptimizerPath}`,
  );
}

assert.equal(
  sitemap.includes("'/optimize'"),
  false,
  'sitemap must not advertise the legacy /optimize route',
);
assert.ok(
  sitemap.includes(`'${currentOptimizerPath}'`),
  `sitemap must advertise ${currentOptimizerPath}`,
);

console.log('tangtang_legacy_optimize_redirect_unit_test: passed');
