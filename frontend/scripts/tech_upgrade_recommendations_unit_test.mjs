import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import ts from 'typescript';

const root = process.cwd();
const buildDir = path.join(tmpdir(), 'pareto-tech-upgrade-recommendations-tests');

async function transpileModule(sourcePath, outPath) {
  const source = await fs.readFile(sourcePath, 'utf8');
  const result = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
      strict: true,
    },
    fileName: sourcePath,
  });
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, result.outputText);
}

await fs.rm(buildDir, { recursive: true, force: true });
await transpileModule(
  path.join(root, 'app/lib/pareto-store/schemas/index.ts'),
  path.join(buildDir, 'schemas/index.js'),
);
await transpileModule(
  path.join(root, 'app/lib/pareto-store/collectible-upgrade-recommendations.ts'),
  path.join(buildDir, 'collectible-upgrade-recommendations.js'),
);
await transpileModule(
  path.join(root, 'app/lib/pareto-store/tech-upgrade-recommendations.ts'),
  path.join(buildDir, 'tech-upgrade-recommendations.js'),
);

const require = createRequire(import.meta.url);
const { buildTechUpgradeRecommendations } = require(path.join(buildDir, 'tech-upgrade-recommendations.js'));

const result = {
  builds: [
    {
      config: {
        loadout: [
          { part: 'energyGuidanceSystem', mode: 'droneMode', sio: { chip: 12, overload: 3 } },
        ],
      },
    },
  ],
};

const recommendations = buildTechUpgradeRecommendations({
  result,
  chipRemainder: 6,
  importedCollectibleSnapshot: {
    items: [
      { itemIndex: 0, stars: 8 },
      { itemIndex: 25, stars: 5, customSetLevel: 4 },
    ],
    customSets: [
      { level: 4, itemIndices: [25] },
    ],
  },
});

const collectionRecommendation = recommendations.find((item) => item.id === 'collection-item');
assert.ok(collectionRecommendation, 'expected a collectible item recommendation');
assert.match(collectionRecommendation.title, /Shuttle Capsule/);
assert.match(collectionRecommendation.action, /5 stars/);
assert.equal(collectionRecommendation.confidence, 'high');
assert.equal(JSON.stringify(recommendations).includes('sio'), false);

const koRecommendations = buildTechUpgradeRecommendations({
  result,
  locale: 'ko',
  chipRemainder: 6,
  importedCollectibleSnapshot: {
    items: [
      { itemIndex: 1, stars: 5 },
    ],
  },
});
const koCollectionRecommendation = koRecommendations.find((item) => item.id === 'collection-item');
assert.ok(koCollectionRecommendation, 'expected a Korean collectible item recommendation');
assert.match(koCollectionRecommendation.title, /수집품 강화/);
assert.match(koCollectionRecommendation.action, /5성/);
const koChipRecommendation = koRecommendations.find((item) => item.id === 'chip-allocation');
assert.ok(koChipRecommendation, 'expected a Korean chip recommendation');
assert.match(koChipRecommendation.title, /칩 배분/);
assert.doesNotMatch(koChipRecommendation.title, /Allocate chips/);

console.log('tech_upgrade_recommendations_unit_test: passed');
