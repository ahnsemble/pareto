import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';

const root = process.cwd();
const calibrationJsonPath = path.join(root, 'app/lib/pareto-store/formula/calibration/dattebayo_coefficients.json');
const formulaSourcePath = path.join(root, 'app/lib/pareto-store/formula/index.ts');
const calibrationSourcePath = path.join(root, 'app/lib/pareto-store/formula/calibration/dattebayo_coefficients.ts');
const buildDir = path.join(root, 'artifacts/v3-calibration/unit-test-build');

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

function nearlyEqual(actual, expected, tolerance = 1e-9) {
  const scale = Math.max(1, Math.abs(expected));
  assert.ok(Math.abs(actual - expected) <= tolerance * scale, `${actual} != ${expected}`);
}

async function transpile(sourcePath, outPath) {
  const source = await fs.readFile(sourcePath, 'utf8');
  const result = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
      resolveJsonModule: true,
      strict: true,
    },
    fileName: sourcePath,
  });
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, result.outputText);
}

async function loadFormulaModule() {
  await fs.rm(buildDir, { recursive: true, force: true });
  await transpile(calibrationSourcePath, path.join(buildDir, 'calibration/dattebayo_coefficients.js'));
  await transpile(formulaSourcePath, path.join(buildDir, 'index.js'));
  const require = createRequire(import.meta.url);
  return require(path.join(buildDir, 'index.js'));
}

function hero(id) {
  return {
    id,
    display_name_en: id,
    display_name_ko: id,
    tier: 'A',
    role: 'main_dps',
    star_effects: [],
    awakening_effects: [],
    synergy_modifier: [],
    global_passive_lv40: null,
    global_passive_lv80: null,
    teamwork_passives: [],
    source_citations: [],
  };
}

function state(overrides = {}) {
  return {
    base_attack: 1000,
    selected_hero: hero('venato'),
    ss_equipment: [],
    weapons: [],
    tech_parts: [],
    pets: [],
    collectibles: [],
    lme_turf: { matrix_id: 'lme_hex_turf_v3', nodes: [], boss_phase_1_weight: 1, boss_phase_2_weight: 1, battle_phase_weight: 1, expedition_phase_weight: 1 },
    mode: 'generic_calculator',
    conditional_state: {
      hp_missing_ratio: 0,
      target_is_boss: false,
      target_is_elite: false,
      target_lacerated: false,
      target_weakened: false,
      kill_count: 0,
      shield_active: false,
      skill_active_window: false,
    },
    xeno_transmute_modifier: null,
    ...overrides,
  };
}

const calibration = JSON.parse(await fs.readFile(calibrationJsonPath, 'utf8'));

await check('parsed at least 50 Dattebayo cells', () => {
  assert.ok(calibration.cells.length >= 50);
});
await check('calibrated exactly nine formula stages', () => {
  assert.equal(Object.keys(calibration.formula_coefficients).length, 9);
});
await check('metadata keeps source spreadsheet URL', () => {
  assert.equal(calibration.metadata.source_url, 'https://docs.google.com/spreadsheets/d/1UQ00geSXjL3lRvrt5G80flwKyuCt5TZY8V_dF8Bw9D0/copy');
});
await check('stage1 baseline player attack parsed', () => {
  nearlyEqual(calibration.formula_coefficients.stage1_base_normalization.baseline_player_atk, 2316228);
});
await check('stage1 flat attack bonus parsed from Multipliers_Output', () => {
  nearlyEqual(calibration.formula_coefficients.stage1_base_normalization.flat_attack_bonus, 1427218.1691568);
});
await check('stage2 SS active slot bonus comes from ATK% row', () => {
  nearlyEqual(calibration.formula_coefficients.stage2_equipment_weapon.ss_active_slot_bonus, 0.4);
});
await check('stage2 SS AF step comes from ATK% AF rows', () => {
  nearlyEqual(calibration.formula_coefficients.stage2_equipment_weapon.ss_af_step_bonus, 0.1);
});
await check('stage3 tech base gain is sourced', () => {
  nearlyEqual(calibration.formula_coefficients.stage3_tech_parts.tech_base_gain, 0.05);
});
await check('stage4 deployed pet gain is sourced from Xeno resonance buff', () => {
  nearlyEqual(calibration.formula_coefficients.stage4_pet_resonance.deployed_pet_gain, 0.600625);
});
await check('stage5 collectible unlock gain uses Dattebayo set rows', () => {
  nearlyEqual(calibration.formula_coefficients.stage5_collectibles.collectible_unlock_gain, 0.05);
});
await check('stage6 LME turf gain parsed', () => {
  nearlyEqual(calibration.formula_coefficients.stage6_lme_turf.turf2_gain, 1.6);
});
await check('stage7 King crit factor follows Dattebayo crit chain', () => {
  nearlyEqual(calibration.formula_coefficients.stage7_conditionals.king_crit_expected_factor, 16.73);
});
await check('stage7 Taloxa laceration factor follows Dattebayo unique multiplier', () => {
  nearlyEqual(calibration.formula_coefficients.stage7_conditionals.taloxa_laceration_factor, 3.64);
});
await check('stage8 Xeno Clucker factor parsed', () => {
  nearlyEqual(calibration.formula_coefficients.stage8_xeno_resonance.xeno_clucker_resonance_factor, 1.600625);
});
await check('stage9 Dattebayo cached multiplier output parsed', () => {
  nearlyEqual(calibration.formula_coefficients.stage9_finalization.dattebayo_multipliers_output, 606858439306, 1e-12);
});
await check('stage9 Dattebayo cached damage output parsed', () => {
  nearlyEqual(calibration.formula_coefficients.stage9_finalization.dattebayo_damage_output, 3.94228e16, 1e-12);
});

const formula = await loadFormulaModule();

await check('normalizeBaseAttack applies Dattebayo flat attack bonus', () => {
  nearlyEqual(formula.normalizeBaseAttack(1000).current_damage, 1428218.1691568);
});
await check('normalizeBaseAttack clamps negative base before bonus', () => {
  nearlyEqual(formula.normalizeBaseAttack(-100).current_damage, 1427218.1691568);
});
await check('single SS item applies active plus AF gain', () => {
  const acc = formula.applyEquipmentModifiers(formula.normalizeBaseAttack(1000), [{ slot: 'weapon', astral_forge_eaf_level: 1, astral_forge_vaf_level: 1 }], []);
  nearlyEqual(acc.current_multiplier, 1.6);
});
await check('weapon AF gain uses Dattebayo AF step', () => {
  const acc = formula.applyEquipmentModifiers(formula.normalizeBaseAttack(1000), [], [{ id: 'x', astral_forge_eaf_level: 2, astral_forge_vaf_level: 0 }]);
  nearlyEqual(acc.current_multiplier, 1.2);
});
await check('equipped tech part applies sourced base gain', () => {
  const acc = formula.applyTechPartModifiers(formula.normalizeBaseAttack(1000), [{ id: 'drone', equipped_slot: 'attack_1', is_twinborn: false, resonance_chip_allocated: 0 }]);
  nearlyEqual(acc.current_multiplier, 1.05);
});
await check('twinborn tech part adds sourced twinborn gain', () => {
  const acc = formula.applyTechPartModifiers(formula.normalizeBaseAttack(1000), [{ id: 'quantum_robot', equipped_slot: null, is_twinborn: true, resonance_chip_allocated: 0 }]);
  nearlyEqual(acc.current_multiplier, 1.2);
});
await check('resonance chips add linear chip gain', () => {
  const acc = formula.applyTechPartModifiers(formula.normalizeBaseAttack(1000), [{ id: 'drone', equipped_slot: null, is_twinborn: false, resonance_chip_allocated: 10 }]);
  nearlyEqual(acc.current_multiplier, 1.005);
});
await check('deployed pet uses sourced xeno resonance gain', () => {
  const acc = formula.applyPetResonanceModifiers(formula.normalizeBaseAttack(1000), [{ id: 'clucker', slot: 'deployed', resonance_atk: 0 }]);
  nearlyEqual(acc.current_multiplier, 1.600625);
});
await check('assist pet applies sourced assist gain', () => {
  const acc = formula.applyPetResonanceModifiers(formula.normalizeBaseAttack(1000), [{ id: 'capybara', slot: 'assist_1', resonance_atk: 0 }]);
  nearlyEqual(acc.current_multiplier, 1.05);
});
await check('collectible unlock applies sourced set gain', () => {
  const acc = formula.applyCollectibleModifiers(formula.normalizeBaseAttack(1000), [{ unlocks_custom_collection_slot: true }]);
  nearlyEqual(acc.current_multiplier, 1.05);
});
await check('LME turf enabled node applies sourced turf gain', () => {
  const acc = formula.applyLmeTurfModifiers(formula.normalizeBaseAttack(1000), { nodes: [{ enabled: true }] }, 'lme');
  nearlyEqual(acc.current_multiplier, 2.6);
});
await check('King conditional applies Dattebayo crit expectation', () => {
  const acc = formula.applyConditionalEffectModules(formula.normalizeBaseAttack(1000), state().conditional_state, hero('king'));
  nearlyEqual(acc.current_multiplier, 16.73);
});
await check('Taloxa laceration applies Dattebayo unique multiplier', () => {
  const s = state({ conditional_state: { ...state().conditional_state, target_lacerated: true } });
  const acc = formula.applyConditionalEffectModules(formula.normalizeBaseAttack(1000), s.conditional_state, hero('taloxa'));
  nearlyEqual(acc.current_multiplier, 3.64);
});
await check('weakened target applies Dattebayo weakened damage factor', () => {
  const s = state({ conditional_state: { ...state().conditional_state, target_weakened: true } });
  const acc = formula.applyConditionalEffectModules(formula.normalizeBaseAttack(1000), s.conditional_state, hero('venato'));
  nearlyEqual(acc.current_multiplier, 7.04);
});
await check('boss phase conditional uses sourced LME boss factor', () => {
  const s = state({ conditional_state: { ...state().conditional_state, target_is_boss: true } });
  const acc = formula.applyConditionalEffectModules(formula.normalizeBaseAttack(1000), s.conditional_state, hero('venato'));
  nearlyEqual(acc.current_multiplier, 2.6);
});
await check('Xeno modifier applies provided Dattebayo delta', () => {
  const acc = formula.applyXenoModifierOrZeroEffect(formula.normalizeBaseAttack(1000), {
    source_id: 'twin_lance_xeno_effect_table',
    active_effects: [{ stat_channel: 'xenoDamage' }],
    stat_channel_delta: { xenoDamage: 0.600625 },
  });
  nearlyEqual(acc.current_multiplier, 1.600625);
});
await check('full calculation returns positive calibrated damage', () => {
  assert.ok(formula.calculateFinalDamage(state()).final_damage > 1427218);
});

if (failures.length > 0) {
  console.error(`\n${failures.length} failed, ${passed} passed`);
  process.exit(1);
}

console.log(`\n${passed} unit checks passed`);
