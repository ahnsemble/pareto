// P3 01 — 11 Zustand slices (lines 31-275)
// Cross-slice direct import blocked; all cross-slice coupling via T2 selectors.

import type { StateCreator } from 'zustand';
import type {
  SSEquipmentState, SSGradeSlot, SSGradeEquipmentBase, AstralForgeLevel,
  HeroSchema, HeroId, GlobalPassive,
  WeaponSchema, TechPartSchema, TechSlot, PetSchema,
  CollectibleEditionSchema, LmeTurfMatrix, LmePhase,
  CalculatorMode, ConditionalCombatState,
  IsolatedAreaPendingSpec, IsolatedXenoTarget, RuntimeXenoEffectInput, XenoStageEffect,
} from '../types';
import type { TechMode, TechPartConfig, TechPartConfigMap, TwinbornCategory } from '../tech/types';
import { cloneDefaultTechConfigs } from '../tech/defaults';
import {
  HERO_SCHEMA_INDEX, WEAPON_SCHEMA_INDEX, TECH_PART_SCHEMA_INDEX,
  PET_SCHEMA_INDEX, COLLECTIBLE_EDITION_SCHEMA_INDEX,
  LME_TURF_MATRIX_SCHEMA, ISOLATED_XENO_PENDING_SPECS, INITIAL_SS_EQUIPMENT,
} from '../schemas';

// ───────────────────────────── 1. baseSlice (P3 01:33-48) ─────────────────────────────
export interface BaseSliceState {
  base_attack: number;
  final_attack: number | null;
  designs_owned: number;
}
export interface BaseSliceActions {
  setBaseAttack: (v: number) => void;
  setDesignsOwned: (v: number) => void;
}
const INITIAL_BASE: BaseSliceState = {
  base_attack: 1000,
  final_attack: null,
  designs_owned: 0,
};
export const createBaseSlice: StateCreator<BaseSliceState & BaseSliceActions, [], [], BaseSliceState & BaseSliceActions> = (set) => ({
  ...INITIAL_BASE,
  setBaseAttack: (v) => set({ base_attack: Math.max(0, v) }),
  setDesignsOwned: (v) => set({ designs_owned: Math.max(0, v) }),
});

// ───────────────────────────── 2. equipmentSlice (P3 01:52-68) ─────────────────────────────
export interface EquipmentSliceState {
  ss_equipment: SSEquipmentState[];
  selected_slot_ids: Record<SSGradeSlot, string>;
}
export interface EquipmentSliceActions {
  setSSEquipment: (slot: SSGradeSlot, update: Partial<SSGradeEquipmentBase>) => void;
  setAstralForgeLevel: (slot: SSGradeSlot, branch: 'eaf' | 'vaf', level: AstralForgeLevel) => void;
  setCoresAllocation: (slot: SSGradeSlot, eternal: number, void_cores: number) => void;
  setChaosFusionLevel: (slot: SSGradeSlot, level: number) => void;
}
const INITIAL_EQUIPMENT: EquipmentSliceState = {
  ss_equipment: INITIAL_SS_EQUIPMENT,
  selected_slot_ids: {
    weapon: 'twinLance',
    armor: 'evervoidArmor',
    necklace: 'judgmentNecklace',
    belt: 'stardustSash',
    gloves: 'moonscarBracer',
    boots: 'glacialWarboots',
  },
};
export const createEquipmentSlice: StateCreator<EquipmentSliceState & EquipmentSliceActions, [], [], EquipmentSliceState & EquipmentSliceActions> = (set) => ({
  ...INITIAL_EQUIPMENT,
  setSSEquipment: (slot, update) => set((s) => ({
    ss_equipment: s.ss_equipment.map((eq) =>
      eq.slot === slot ? ({ ...eq, ...update } as SSEquipmentState) : eq
    ),
  })),
  setAstralForgeLevel: (slot, branch, level) => set((s) => ({
    ss_equipment: s.ss_equipment.map((eq) =>
      eq.slot === slot
        ? ({ ...eq, [branch === 'eaf' ? 'astral_forge_eaf_level' : 'astral_forge_vaf_level']: level } as SSEquipmentState)
        : eq
    ),
  })),
  setCoresAllocation: (slot, eternal, void_cores) => set((s) => ({
    ss_equipment: s.ss_equipment.map((eq) =>
      eq.slot === slot
        ? ({ ...eq, cores_allocated_eternal: Math.max(0, eternal), cores_allocated_void: Math.max(0, void_cores) } as SSEquipmentState)
        : eq
    ),
  })),
  setChaosFusionLevel: (slot, level) => set((s) => ({
    ss_equipment: s.ss_equipment.map((eq) =>
      eq.slot === slot && 'chaos_fusion_level' in eq
        ? ({ ...eq, chaos_fusion_level: Math.max(0, level) } as SSEquipmentState)
        : eq
    ),
  })),
});

// ───────────────────────────── 3. heroSlice (P3 01:73-87) ─────────────────────────────
export interface HeroSliceState {
  heroes: HeroSchema[];
  selected_hero_id: HeroId;
  global_passive_lv40: GlobalPassive[];
  global_passive_lv80: GlobalPassive[];
}
export interface HeroSliceActions {
  selectHero: (id: HeroId) => void;
  setStarLevel: (heroId: HeroId, star: number) => void;
  setAwakeningLevel: (heroId: HeroId, awakening: number) => void;
}
const INITIAL_HERO: HeroSliceState = {
  heroes: HERO_SCHEMA_INDEX,
  selected_hero_id: 'venato',
  global_passive_lv40: HERO_SCHEMA_INDEX.flatMap((h) => h.global_passive_lv40 ? [h.global_passive_lv40] : []),
  global_passive_lv80: HERO_SCHEMA_INDEX.flatMap((h) => h.global_passive_lv80 ? [h.global_passive_lv80] : []),
};
export const createHeroSlice: StateCreator<HeroSliceState & HeroSliceActions, [], [], HeroSliceState & HeroSliceActions> = (set) => ({
  ...INITIAL_HERO,
  selectHero: (id) => set({ selected_hero_id: id }),
  setStarLevel: (_heroId, _star) => set((s) => s), // hook for future star-level state
  setAwakeningLevel: (_heroId, _awakening) => set((s) => s),
});

// ───────────────────────────── 4. weaponSlice (P3 01:91-103) ─────────────────────────────
export interface WeaponSliceState {
  weapons: WeaponSchema[];
  selected_weapon_id: string;
}
export interface WeaponSliceActions {
  selectWeapon: (id: string) => void;
  setWeaponAstralForge: (id: string, branch: 'eaf' | 'vaf', level: AstralForgeLevel) => void;
}
const INITIAL_WEAPON: WeaponSliceState = {
  weapons: WEAPON_SCHEMA_INDEX,
  selected_weapon_id: 'twinLance',
};
export const createWeaponSlice: StateCreator<WeaponSliceState & WeaponSliceActions, [], [], WeaponSliceState & WeaponSliceActions> = (set) => ({
  ...INITIAL_WEAPON,
  selectWeapon: (id) => set({ selected_weapon_id: id }),
  setWeaponAstralForge: (id, branch, level) => set((s) => ({
    weapons: s.weapons.map((w) =>
      w.id === id
        ? { ...w, [branch === 'eaf' ? 'astral_forge_eaf_level' : 'astral_forge_vaf_level']: level }
        : w
    ),
  })),
});

// ───────────────────────────── 5. techSlice (P3 01:107-122) ─────────────────────────────
export interface TechSliceState {
  tech_parts: TechPartSchema[];
  tech_configs: TechPartConfigMap;
  equipped_slots: Record<TechSlot, string | null>;
  twinborn_enabled: Record<string, boolean>;
}
export interface TechSliceActions {
  equipTech: (slot: TechSlot, techId: string) => void;
  unequipTech: (slot: TechSlot) => void;
  toggleTwinborn: (techId: string, enabled: boolean) => void;
  setResonanceChip: (techId: string, allocated: number) => void;
  setTechPartConfig: (id: TwinbornCategory, config: Partial<TechPartConfig>) => void;
  setTechPartEquipped: (id: TwinbornCategory, equipped: boolean) => void;
  setTechPartMode: (id: TwinbornCategory, mode: TechMode | null) => void;
  setTechPartResonance: (id: TwinbornCategory, resonance: number) => void;
  setTechPartOverload: (id: TwinbornCategory, overload: number) => void;
  setTechPartSupportParts: (id: TwinbornCategory, supportParts: boolean) => void;
  setTechPartTwinbornLevel: (id: TwinbornCategory, twinbornLevel: TechPartConfig['twinbornLevel']) => void;
}
const INITIAL_TECH: TechSliceState = {
  tech_parts: TECH_PART_SCHEMA_INDEX,
  tech_configs: cloneDefaultTechConfigs(),
  equipped_slots: {
    attack_1: null, attack_2: null, attack_3: null,
    defense_1: null, defense_2: null, defense_3: null,
  },
  twinborn_enabled: {},
};
export const createTechSlice: StateCreator<TechSliceState & TechSliceActions, [], [], TechSliceState & TechSliceActions> = (set) => ({
  ...INITIAL_TECH,
  equipTech: (slot, techId) => set((s) => ({ equipped_slots: { ...s.equipped_slots, [slot]: techId } })),
  unequipTech: (slot) => set((s) => ({ equipped_slots: { ...s.equipped_slots, [slot]: null } })),
  toggleTwinborn: (techId, enabled) => set((s) => ({ twinborn_enabled: { ...s.twinborn_enabled, [techId]: enabled } })),
  setResonanceChip: (techId, allocated) => set((s) => ({
    tech_parts: s.tech_parts.map((t) => t.id === techId ? { ...t, resonance_chip_allocated: Math.max(0, allocated) } : t),
  })),
  setTechPartConfig: (id, config) => set((s) => ({
    tech_configs: {
      ...s.tech_configs,
      [id]: {
        ...s.tech_configs[id],
        ...config,
        resonance: config.resonance === undefined ? s.tech_configs[id].resonance : Math.max(0, Math.trunc(config.resonance)),
        overload: config.overload === undefined ? s.tech_configs[id].overload : Math.max(0, Math.trunc(config.overload)),
      },
    },
  })),
  setTechPartEquipped: (id, equipped) => set((s) => ({
    tech_configs: { ...s.tech_configs, [id]: { ...s.tech_configs[id], equipped } },
  })),
  setTechPartMode: (id, mode) => set((s) => ({
    tech_configs: { ...s.tech_configs, [id]: { ...s.tech_configs[id], mode } },
  })),
  setTechPartResonance: (id, resonance) => set((s) => ({
    tech_configs: { ...s.tech_configs, [id]: { ...s.tech_configs[id], resonance: Math.max(0, Math.trunc(resonance)) } },
  })),
  setTechPartOverload: (id, overload) => set((s) => ({
    tech_configs: { ...s.tech_configs, [id]: { ...s.tech_configs[id], overload: Math.max(0, Math.trunc(overload)) } },
  })),
  setTechPartSupportParts: (id, supportParts) => set((s) => ({
    tech_configs: { ...s.tech_configs, [id]: { ...s.tech_configs[id], supportParts } },
  })),
  setTechPartTwinbornLevel: (id, twinbornLevel) => set((s) => ({
    tech_configs: { ...s.tech_configs, [id]: { ...s.tech_configs[id], twinbornLevel } },
  })),
});

// ───────────────────────────── 6. petSlice (P3 01:126-141) ─────────────────────────────
export interface PetSliceState {
  pets: PetSchema[];
  deployed_pet_id: string | null;
  assist_pet_ids: [string | null, string | null];
}
export interface PetSliceActions {
  deployPet: (id: string) => void;
  setAssistPet: (slot: 0 | 1, id: string | null) => void;
  setResonanceChance: (petId: string, chance: number) => void;
  setResonanceAtk: (petId: string, atk: number) => void;
}
const INITIAL_PET: PetSliceState = {
  pets: PET_SCHEMA_INDEX,
  deployed_pet_id: null,
  assist_pet_ids: [null, null],
};
export const createPetSlice: StateCreator<PetSliceState & PetSliceActions, [], [], PetSliceState & PetSliceActions> = (set) => ({
  ...INITIAL_PET,
  deployPet: (id) => set({ deployed_pet_id: id }),
  setAssistPet: (slot, id) => set((s) => {
    const next: [string | null, string | null] = [...s.assist_pet_ids];
    next[slot] = id;
    return { assist_pet_ids: next };
  }),
  setResonanceChance: (petId, chance) => set((s) => ({
    pets: s.pets.map((p) => p.id === petId ? { ...p, resonance_chance: Math.max(0, chance) } : p),
  })),
  setResonanceAtk: (petId, atk) => set((s) => ({
    pets: s.pets.map((p) => p.id === petId ? { ...p, resonance_atk: Math.max(0, atk) } : p),
  })),
});

// ───────────────────────────── 7. collectibleSlice (P3 01:145-159) ─────────────────────────────
export interface CollectibleSliceState {
  editions: CollectibleEditionSchema[];
  custom_collection_slots: string[];
  advanced_collector_heart_spent: number;
}
export interface CollectibleSliceActions {
  setCollectibleSetStars: (setId: string, goldStars: number, redStars: number) => void;
  addCustomCollectionSlot: (slotId: string) => void;
  spendAdvancedHeart: (amount: number) => void;
}
const INITIAL_COLLECTIBLE: CollectibleSliceState = {
  editions: COLLECTIBLE_EDITION_SCHEMA_INDEX,
  custom_collection_slots: [],
  advanced_collector_heart_spent: 0,
};
export const createCollectibleSlice: StateCreator<CollectibleSliceState & CollectibleSliceActions, [], [], CollectibleSliceState & CollectibleSliceActions> = (set) => ({
  ...INITIAL_COLLECTIBLE,
  setCollectibleSetStars: (setId, goldStars, redStars) => set((s) => ({
    editions: s.editions.map((item) =>
      item.id === setId ? { ...item, gold_stars: Math.max(0, goldStars), red_stars: Math.max(0, redStars) } : item
    ),
  })),
  addCustomCollectionSlot: (slotId) => set((s) => ({ custom_collection_slots: [...s.custom_collection_slots, slotId] })),
  spendAdvancedHeart: (amount) => set((s) => ({ advanced_collector_heart_spent: s.advanced_collector_heart_spent + amount })),
});

// ───────────────────────────── 8. lmeSlice (P3 01:163-178) ─────────────────────────────
export interface LmeSliceState {
  turf_matrix: LmeTurfMatrix;
  boss_phase_1_weight: number;
  boss_phase_2_weight: number;
  battle_phase_weight: number;
  expedition_phase_weight: number;
}
export interface LmeSliceActions {
  toggleNode: (nodeId: string, enabled: boolean) => void;
  setPhaseWeight: (phase: LmePhase, weight: number) => void;
}
const INITIAL_LME: LmeSliceState = {
  turf_matrix: LME_TURF_MATRIX_SCHEMA,
  boss_phase_1_weight: 1.0,
  boss_phase_2_weight: 1.0,
  battle_phase_weight: 1.0,
  expedition_phase_weight: 1.0,
};
export const createLmeSlice: StateCreator<LmeSliceState & LmeSliceActions, [], [], LmeSliceState & LmeSliceActions> = (set) => ({
  ...INITIAL_LME,
  toggleNode: (nodeId, enabled) => set((s) => ({
    turf_matrix: {
      ...s.turf_matrix,
      nodes: s.turf_matrix.nodes.map((n) => n.node_id === nodeId ? { ...n, enabled } : n),
    },
  })),
  setPhaseWeight: (phase, weight) => set(() => {
    const safe = Math.max(0, weight);
    switch (phase) {
      case 'boss_phase_1': return { boss_phase_1_weight: safe };
      case 'boss_phase_2': return { boss_phase_2_weight: safe };
      case 'battle_phase': return { battle_phase_weight: safe };
      case 'expedition_phase': return { expedition_phase_weight: safe };
    }
  }),
});

// ───────────────────────────── 9. modeSlice (P3 01:182-193) ─────────────────────────────
export interface ModeSliceState {
  mode: CalculatorMode;
  mode_specific_weight: number;
  view_mode: 'damage_multiplier' | 'raw_damage';
}
export interface ModeSliceActions {
  setMode: (mode: CalculatorMode) => void;
  setViewMode: (vm: 'damage_multiplier' | 'raw_damage') => void;
}
const INITIAL_MODE: ModeSliceState = {
  mode: 'lme',
  mode_specific_weight: 1.0,
  view_mode: 'damage_multiplier',
};
export const createModeSlice: StateCreator<ModeSliceState & ModeSliceActions, [], [], ModeSliceState & ModeSliceActions> = (set) => ({
  ...INITIAL_MODE,
  setMode: (mode) => set({ mode }),
  setViewMode: (view_mode) => set({ view_mode }),
});

// ───────────────────────────── 10. conditionalSlice (P3 01:197-222) ─────────────────────────────
export interface ConditionalSliceState {
  conditional: ConditionalCombatState;
}
export interface ConditionalSliceActions {
  setHpMissingRatio: (ratio: number) => void;
  setTargetIsBoss: (v: boolean) => void;
  setTargetIsElite: (v: boolean) => void;
  setTargetLacerated: (v: boolean) => void;
  setTargetWeakened: (v: boolean) => void;
  setKillCount: (count: number) => void;
  setShieldActive: (v: boolean) => void;
  setSkillActiveWindow: (v: boolean) => void;
}
const INITIAL_CONDITIONAL: ConditionalCombatState = {
  hp_missing_ratio: 0,
  target_is_boss: false,
  target_is_elite: false,
  target_lacerated: false,
  target_weakened: false,
  kill_count: 0,
  shield_active: false,
  skill_active_window: false,
};
export const createConditionalSlice: StateCreator<ConditionalSliceState & ConditionalSliceActions, [], [], ConditionalSliceState & ConditionalSliceActions> = (set) => ({
  conditional: INITIAL_CONDITIONAL,
  setHpMissingRatio: (ratio) => set((s) => ({ conditional: { ...s.conditional, hp_missing_ratio: Math.max(0, Math.min(1, ratio)) } })),
  setTargetIsBoss: (v) => set((s) => ({ conditional: { ...s.conditional, target_is_boss: v } })),
  setTargetIsElite: (v) => set((s) => ({ conditional: { ...s.conditional, target_is_elite: v } })),
  setTargetLacerated: (v) => set((s) => ({ conditional: { ...s.conditional, target_lacerated: v } })),
  setTargetWeakened: (v) => set((s) => ({ conditional: { ...s.conditional, target_weakened: v } })),
  setKillCount: (count) => set((s) => ({ conditional: { ...s.conditional, kill_count: Math.max(0, count) } })),
  setShieldActive: (v) => set((s) => ({ conditional: { ...s.conditional, shield_active: v } })),
  setSkillActiveWindow: (v) => set((s) => ({ conditional: { ...s.conditional, skill_active_window: v } })),
});

// ───────────────────────────── 11. xenoPendingSlice (P3 05:14-128) ─────────────────────────────
export interface XenoPendingSliceState {
  pending_xeno_specs: Record<IsolatedXenoTarget, IsolatedAreaPendingSpec>;
  runtime_inputs: RuntimeXenoEffectInput[];
}
export interface XenoPendingSliceActions {
  setXenoEffects: (target_id: IsolatedXenoTarget, effects: XenoStageEffect[], evidence_refs: string[]) => void;
  resetPendingXenoSpec: (target_id: IsolatedXenoTarget) => void;
}
const INITIAL_XENO_PENDING: XenoPendingSliceState = {
  pending_xeno_specs: ISOLATED_XENO_PENDING_SPECS,
  runtime_inputs: [],
};
export const createXenoPendingSlice: StateCreator<XenoPendingSliceState & XenoPendingSliceActions, [], [], XenoPendingSliceState & XenoPendingSliceActions> = (set) => ({
  ...INITIAL_XENO_PENDING,
  setXenoEffects: (target_id, effects, evidence_refs) => {
    // P3 05:67-70 GATE: empty evidence_refs → reject
    if (evidence_refs.length === 0) {
      console.error(`[xenoPending] REJECTED: setXenoEffects for ${target_id} — empty evidence_refs`);
      return;
    }
    set((state) => ({
      pending_xeno_specs: {
        ...state.pending_xeno_specs,
        [target_id]: {
          ...state.pending_xeno_specs[target_id],
          active_in_formula: effects.length > 0,
          xeno_transmute_stage_effects: effects,
          xeno_transmute_level: Math.min(13, effects.length) as IsolatedAreaPendingSpec['xeno_transmute_level'],
        },
      },
      runtime_inputs: [
        ...state.runtime_inputs,
        {
          target_id,
          source_kind: 'woosung_game_gt',
          entered_by: 'runtime',
          entered_at_iso: new Date().toISOString(),
          effects,
          evidence_refs,
        },
      ],
    }));
  },
  resetPendingXenoSpec: (target_id) => set((state) => ({
    pending_xeno_specs: {
      ...state.pending_xeno_specs,
      [target_id]: ISOLATED_XENO_PENDING_SPECS[target_id],
    },
  })),
});

// ───────────────────────────── Aggregated store state + actions ─────────────────────────────
export type ParetoStoreState =
  BaseSliceState & EquipmentSliceState & HeroSliceState & WeaponSliceState &
  TechSliceState & PetSliceState & CollectibleSliceState & LmeSliceState &
  ModeSliceState & ConditionalSliceState & XenoPendingSliceState;

export type ParetoStoreActions =
  BaseSliceActions & EquipmentSliceActions & HeroSliceActions & WeaponSliceActions &
  TechSliceActions & PetSliceActions & CollectibleSliceActions & LmeSliceActions &
  ModeSliceActions & ConditionalSliceActions & XenoPendingSliceActions;

export type ParetoStore = ParetoStoreState & ParetoStoreActions;
