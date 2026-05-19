import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';

const root = process.cwd();
const sourceRoot = path.join(root, 'app/lib/pareto-store/playerState');
const buildDir = path.join(root, 'artifacts/v3-sio-parity/player-state-test-build');

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

async function loadPlayerStateModule() {
  await fs.rm(buildDir, { recursive: true, force: true });
  await transpileModule(path.join(root, 'app/lib/pareto-store/schemas/index.ts'), path.join(buildDir, 'schemas/index.js'));
  await transpileModule(path.join(sourceRoot, 'constants.ts'), path.join(buildDir, 'playerState/constants.js'));
  await transpileModule(path.join(sourceRoot, 'defaults.ts'), path.join(buildDir, 'playerState/defaults.js'));
  await transpileModule(path.join(sourceRoot, 'builder.ts'), path.join(buildDir, 'playerState/builder.js'));
  await transpileModule(path.join(sourceRoot, 'sioTranslator.ts'), path.join(buildDir, 'playerState/sioTranslator.js'));
  await transpileModule(path.join(sourceRoot, 'fixtures.ts'), path.join(buildDir, 'playerState/fixtures.js'));
  const require = createRequire(import.meta.url);
  return {
    constants: require(path.join(buildDir, 'playerState/constants.js')),
    defaults: require(path.join(buildDir, 'playerState/defaults.js')),
    builder: require(path.join(buildDir, 'playerState/builder.js')),
    sioTranslator: require(path.join(buildDir, 'playerState/sioTranslator.js')),
    fixtures: require(path.join(buildDir, 'playerState/fixtures.js')),
  };
}

const { constants, defaults, builder, sioTranslator, fixtures } = await loadPlayerStateModule();
const { SIO_INPUT_CATEGORIES, SIO_INPUT_FIELD_SPECS } = constants;
const { DEFAULT_SIO_PLAYER_STATE } = defaults;
const { createPlayerState, countSioInputFields } = builder;
const { createPlayerStateFromSioExport: translateSioExport } = sioTranslator;

await check('sIO category registry covers exactly nine categories', () => {
  assert.deepEqual(SIO_INPUT_CATEGORIES, ['damage', 'build', 'hero', 'equipment', 'tech', 'pet', 'collectible', 'lme', 'ecosystem']);
});
await check('sIO field spec exposes at least fifty fields', () => {
  assert.ok(SIO_INPUT_FIELD_SPECS.length >= 50);
});
await check('sIO field spec preserves Sprint Y exact 95-field contract', () => {
  assert.equal(SIO_INPUT_FIELD_SPECS.length, 95);
});
await check('field counter returns same field total as specs', () => {
  assert.equal(countSioInputFields(DEFAULT_SIO_PLAYER_STATE), SIO_INPUT_FIELD_SPECS.length);
});
await check('default state contains all nine category objects', () => {
  for (const category of SIO_INPUT_CATEGORIES) {
    assert.equal(typeof DEFAULT_SIO_PLAYER_STATE[category], 'object');
  }
});
await check('builder preserves provided top-level base attack', () => {
  assert.equal(createPlayerState({ base_attack: 12345 }).base_attack, 12345);
});
await check('builder deep merges damage combat mode', () => {
  assert.equal(createPlayerState({ damage: { combat_mode: 'ee' } }).damage.combat_mode, 'ee');
});
await check('builder deep merges build relic core counts', () => {
  const state = createPlayerState({ build: { relic_cores_owned: 21, chaos_cores_owned: 8 } });
  assert.equal(state.build.relic_cores_owned, 21);
  assert.equal(state.build.chaos_cores_owned, 8);
});
await check('builder deep merges hero selected hero fields', () => {
  const state = createPlayerState({ hero: { selected_hero_id: 'king', selected_hero_level: 120, selected_hero_star: 6 } });
  assert.equal(state.hero.selected_hero_id, 'king');
  assert.equal(state.hero.selected_hero_level, 120);
  assert.equal(state.hero.selected_hero_star, 6);
});
await check('builder deep merges equipment slot progression', () => {
  const state = createPlayerState({ equipment: { weapon: { astral_forge_eaf_level: 3 } } });
  assert.equal(state.equipment.weapon.astral_forge_eaf_level, 3);
  assert.equal(state.equipment.weapon.astral_forge_vaf_level, 1);
});
await check('builder deep merges tech resonance and twinborn settings', () => {
  const state = createPlayerState({ tech: { resonance_level: 37, twinborn_enabled: true, chips_available: 11 } });
  assert.equal(state.tech.resonance_level, 37);
  assert.equal(state.tech.twinborn_enabled, true);
  assert.equal(state.tech.chips_available, 11);
});
await check('builder deep merges pet deployment state', () => {
  const state = createPlayerState({ pet: { deployed_pet_id: 'crucker', deployed_is_xeno: true, resonance_atk: 5000 } });
  assert.equal(state.pet.deployed_pet_id, 'crucker');
  assert.equal(state.pet.deployed_is_xeno, true);
  assert.equal(state.pet.resonance_atk, 5000);
});
await check('builder deep merges collectible aim indicator state', () => {
  const state = createPlayerState({ collectible: { aim_indicator_enabled: true, advanced_collector_heart_level: 9 } });
  assert.equal(state.collectible.aim_indicator_enabled, true);
  assert.equal(state.collectible.advanced_collector_heart_level, 9);
});
await check('builder deep merges LME medal delta state', () => {
  const state = createPlayerState({ lme: { player_medals: 18, opponent_medals: 27, battle_phase: 'phase_2' } });
  assert.equal(state.lme.player_medals, 18);
  assert.equal(state.lme.opponent_medals, 27);
  assert.equal(state.lme.battle_phase, 'phase_2');
});
await check('builder deep merges ecosystem share state', () => {
  const state = createPlayerState({ ecosystem: { share_code: '4Rgh7d', locale: 'ko' } });
  assert.equal(state.ecosystem.share_code, '4Rgh7d');
  assert.equal(state.ecosystem.locale, 'ko');
});
await check('builder keeps legacy ss_equipment array available', () => {
  assert.ok(Array.isArray(createPlayerState().ss_equipment));
});
await check('builder keeps legacy weapons array available', () => {
  assert.ok(Array.isArray(createPlayerState().weapons));
});
await check('builder keeps legacy tech_parts array available', () => {
  assert.ok(Array.isArray(createPlayerState().tech_parts));
});
await check('builder keeps legacy pets array available', () => {
  assert.ok(Array.isArray(createPlayerState().pets));
});
await check('sIO export translator maps flat live profile aliases into PlayerState', () => {
  const state = translateSioExport({
    calc_mode: 'ee',
    base_atk: 2316228,
    final_atk: 3456789,
    crit_rate: 340,
    crit_damage: 859,
    enemy: 'boss',
    hero: 'king',
    hero_level: 120,
    hero_star: 6,
    relic_cores: 21,
    chaos_cores: 8,
    weapon_eaf: 5,
    weapon_vaf: 4,
    necklace_cf: 10,
    tech_resonance: 80,
    chips_available: 24,
    pet: 'clucker',
    pet_xeno: true,
    pet_resonance_atk: 5000,
    player_medals: 18,
    opponent_medals: 27,
    share_code: '4Rgh7d',
  });

  assert.equal(state.damage.combat_mode, 'ee');
  assert.equal(state.damage.base_attack, 2316228);
  assert.equal(state.damage.final_attack, 3456789);
  assert.equal(state.damage.enemy_type, 'boss');
  assert.equal(state.hero.selected_hero_id, 'king');
  assert.equal(state.hero.selected_hero_level, 120);
  assert.equal(state.equipment.weapon.astral_forge_eaf_level, 5);
  assert.equal(state.equipment.weapon.astral_forge_vaf_level, 4);
  assert.equal(state.equipment.necklace.chaos_fusion_level, 10);
  assert.equal(state.tech.resonance_level, 80);
  assert.equal(state.pet.deployed_pet_id, 'crucker');
  assert.equal(state.pet.deployed_is_xeno, true);
  assert.equal(state.lme.player_medals, 18);
  assert.equal(state.ecosystem.share_code, '4Rgh7d');
  assert.equal(countSioInputFields(state), SIO_INPUT_FIELD_SPECS.length);
});
await check('fixture registry defines ten live parity cases', () => {
  assert.equal(fixtures.SIO_LIVE_FIXTURE_CASES.length, 10);
});
await check('fixture ids match Sprint Y required case set', () => {
  assert.deepEqual(fixtures.SIO_LIVE_FIXTURE_CASES.map((item) => item.id), [
    'default',
    'king',
    'taloxa',
    'weakened',
    'boss',
    'ee',
    'clucker',
    'tech_twinborn',
    'collectible',
    'equipment_max',
  ]);
});

if (failures.length > 0) {
  console.error(`\n${failures.length} failed, ${passed} passed`);
  process.exit(1);
}

console.log(`\n${passed} player state builder checks passed`);
