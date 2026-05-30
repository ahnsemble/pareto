import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const legacyOptimizePage = readFileSync(resolve(root, 'app/[locale]/optimize/page.tsx'), 'utf8');
const homePage = readFileSync(resolve(root, 'app/[locale]/page.tsx'), 'utf8');
const communityPage = readFileSync(resolve(root, 'app/[locale]/community/page.tsx'), 'utf8');
const localeLayout = readFileSync(resolve(root, 'app/[locale]/layout.tsx'), 'utf8');
const sitemap = readFileSync(resolve(root, 'app/sitemap.ts'), 'utf8');
const robots = readFileSync(resolve(root, 'app/robots.ts'), 'utf8');

const currentOptimizerPath = '/v3/optimizer/tech-parts';
const publicSiteUrl = 'https://tanggall.vercel.app';
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
  'legacy /optimize route must explicitly target the current tanggall tech-parts optimizer',
);
assert.match(
  legacyOptimizePage,
  /window\.location\.replace/,
  'legacy /optimize route must replace the browser location so deployed static exports leave the old screen',
);
assert.doesNotMatch(
  legacyOptimizePage,
  /Pick a hero|Configure inputs on the left|efficient frontier|tanggall \/ optimize/,
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
for (const [label, source] of [
  ['locale layout metadata', localeLayout],
  ['sitemap', sitemap],
  ['robots', robots],
]) {
  assert.ok(source.includes(publicSiteUrl), `${label} must use ${publicSiteUrl}`);
  assert.equal(source.includes('https://pareto.app'), false, `${label} must not use pareto.app`);
  assert.equal(source.includes('https://tangtang-two.vercel.app'), false, `${label} must not use tangtang-two`);
}

console.log('tangtang_legacy_optimize_redirect_unit_test: passed');
