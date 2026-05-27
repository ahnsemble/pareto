// Shared store composition and startup guard.
// Keep state ownership centralized.

import { create } from 'zustand';
import {
  createBaseSlice, createEquipmentSlice, createHeroSlice, createWeaponSlice,
  createTechSlice, createPetSlice, createCollectibleSlice, createLmeSlice,
  createModeSlice, createConditionalSlice, createXenoPendingSlice,
  type ParetoStore,
} from './slices';
import { TRANSLATION_DICTIONARY } from './i18n';

// ───────────────────────────── UI Component Registry ─────────────────────────────
export const UI_COMPONENT_REGISTRY = [
  'ModeSelectDropdown',
  'OutputPanel',
  'BaseInputsBox',
  'ItemSelectGrids',
  'WeaponUpgradeSlider',
  'TechPartsPanel',
  'SkillChoices',
  'OptimizationTable',
  'HeroSelectModal',
  'CollectiblesAccordion',
  'TalentTurfMatrix',
  'PetSelectRadio',
  'XenoDetailsPanel',
  'ReviveSettingsToggle',
  'ResourceLockButton',
] as const;

// ───────────────────────────── Zustand store ─────────────────────────────
export const useParetoStore = create<ParetoStore>()((...a) => ({
  ...createBaseSlice(...a),
  ...createEquipmentSlice(...a),
  ...createHeroSlice(...a),
  ...createWeaponSlice(...a),
  ...createTechSlice(...a),
  ...createPetSlice(...a),
  ...createCollectibleSlice(...a),
  ...createLmeSlice(...a),
  ...createModeSlice(...a),
  ...createConditionalSlice(...a),
  ...createXenoPendingSlice(...a),
}));

// ───────────────────────────── Startup Checks ─────────────────────────────
export interface CountCheckResult {
  invariant_id: string;
  expected: number;
  actual: number;
  passed: boolean;
}

export function runCountCheckInvariants(state: ParetoStore): CountCheckResult[] {
  return [
    { invariant_id: 'ss_equipment_count', expected: 11, actual: state.ss_equipment.length, passed: state.ss_equipment.length === 11 },
    { invariant_id: 'heroes_count', expected: 23, actual: state.heroes.length, passed: state.heroes.length === 23 },
    { invariant_id: 'weapons_count', expected: 9, actual: state.weapons.length, passed: state.weapons.length === 9 },
    { invariant_id: 'tech_parts_count', expected: 40, actual: state.tech_parts.length, passed: state.tech_parts.length === 40 },
    { invariant_id: 'pets_count', expected: 9, actual: state.pets.length, passed: state.pets.length === 9 },
    { invariant_id: 'collectible_sets_count', expected: 38, actual: state.editions.length, passed: state.editions.length === 38 },
    { invariant_id: 'ui_component_props_count', expected: 15, actual: UI_COMPONENT_REGISTRY.length, passed: UI_COMPONENT_REGISTRY.length === 15 },
    { invariant_id: 'i18n_entries_count', expected: 74, actual: Object.keys(TRANSLATION_DICTIONARY).length, passed: Object.keys(TRANSLATION_DICTIONARY).length === 74 },
  ];
}

// ───────────────────────────── Store Boot ─────────────────────────────
export function bootParetoStore(): ParetoStore {
  const state = useParetoStore.getState();
  const results = runCountCheckInvariants(state);
  const failures = results.filter((r) => !r.passed);

  if (failures.length > 0) {
    throw new Error('Tangtang data model failed to start.');
  }

  return state;
}

// ───────────────────────────── Re-exports ─────────────────────────────
export type { ParetoStore } from './slices';
export * from './selectors';
export * from './i18n';
