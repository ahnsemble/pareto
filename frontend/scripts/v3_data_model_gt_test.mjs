import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';

const root = process.cwd();
const buildDir = path.join(root, 'artifacts/s46-wr-main-v3-data-model/data-model-test-build');

let passed = 0;
const failures = [];

async function check(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`PASS ${passed}: ${name}`);
  } catch (error) {
    failures.push({ name, error });
    console.error(`FAIL: ${name}`);
    console.error(error?.stack ?? error);
  }
}

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

async function loadSchemas() {
  await fs.rm(buildDir, { recursive: true, force: true });
  await transpileModule(path.join(root, 'app/lib/pareto-store/schemas/index.ts'), path.join(buildDir, 'schemas/index.js'));
  const require = createRequire(import.meta.url);
  return require(path.join(buildDir, 'schemas/index.js'));
}

const schemas = await loadSchemas();
const ids = (items) => items.map((item) => item.id);
const names = (items) => items.map((item) => item.display_name_en);

await check('Pet registry mirrors the 9 sIO pets and i18n keys', () => {
  assert.deepEqual(ids(schemas.PET_SCHEMA_INDEX), [
    'rex',
    'croaky',
    'gary',
    'capy',
    'crucker',
    'puffo',
    'blizzblast',
    'nutjob',
    'gourmeow',
  ]);
  assert.deepEqual(names(schemas.PET_SCHEMA_INDEX), [
    'Rex',
    'Croaky',
    'Gary',
    'Capy',
    'Clucker',
    'Puffo',
    'Blizzblast',
    'Nutjob',
    'Gourmeow',
  ]);
});

await check('Hero registry mirrors the 15 sIO default and collaboration heroes', () => {
  assert.deepEqual(ids(schemas.HERO_SCHEMA_INDEX), [
    'common',
    'king',
    'masterYang',
    'metalia',
    'joey',
    'taloxa',
    'venato',
    'worm',
    'april',
    'splinter',
    'raphael',
    'donatello',
    'tsukuyomi',
    'wesson',
    'catnips',
  ]);
  const worm = schemas.HERO_SCHEMA_INDEX.find((hero) => hero.id === 'worm');
  assert.equal(worm.note, 'passives activate only when fewer than 3 monsters are on the map');
});

await check('SS equipment registry mirrors 11 sIO items and six occupied slots', () => {
  assert.deepEqual(ids(schemas.SS_EQUIPMENT_SCHEMA_INDEX), [
    'twinLance',
    'eternalSuit',
    'evervoidArmor',
    'judgmentNecklace',
    'voidwakerEmblem',
    'twistingBelt',
    'stardustSash',
    'moonscarBracer',
    'voidwakerHandguards',
    'glacialWarboots',
    'voidwakerTreads',
  ]);
  assert.equal(new Set(schemas.SS_EQUIPMENT_SCHEMA_INDEX.map((item) => item.slot)).size, 6);
});

await check('Tech model splits twinborn, active skill, mode variant, and modifier matrix dimensions', () => {
  assert.equal(schemas.TECH_TWINBORN_PARTS.length, 10);
  assert.equal(schemas.TECH_ACTIVE_SKILLS.length, 18);
  assert.equal(schemas.TECH_MODE_VARIANTS.length, 12);
  assert.equal(Object.keys(schemas.TECH_MODIFIER_MATRIX).length, 4);
  assert.equal(schemas.TECH_MODIFIER_MATRIX.exoBracer.ssWeapon, -0.025);
  assert.equal(schemas.TECH_MODIFIER_MATRIX.exoBracer.lightningMode, -0.0177);
});

await check('Mount and EvoTree registries mirror missing sIO categories', () => {
  assert.deepEqual(ids(schemas.MOUNT_SCHEMA_INDEX), ['doomsteed', 'electricScooter', 'techHoverboard']);
  assert.deepEqual(ids(schemas.EVOTREE_SKILL_SCHEMA_INDEX), ['exposeWeakness', 'vivaLaMateria', 'watchmaker', 'overreaction']);
});

await check('Collectible model exposes item index, 38 sets, and 42 event slots', () => {
  assert.ok(schemas.COLLECTIBLE_ITEM_INDEX.length >= 110);
  assert.equal(schemas.COLLECTIBLE_SET_INDEX.filter((set) => set.collectible_count === 4).length, 21);
  assert.equal(schemas.COLLECTIBLE_SET_INDEX.filter((set) => set.collectible_count === 3).length, 17);
  assert.equal(schemas.COLLECTIBLE_SET_INDEX.length, 38);
  assert.equal(schemas.COLLECTIBLE_EVENT_SLOTS.length, 42);
});

await check('Stats fixed-order array mirrors 71 keys with uptime map', () => {
  assert.equal(schemas.SIO_STATS_FIXED_ORDER.length, 71);
  assert.deepEqual(schemas.SIO_UPTIME_STAT_KEYS, [
    'vulnerability',
    'chilledUptime',
    'weakenedUptime',
    'poisonedUptime',
    'lacerationUptime',
    'divineFireUptime',
  ]);
});

await check('Xeno trigger matrix uses slot and level triggers, not forge shorthand', () => {
  assert.deepEqual(Object.keys(schemas.XENO_TRIGGER_MATRIX), ['weapon', 'armor', 'necklace']);
  for (const slot of Object.keys(schemas.XENO_TRIGGER_MATRIX)) {
    assert.deepEqual(schemas.XENO_TRIGGER_MATRIX[slot].map((row) => row.level), [1, 6, 10]);
  }
});

await check('Optimizer schemas expose items, techs, and heroes contracts', () => {
  assert.deepEqual(Object.keys(schemas.OPTIMIZER_SCHEMAS), ['items', 'techs', 'heroes']);
  assert.deepEqual(schemas.OPTIMIZER_SCHEMAS.techs.strategy, ['optimize', 'legend', 'eternal', 'selector', 'downgrade']);
  assert.deepEqual(schemas.OPTIMIZER_SCHEMAS.techs.speedMode, ['fast', 'normal', 'precise', 'precise+', 'full']);
  assert.deepEqual(schemas.OPTIMIZER_SCHEMAS.techs.skillsMapState, ['disabled', 'enabled', 'preferred']);
});

await check('Forbidden legacy labels are absent from schema payloads', () => {
  const payload = JSON.stringify(schemas);
  const blocked = [
    'Muri' + 'ca',
    'Shell' + 'y',
    'SS ' + 'Belt',
    'SS ' + 'Gloves',
    'SS ' + 'Boots',
    'Star' + 'forged',
    'Meta' + 'llia',
    'Sponge' + 'Bob',
    'Squid' + 'ward',
    'Yel' + 'ena',
    'King ' + 'Blizzblast',
  ];
  for (const label of blocked) {
    assert.equal(payload.includes(label), false, label);
  }
});

if (failures.length > 0) {
  console.error(`\n${failures.length} failed, ${passed} passed`);
  process.exit(1);
}

console.log(`\n${passed} V3 data model GT checks passed`);
