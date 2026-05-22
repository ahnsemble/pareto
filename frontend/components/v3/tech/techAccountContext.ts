import type { PlayerState } from '../../../app/lib/pareto-store/types';

export type TechAccountContextInput = {
  baseAtk: number;
  finalAtk: number;
  atkPercent: number;
  critRate: number;
  critDamage: number;
  skillDamage: number;
  collectionSets: number;
  collectionStars: number;
  customCollectionSets: number;
  survivorLevel: number;
  survivorStar: number;
  survivorAwakening: number;
  survivorTeamwork: number;
  survivorPassiveCrit: number;
  petAwakening: number;
  petAssistPets: number;
  petXeno: number;
  petResonanceChance: number;
  petResonanceAtk: number;
  mountCores: number;
  mountPuzzleSlots: number;
  mountStatInputs: number;
  mountAtk: number;
  mountSkillDamage: number;
  equipmentOtherworldCores: number;
  weaponEaf: number;
  weaponVaf: number;
  weaponChaos: number;
  weaponXeno: number;
  armorEaf: number;
  armorVaf: number;
  armorChaos: number;
  armorXeno: number;
  necklaceEaf: number;
  necklaceVaf: number;
  necklaceChaos: number;
  necklaceXeno: number;
  beltEaf: number;
  beltVaf: number;
  beltChaos: number;
  beltXeno: number;
  glovesEaf: number;
  glovesVaf: number;
  glovesChaos: number;
  glovesXeno: number;
  bootsEaf: number;
  bootsVaf: number;
  bootsChaos: number;
  bootsXeno: number;
  lmeTurf: number;
};

export const DEFAULT_TECH_ACCOUNT_CONTEXT: TechAccountContextInput = {
  baseAtk: 6101,
  finalAtk: 100000,
  atkPercent: 118,
  critRate: 310,
  critDamage: 580,
  skillDamage: 110,
  collectionSets: 38,
  collectionStars: 0,
  customCollectionSets: 0,
  survivorLevel: 120,
  survivorStar: 6,
  survivorAwakening: 0,
  survivorTeamwork: 0,
  survivorPassiveCrit: 0,
  petAwakening: 0,
  petAssistPets: 0,
  petXeno: 0,
  petResonanceChance: 0,
  petResonanceAtk: 0,
  mountCores: 0,
  mountPuzzleSlots: 0,
  mountStatInputs: 0,
  mountAtk: 0,
  mountSkillDamage: 0,
  equipmentOtherworldCores: 0,
  weaponEaf: 3,
  weaponVaf: 2,
  weaponChaos: 0,
  weaponXeno: 0,
  armorEaf: 0,
  armorVaf: 0,
  armorChaos: 0,
  armorXeno: 0,
  necklaceEaf: 0,
  necklaceVaf: 0,
  necklaceChaos: 0,
  necklaceXeno: 0,
  beltEaf: 0,
  beltVaf: 0,
  beltChaos: 0,
  beltXeno: 0,
  glovesEaf: 0,
  glovesVaf: 0,
  glovesChaos: 0,
  glovesXeno: 0,
  bootsEaf: 0,
  bootsVaf: 0,
  bootsChaos: 0,
  bootsXeno: 0,
  lmeTurf: 0,
};

const DEFAULT_SIO_LM_CONTEXT: Record<string, unknown> = {
  baseStats: {
    atkPercent: 118,
    atkEquipPercent: 5,
    atkHero: 25615,
    atkHeroPercent: 125,
    critRate: 310,
    critDamage: 580,
    skillDamage: 110,
    hpBulletBoost: 50,
    shieldDamage: 55,
    shieldDamageUptime: 1,
    laceration: 85,
    lacerationUptime: 1,
    poisoned: 10,
    taloxaBeam: 4.5,
    taloxaMaxSync: 400,
    taloxaOverload: 45,
    taloxaOverloadEff: 75,
    taloxaSyncLoss: 8,
    voidNeckBoostUptime: 1,
    weakened: 15,
  },
  attackMeta: {
    atkBase: 6101.3499999999985,
    atkFinal: 100000,
  },
  enabledSkills: ['Energy Cube', 'HP Bullet', 'Exo Bracer', 'Ammo Thruster', 'HE Fuel', 'Drone Mode', 'Drill Shot Mode', 'Soccer Mode', 'Molotov Mode'],
};

function clampInteger(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.trunc(value)));
}

export function buildSioLmContext(account: TechAccountContextInput): Record<string, unknown> {
  const baseStats = DEFAULT_SIO_LM_CONTEXT.baseStats as Record<string, unknown>;
  return {
    ...DEFAULT_SIO_LM_CONTEXT,
    baseStats: {
      ...baseStats,
      atkPercent: account.atkPercent + account.mountAtk + account.mountStatInputs,
      critRate: account.critRate,
      critDamage: account.critDamage,
      skillDamage: account.skillDamage + account.mountSkillDamage,
    },
    attackMeta: {
      atkBase: account.baseAtk,
      atkFinal: account.finalAtk,
    },
  };
}

export function playerStateWithAccountContext(playerState: PlayerState, account: TechAccountContextInput): PlayerState {
  return {
    ...playerState,
    damage: {
      ...playerState.damage,
      base_attack: account.baseAtk,
      final_attack: account.finalAtk,
      crit_rate_percent: account.critRate,
      crit_damage_percent: account.critDamage,
      skill_damage_percent: account.skillDamage + account.mountSkillDamage,
    },
    hero: {
      ...playerState.hero,
      selected_hero_level: clampInteger(account.survivorLevel, 1, 120),
      selected_hero_star: clampInteger(account.survivorStar, 0, 8),
      selected_hero_awakening: clampInteger(account.survivorAwakening, 0, 8),
      teamwork_slots_unlocked: clampInteger(account.survivorTeamwork, 0, 4),
      passive_crit_rate_percent: Math.max(0, Math.trunc(account.survivorPassiveCrit)),
    },
    equipment: {
      ...playerState.equipment,
      weapon: {
        ...playerState.equipment.weapon,
        astral_forge_eaf_level: clampInteger(account.weaponEaf, 0, 5) as PlayerState['equipment']['weapon']['astral_forge_eaf_level'],
        astral_forge_vaf_level: clampInteger(account.weaponVaf, 0, 5) as PlayerState['equipment']['weapon']['astral_forge_vaf_level'],
        chaos_fusion_level: clampInteger(account.weaponChaos, 0, 10),
        xeno_transmute_level: clampInteger(account.weaponXeno, 0, 13) as PlayerState['equipment']['weapon']['xeno_transmute_level'],
      },
      armor: {
        ...playerState.equipment.armor,
        astral_forge_eaf_level: clampInteger(account.armorEaf, 0, 5) as PlayerState['equipment']['armor']['astral_forge_eaf_level'],
        astral_forge_vaf_level: clampInteger(account.armorVaf, 0, 5) as PlayerState['equipment']['armor']['astral_forge_vaf_level'],
        chaos_fusion_level: clampInteger(account.armorChaos, 0, 10),
        xeno_transmute_level: clampInteger(account.armorXeno, 0, 13) as PlayerState['equipment']['armor']['xeno_transmute_level'],
      },
      necklace: {
        ...playerState.equipment.necklace,
        astral_forge_eaf_level: clampInteger(account.necklaceEaf, 0, 5) as PlayerState['equipment']['necklace']['astral_forge_eaf_level'],
        astral_forge_vaf_level: clampInteger(account.necklaceVaf, 0, 5) as PlayerState['equipment']['necklace']['astral_forge_vaf_level'],
        chaos_fusion_level: clampInteger(account.necklaceChaos, 0, 10),
        xeno_transmute_level: clampInteger(account.necklaceXeno, 0, 13) as PlayerState['equipment']['necklace']['xeno_transmute_level'],
      },
      belt: {
        ...playerState.equipment.belt,
        astral_forge_eaf_level: clampInteger(account.beltEaf, 0, 5) as PlayerState['equipment']['belt']['astral_forge_eaf_level'],
        astral_forge_vaf_level: clampInteger(account.beltVaf, 0, 5) as PlayerState['equipment']['belt']['astral_forge_vaf_level'],
        chaos_fusion_level: clampInteger(account.beltChaos, 0, 10),
        xeno_transmute_level: clampInteger(account.beltXeno, 0, 13) as PlayerState['equipment']['belt']['xeno_transmute_level'],
      },
      gloves: {
        ...playerState.equipment.gloves,
        astral_forge_eaf_level: clampInteger(account.glovesEaf, 0, 5) as PlayerState['equipment']['gloves']['astral_forge_eaf_level'],
        astral_forge_vaf_level: clampInteger(account.glovesVaf, 0, 5) as PlayerState['equipment']['gloves']['astral_forge_vaf_level'],
        chaos_fusion_level: clampInteger(account.glovesChaos, 0, 10),
        xeno_transmute_level: clampInteger(account.glovesXeno, 0, 13) as PlayerState['equipment']['gloves']['xeno_transmute_level'],
      },
      boots: {
        ...playerState.equipment.boots,
        astral_forge_eaf_level: clampInteger(account.bootsEaf, 0, 5) as PlayerState['equipment']['boots']['astral_forge_eaf_level'],
        astral_forge_vaf_level: clampInteger(account.bootsVaf, 0, 5) as PlayerState['equipment']['boots']['astral_forge_vaf_level'],
        chaos_fusion_level: clampInteger(account.bootsChaos, 0, 10),
        xeno_transmute_level: clampInteger(account.bootsXeno, 0, 13) as PlayerState['equipment']['boots']['xeno_transmute_level'],
      },
    },
    pet: {
      ...playerState.pet,
      awakening_level: clampInteger(account.petAwakening, 0, 8),
      deployed_is_xeno: account.petXeno >= 1,
      resonance_chance: Math.max(0, Math.trunc(account.petResonanceChance)),
      resonance_atk: Math.max(0, Math.trunc(account.petResonanceAtk)),
      assist_pet_1_id: account.petAssistPets >= 1 ? (playerState.pet.assist_pet_1_id || 'assist_pet_1') : '',
      assist_pet_2_id: account.petAssistPets >= 2 ? (playerState.pet.assist_pet_2_id || 'assist_pet_2') : '',
      xeno_preview_enabled: account.petXeno >= 1,
    },
    collectible: {
      ...playerState.collectible,
      edition_progress: clampInteger(account.collectionSets, 0, 38),
      red_star_total: Math.max(0, Math.trunc(account.collectionStars)),
      custom_collection_slots: Math.max(0, Math.trunc(account.customCollectionSets)),
    },
    lme: {
      ...playerState.lme,
      turf_nodes_enabled: Math.max(0, Math.trunc(account.lmeTurf)),
    },
  };
}
