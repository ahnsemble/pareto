import type { ReferenceLiveFixtureCase } from '../types';

const ALL_CATEGORIES = ['damage', 'build', 'hero', 'equipment', 'tech', 'pet', 'collectible', 'lme', 'ecosystem'] as const;

export const REFERENCE_LIVE_FIXTURE_CASES = [
  {
    id: 'default',
    label: 'Default LME baseline',
    state: {},
    expected_categories: ALL_CATEGORIES,
  },
  {
    id: 'king',
    label: 'King crit profile',
    state: {
      hero: { selected_hero_id: 'king', selected_hero_level: 120, selected_hero_star: 6 },
      damage: { crit_rate_percent: 340, crit_damage_percent: 859 },
    },
    expected_categories: ALL_CATEGORIES,
  },
  {
    id: 'taloxa',
    label: 'Taloxa laceration profile',
    state: {
      hero: { selected_hero_id: 'taloxa', selected_hero_level: 120, selected_hero_star: 6 },
      conditional_state: { target_lacerated: true },
      damage: { vulnerability_percent: 120 },
    },
    expected_categories: ALL_CATEGORIES,
  },
  {
    id: 'weakened',
    label: 'Weakened target profile',
    state: {
      conditional_state: { target_weakened: true },
      damage: { enemy_type: 'elite', vulnerability_percent: 240 },
    },
    expected_categories: ALL_CATEGORIES,
  },
  {
    id: 'boss',
    label: 'Boss phase profile',
    state: {
      conditional_state: { target_is_boss: true },
      damage: { enemy_type: 'boss', boss_damage_percent: 725 },
      lme: { battle_phase: 'phase_1' },
    },
    expected_categories: ALL_CATEGORIES,
  },
  {
    id: 'ee',
    label: 'Endless Echo buff profile',
    state: {
      mode: 'ee',
      damage: { combat_mode: 'ee', ee_skill_buff_level: 5, ee_tailshot_enabled: true, ee_tailshot_buff_stacks: 8 },
    },
    expected_categories: ALL_CATEGORIES,
  },
  {
    id: 'clucker',
    label: 'Deployed Clucker Xeno pet profile',
    state: {
      pet: { deployed_pet_id: 'crucker', deployed_is_xeno: true, awakening_level: 4, resonance_atk: 5000 },
    },
    expected_categories: ALL_CATEGORIES,
  },
  {
    id: 'tech_twinborn',
    label: 'Twinborn tech chip profile',
    state: {
      tech: {
        selected_attack_parts: ['drone', 'forcefield'],
        resonance_level: 80,
        chips_available: 20,
        twinborn_enabled: true,
        twinborn_main_part_id: 'energyGuidanceSystem',
        twinborn_support_part_id: 'drone',
        drone_chip_percent: 60,
        forcefield_chip_percent: 40,
      },
    },
    expected_categories: ALL_CATEGORIES,
  },
  {
    id: 'collectible',
    label: 'Collectible heart and target profile',
    state: {
      collectible: {
        edition_progress: 10,
        red_star_total: 120,
        yellow_star_total: 260,
        advanced_collector_heart_level: 9,
        aim_indicator_enabled: true,
        target_collectible_id: 'goldfingerPriority',
        equipment_skill_buff_enabled: true,
      },
    },
    expected_categories: ALL_CATEGORIES,
  },
  {
    id: 'equipment_max',
    label: 'Max equipment progression profile',
    state: {
      build: {
        relic_cores_owned: 99,
        chaos_cores_owned: 99,
      },
      equipment: {
        weapon: { item_level: 200, astral_forge_eaf_level: 5, astral_forge_vaf_level: 5, xeno_transmute_level: 13, designs_owned: 999999 },
        armor: { item_level: 200, astral_forge_eaf_level: 5, astral_forge_vaf_level: 5 },
        necklace: { item_level: 200, astral_forge_eaf_level: 5, astral_forge_vaf_level: 5, chaos_fusion_level: 10 },
        belt: { item_level: 200, astral_forge_eaf_level: 5, astral_forge_vaf_level: 5 },
        gloves: { item_level: 200, astral_forge_eaf_level: 5, astral_forge_vaf_level: 5, chaos_fusion_level: 10 },
        boots: { item_level: 200, astral_forge_eaf_level: 5, astral_forge_vaf_level: 5, chaos_fusion_level: 10 },
      },
    },
    expected_categories: ALL_CATEGORIES,
  },
] as const satisfies readonly ReferenceLiveFixtureCase[];
