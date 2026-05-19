// P3 02 — 13 typed selectors + memoization (lines 36-152)
// Subscribe boundary: slice-level useStore(selector) only. Full-store subscribe FORBIDDEN.

import { createSelector } from 'reselect';
import type {
  PlayerState, DamageResult, HeroSchema, WeaponSchema, TechPartSchema,
  CollectibleEditionSchema, LmeTurfMatrix, ConditionalCombatState,
  CalculatorMode, IsolatedAreaPendingSpec, IsolatedXenoTarget,
  SSEquipmentState, XenoModifier, TechSlot,
} from '../types';
import type { ParetoStore } from '../slices';
import { calculateFinalDamage } from '../formula';
import { createPlayerState } from '../playerState';

// ───────────────────────────── 1-11: slice-level selectors ─────────────────────────────
export const selectBase = (state: ParetoStore) => ({
  base_attack: state.base_attack,
  final_attack: state.final_attack,
  designs_owned: state.designs_owned,
});

export const selectEquipment = (state: ParetoStore): SSEquipmentState[] => state.ss_equipment;

export const selectHero = (state: ParetoStore): { selected: HeroSchema; all: HeroSchema[] } => {
  const selected = state.heroes.find((h) => h.id === state.selected_hero_id);
  if (!selected) throw new Error(`[selectors] selected_hero_id '${state.selected_hero_id}' not found in heroes`);
  return { selected, all: state.heroes };
};

export const selectWeapons = (state: ParetoStore): WeaponSchema[] => state.weapons;

export const selectTechParts = (state: ParetoStore): { parts: TechPartSchema[]; equipped: Record<TechSlot, string | null> } => ({
  parts: state.tech_parts,
  equipped: state.equipped_slots,
});

export const selectPets = (state: ParetoStore) => ({
  pets: state.pets,
  deployed: state.deployed_pet_id,
  assists: state.assist_pet_ids,
});

export const selectCollectibles = (state: ParetoStore): CollectibleEditionSchema[] => state.editions;

export const selectLmeTurf = (state: ParetoStore): LmeTurfMatrix => state.turf_matrix;

export const selectMode = (state: ParetoStore): { mode: CalculatorMode; weight: number; view_mode: 'damage_multiplier' | 'raw_damage' } => ({
  mode: state.mode,
  weight: state.mode_specific_weight,
  view_mode: state.view_mode,
});

export const selectConditionalState = (state: ParetoStore): ConditionalCombatState => state.conditional;

export const selectXenoPendingSpecs = (state: ParetoStore): Record<IsolatedXenoTarget, IsolatedAreaPendingSpec> =>
  state.pending_xeno_specs;

// ───────────────────────────── 12: selectXenoModifier (P3 05:113-128) ─────────────────────────────
export const selectXenoModifier = (state: ParetoStore): XenoModifier | null => {
  const pending_xeno_specs = state.pending_xeno_specs;
  for (const targetId of Object.keys(pending_xeno_specs) as IsolatedXenoTarget[]) {
    const spec = pending_xeno_specs[targetId];
    if (spec.xeno_transmute_stage_effects.length > 0 && spec.active_in_formula) {
      return {
        source_id: targetId,
        active_effects: spec.xeno_transmute_stage_effects,
        stat_channel_delta: {},
      };
    }
  }
  return null;
};

// ───────────────────────────── 12: selectPlayerState (P3 02:87-105) ─────────────────────────────
export const selectPlayerState = (state: ParetoStore): PlayerState => {
  const hero = selectHero(state);
  const equipment = selectEquipment(state);
  const equippedTechIds = Object.values(state.equipped_slots).filter((id): id is string => id !== null);
  const deployedPet = state.pets.find((pet) => pet.id === state.deployed_pet_id);
  const selectedEquipment = (slot: 'weapon' | 'armor' | 'necklace' | 'belt' | 'gloves' | 'boots') =>
    equipment.find((item) => item.slot === slot);
  const weapon = selectedEquipment('weapon');
  const armor = selectedEquipment('armor');
  const necklace = selectedEquipment('necklace');
  const belt = selectedEquipment('belt');
  const gloves = selectedEquipment('gloves');
  const boots = selectedEquipment('boots');
  const weaponXenoLevel = weapon && 'xeno_transmute_level' in weapon ? weapon.xeno_transmute_level : 0;
  const necklaceChaosLevel = necklace && 'chaos_fusion_level' in necklace ? necklace.chaos_fusion_level : 0;
  const glovesChaosLevel = gloves && 'chaos_fusion_level' in gloves ? gloves.chaos_fusion_level : 0;
  const bootsChaosLevel = boots && 'chaos_fusion_level' in boots ? boots.chaos_fusion_level : 0;

  return createPlayerState({
    base_attack: state.base_attack,
    selected_hero: hero.selected,
    ss_equipment: equipment,
    weapons: state.weapons,
    tech_parts: state.tech_parts,
    pets: state.pets,
    collectibles: state.editions,
    lme_turf: state.turf_matrix,
    mode: state.mode,
    conditional_state: state.conditional,
    xeno_transmute_modifier: selectXenoModifier(state),
    damage: {
      combat_mode: state.mode,
      enemy_type: state.conditional.target_is_boss ? 'boss' : state.conditional.target_is_elite ? 'elite' : 'normal',
      base_attack: state.base_attack,
      final_attack: state.final_attack ?? 0,
    },
    build: {
      relic_cores_owned: equipment.reduce((sum, item) => sum + item.cores_allocated_eternal, 0),
      chaos_cores_owned: equipment.reduce((sum, item) => sum + item.cores_allocated_void, 0),
    },
    hero: {
      selected_hero_id: state.selected_hero_id,
      global_passive_lv40_enabled: state.global_passive_lv40.length > 0,
      global_passive_lv80_enabled: state.global_passive_lv80.length > 0,
      teamwork_slots_unlocked: hero.selected.teamwork_passives.length,
    },
    equipment: {
      weapon: {
        item_id: weapon?.id ?? 'twinLance',
        astral_forge_eaf_level: weapon?.astral_forge_eaf_level ?? 1,
        astral_forge_vaf_level: weapon?.astral_forge_vaf_level ?? 1,
        xeno_transmute_level: weaponXenoLevel,
        designs_owned: state.designs_owned,
      },
      armor: {
        item_id: armor?.id ?? 'evervoidArmor',
        astral_forge_eaf_level: armor?.astral_forge_eaf_level ?? 1,
        astral_forge_vaf_level: armor?.astral_forge_vaf_level ?? 1,
      },
      necklace: {
        item_id: necklace?.id ?? 'judgmentNecklace',
        astral_forge_eaf_level: necklace?.astral_forge_eaf_level ?? 1,
        astral_forge_vaf_level: necklace?.astral_forge_vaf_level ?? 1,
        chaos_fusion_level: necklaceChaosLevel,
      },
      belt: {
        item_id: belt?.id ?? 'stardustSash',
        astral_forge_eaf_level: belt?.astral_forge_eaf_level ?? 1,
        astral_forge_vaf_level: belt?.astral_forge_vaf_level ?? 1,
      },
      gloves: {
        item_id: gloves?.id ?? 'moonscarBracer',
        astral_forge_eaf_level: gloves?.astral_forge_eaf_level ?? 1,
        astral_forge_vaf_level: gloves?.astral_forge_vaf_level ?? 1,
        chaos_fusion_level: glovesChaosLevel,
      },
      boots: {
        item_id: boots?.id ?? 'glacialWarboots',
        astral_forge_eaf_level: boots?.astral_forge_eaf_level ?? 1,
        astral_forge_vaf_level: boots?.astral_forge_vaf_level ?? 1,
        chaos_fusion_level: bootsChaosLevel,
      },
    },
    tech: {
      selected_attack_parts: equippedTechIds,
      selected_defense_parts: [],
      resonance_level: state.tech_parts.reduce((sum, part) => sum + part.resonance_chip_allocated, 0),
      chips_available: state.tech_parts.reduce((sum, part) => sum + part.resonance_chip_allocated, 0),
      twinborn_enabled: Object.values(state.twinborn_enabled).some(Boolean),
    },
    pet: {
      deployed_pet_id: state.deployed_pet_id ?? '',
      deployed_is_xeno: deployedPet?.is_xeno ?? false,
      assist_pet_1_id: state.assist_pet_ids[0] ?? '',
      assist_pet_2_id: state.assist_pet_ids[1] ?? '',
    },
    collectible: {
      edition_progress: state.editions.length,
      custom_collection_slots: state.custom_collection_slots.length,
      advanced_collector_heart_level: state.advanced_collector_heart_spent,
    },
    lme: {
      turf_nodes_enabled: state.turf_matrix.nodes.filter((node) => node.enabled).length,
    },
    ecosystem: {
      locale: 'en',
    },
  });
};

// ───────────────────────────── 13: selectFinalDamage (P3 03:19-22) ─────────────────────────────
export const selectFinalDamage = createSelector(
  [selectPlayerState],
  (playerState: PlayerState): DamageResult => calculateFinalDamage(playerState)
);
