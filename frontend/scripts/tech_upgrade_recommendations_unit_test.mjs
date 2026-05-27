import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import ts from 'typescript';

const root = process.cwd();
const buildDir = path.join(tmpdir(), 'pareto-tech-upgrade-recommendations-tests');

async function transpileModule(sourcePath, outPath, replacements = []) {
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
  let outputText = result.outputText;
  for (const [from, to] of replacements) {
    outputText = outputText.replaceAll(from, to);
  }
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, outputText);
}

await fs.rm(buildDir, { recursive: true, force: true });
await transpileModule(
  path.join(root, 'app/lib/pareto-store/schemas/index.ts'),
  path.join(buildDir, 'schemas/index.js'),
);
await transpileModule(
  path.join(root, 'components/v3/tech/techLocaleCopy.ts'),
  path.join(buildDir, 'techLocaleCopy.js'),
);
await transpileModule(
  path.join(root, 'app/lib/pareto-store/collectible-upgrade-recommendations.ts'),
  path.join(buildDir, 'collectible-upgrade-recommendations.js'),
  [['../../../components/v3/tech/techLocaleCopy', './techLocaleCopy']],
);
await transpileModule(
  path.join(root, 'app/lib/pareto-store/tech-upgrade-recommendations.ts'),
  path.join(buildDir, 'tech-upgrade-recommendations.js'),
);

const require = createRequire(import.meta.url);
const { COLLECTIBLE_ITEM_INDEX } = require(path.join(buildDir, 'schemas/index.js'));
const { buildTechUpgradeRecommendations } = require(path.join(buildDir, 'tech-upgrade-recommendations.js'));

function collectibleIndexByName(name) {
  const index = COLLECTIBLE_ITEM_INDEX.findIndex((item) => item.display_name_en === name);
  assert.notEqual(index, -1, `expected collectible item ${name}`);
  return index;
}

const result = {
  builds: [
    {
      config: {
        loadout: [
          { part: 'energyGuidanceSystem', mode: 'droneMode', app: { chip: 12, overload: 3 } },
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
assert.ok(Array.isArray(collectionRecommendation.reasonDetails), 'expected collectible recommendation details');
assert.ok(collectionRecommendation.reasonDetails.length >= 2, 'expected collectible recommendation to explain its evidence');
assert.match(collectionRecommendation.reasonDetails.join('\n'), /active custom collection set|imported profile/i);
assert.equal(collectionRecommendation.confidence, 'high');
assert.equal(JSON.stringify(recommendations).includes('sio'), false);

const chipRecommendation = recommendations.find((item) => item.id === 'chip-allocation');
assert.ok(chipRecommendation, 'expected a chip recommendation');
assert.ok(Array.isArray(chipRecommendation.reasonDetails), 'expected chip recommendation details');
assert.match(chipRecommendation.reasonDetails.join('\n'), /Top build assigns 12 chips/);
assert.match(chipRecommendation.reasonDetails.join('\n'), /6 chips available/);

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
assert.ok(Array.isArray(koChipRecommendation.reasonDetails), 'expected Korean chip recommendation details');
assert.match(koChipRecommendation.reasonDetails.join('\n'), /최상위 빌드는 .*12칩/);
assert.match(koChipRecommendation.reasonDetails.join('\n'), /6칩 사용 가능/);

const koMemoryEditorRecommendations = buildTechUpgradeRecommendations({
  result,
  locale: 'ko',
  importedCollectibleSnapshot: {
    items: [
      { itemIndex: collectibleIndexByName('Memory Editor'), stars: 2 },
    ],
  },
});
const koMemoryEditorRecommendation = koMemoryEditorRecommendations.find((item) => item.id === 'collection-item');
assert.ok(koMemoryEditorRecommendation, 'expected Memory Editor recommendation in Korean');
assert.match(koMemoryEditorRecommendation.title, /기억 편집기/);
assert.match(koMemoryEditorRecommendation.action, /기억 편집기/);
assert.match(koMemoryEditorRecommendation.beforeAfter.current, /기억 편집기/);
assert.doesNotMatch(JSON.stringify(koMemoryEditorRecommendation), /Memory Editor/);

const catalogOnlyRecommendations = buildTechUpgradeRecommendations({
  result,
  importedCollectibleSnapshot: {
    items: [
      { itemIndex: 76, stars: 1 },
      { itemIndex: 80, stars: 1 },
      { itemIndex: 0, stars: 8 },
    ],
  },
});
const catalogOnlyCollectionRecommendation = catalogOnlyRecommendations.find((item) => item.id === 'collection-item');
assert.ok(catalogOnlyCollectionRecommendation, 'expected source-backed collectible item after catalog-only rows are skipped');
for (const blockedName of ['Libra Starlight', 'Scorpio Starlight', 'Sagittarius Starlight', 'Capricorn Starlight', ...Array.from({ length: 42 }, (_, index) => `Event ${index + 1}`)]) {
  assert.doesNotMatch(catalogOnlyCollectionRecommendation.title, new RegExp(blockedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}
assert.match(catalogOnlyCollectionRecommendation.title, /Atomic Mech/);

console.log('tech_upgrade_recommendations_unit_test: passed');
