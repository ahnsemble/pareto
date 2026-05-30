import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import ts from 'typescript';

const root = process.cwd();
const buildDir = path.join(tmpdir(), 'pareto-tech-upgrade-impact-table-tests');

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
  path.join(root, 'app/lib/pareto-store/tech-upgrade-impact.ts'),
  path.join(buildDir, 'tech-upgrade-impact.js'),
);

const require = createRequire(import.meta.url);
const { buildTechUpgradeImpactRows } = require(path.join(buildDir, 'tech-upgrade-impact.js'));

const rows = buildTechUpgradeImpactRows({
  recommendations: [
    {
      id: 'top-overload',
      priority: 100,
      title: 'Upgrade Energy Guidance System overload',
      action: 'Raise Drone Mode overload from 1 toward 3.',
      reason: 'The fastest build is spending its strongest upgrade pressure there.',
      confidence: 'high',
      beforeAfter: {
        current: 'Drone Mode overload 1',
        recommended: 'Drone Mode overload 3',
      },
    },
    {
      id: 'chip-allocation',
      priority: 80,
      title: 'Allocate chips to Energy Guidance System',
      action: 'Use spare resonance chips on Drone Mode first.',
      reason: 'The top build assigns 12 chips to this slot.',
      confidence: 'medium',
      expectedGainLabel: '6 chips available',
      beforeAfter: {
        current: '6 chips unassigned',
        recommended: 'Drone Mode chip target 12',
      },
    },
  ],
  comparison: {
    status: 'ready',
    importedDamage: 1000,
    tangtangDamage: 1125,
    delta: 125,
    deltaPct: 12.5,
    changed: true,
  },
  locale: 'en',
});

assert.equal(rows.length, 2);
assert.deepEqual(rows[0], {
  id: 'top-overload',
  item: 'Upgrade Energy Guidance System overload',
  current: 'Drone Mode overload 1',
  recommended: 'Drone Mode overload 3',
  baselineDamage: 1000,
  projectedDamage: 1125,
  delta: 125,
  deltaPct: 12.5,
  gainLabel: '+125 / +12.5%',
  basis: 'Top recommendation plan',
  confidence: 'high',
});
assert.equal(rows[1].current, '6 chips unassigned');
assert.equal(rows[1].recommended, 'Drone Mode chip target 12');
assert.equal(rows[1].gainLabel, '+125 / +12.5%');
assert.equal(JSON.stringify(rows).includes('sio'), false);

const lowerRows = buildTechUpgradeImpactRows({
  recommendations: [
    {
      id: 'top-overload',
      priority: 100,
      title: 'Upgrade Energy Guidance System overload',
      action: 'Raise Drone Mode overload from 1 toward 3.',
      reason: 'The fastest build is spending its strongest upgrade pressure there.',
      confidence: 'high',
      beforeAfter: {
        current: 'Drone Mode overload 1',
        recommended: 'Drone Mode overload 3',
      },
    },
  ],
  comparison: {
    status: 'ready',
    importedDamage: 1000,
    tangtangDamage: 900,
    delta: -100,
    deltaPct: -10,
    changed: true,
  },
  locale: 'en',
});

assert.deepEqual(lowerRows, [], 'impact rows must not present negative comparison deltas as expected gains');

assert.deepEqual(
  buildTechUpgradeImpactRows({
    recommendations: rows,
    comparison: { status: 'unavailable', reason: 'missing-baseline' },
    locale: 'en',
  }),
  [],
);

const koRows = buildTechUpgradeImpactRows({
  recommendations: [
    {
      id: 'collection-item',
      priority: 60,
      title: '수집품 강화: Shuttle Capsule',
      action: 'Shuttle Capsule 5성을 먼저 올리세요.',
      reason: '가져온 프로필의 수집품 현황에서 다음으로 점검할 낮은 별 항목입니다.',
      confidence: 'medium',
      beforeAfter: {
        current: 'Shuttle Capsule 5성',
        recommended: 'Shuttle Capsule 우선 강화',
      },
    },
  ],
  comparison: {
    status: 'ready',
    importedDamage: 2000,
    tangtangDamage: 2100,
    delta: 100,
    deltaPct: 5,
    changed: true,
  },
  locale: 'ko',
});

assert.equal(koRows[0].basis, '최상위 추천안 기준');
assert.equal(koRows[0].gainLabel, '+100 / +5%');

console.log('tech_upgrade_impact_table_unit_test: passed');
