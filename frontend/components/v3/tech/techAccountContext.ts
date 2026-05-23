import type { PlayerState } from '../../../app/lib/pareto-store/types';

export type TechAccountContextInput = {
  selectedHeroId: string;
  targetCollectibleId: string;
  deployedPetId: string;
  assistPet1Id: string;
  assistPet2Id: string;
  selectedMountId: string;
  weaponItemId: string;
  armorItemId: string;
  necklaceItemId: string;
  beltItemId: string;
  glovesItemId: string;
  bootsItemId: string;
  baseAtk: number;
  finalAtk: number;
  atkPercent: number;
  critRate: number;
  critDamage: number;
  skillDamage: number;
  shieldDamage: number;
  poisonedDamage: number;
  weakenedDamage: number;
  chilledDamage: number;
  lacerationDamage: number;
  movementSpeed: number;
  movementSpeedCap: number;
  petAtk: number;
  otherworldPetSyncRate: number;
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

export type TechAccountContextNamedField = {
  [K in keyof TechAccountContextInput]: TechAccountContextInput[K] extends string ? K : never;
}[keyof TechAccountContextInput];

export const DEFAULT_TECH_ACCOUNT_CONTEXT: TechAccountContextInput = {
  selectedHeroId: 'venato',
  targetCollectibleId: '',
  deployedPetId: 'rex',
  assistPet1Id: '',
  assistPet2Id: '',
  selectedMountId: 'doomsteed',
  weaponItemId: 'twinLance',
  armorItemId: 'evervoidArmor',
  necklaceItemId: 'judgmentNecklace',
  beltItemId: 'stardustSash',
  glovesItemId: 'moonscarBracer',
  bootsItemId: 'glacialWarboots',
  baseAtk: 6101,
  finalAtk: 100000,
  atkPercent: 118,
  critRate: 310,
  critDamage: 580,
  skillDamage: 110,
  shieldDamage: 55,
  poisonedDamage: 10,
  weakenedDamage: 15,
  chilledDamage: 0,
  lacerationDamage: 85,
  movementSpeed: 0,
  movementSpeedCap: 0,
  petAtk: 0,
  otherworldPetSyncRate: 0,
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

export function normalizePetAssistContext(account: TechAccountContextInput): TechAccountContextInput {
  let assistPet1Id = account.assistPet1Id;
  let assistPet2Id = account.assistPet2Id;

  if (assistPet1Id === account.deployedPetId) {
    assistPet1Id = '';
    assistPet2Id = '';
  }
  if (assistPet2Id === account.deployedPetId) {
    assistPet2Id = '';
  }
  if (assistPet1Id && assistPet1Id === assistPet2Id) {
    assistPet2Id = '';
  }
  if (!assistPet1Id) {
    assistPet2Id = '';
  }

  const petAssistPets = assistPet2Id ? 2 : assistPet1Id ? 1 : 0;
  return { ...account, assistPet1Id, assistPet2Id, petAssistPets };
}

export function petXenoStatusLabel(account: TechAccountContextInput): string {
  if (account.petXeno < 1) return 'Xeno off';
  if (account.petResonanceChance > 0 || account.petResonanceAtk > 0) return 'Xeno resonance ready';
  return 'Xeno preview on';
}

export function formatTeamworkOptionLabel(value: number): string {
  const labels: Record<number, string> = {
    0: '0 slots / none',
    1: '1 slot / starter',
    2: '2 slots / standard',
    3: '3 slots / advanced',
    4: '4 slots / full',
  };
  return labels[value] ?? `${value} slots`;
}

export function formatPassiveCritOptionLabel(value: number): string {
  return value <= 0 ? 'No passive crit' : `Crit +${value}%`;
}

export function survivorContextSummary(account: TechAccountContextInput): string {
  return `${formatTeamworkOptionLabel(account.survivorTeamwork)} / ${formatPassiveCritOptionLabel(account.survivorPassiveCrit)}`;
}

export function collectibleItemReviewMarker(isTarget: boolean): string {
  return isTarget ? 'Target' : 'Review';
}

export function mountReviewSummary(account: TechAccountContextInput): string {
  const puzzleSlots = Math.max(0, Math.trunc(account.mountPuzzleSlots));
  const mountCores = Math.max(0, Math.trunc(account.mountCores));
  return `Puzzle slots ${puzzleSlots} / Mount cores ${mountCores} / Review-only puzzle rows`;
}

export function lmeTurfPresetLabel(value: number): string {
  return `${Math.max(0, Math.trunc(value))} nodes`;
}

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
      shieldDamage: account.shieldDamage,
      poisoned: account.poisonedDamage,
      weakened: account.weakenedDamage,
      chilled: account.chilledDamage,
      laceration: account.lacerationDamage,
      xenoSyncRate: account.otherworldPetSyncRate,
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
      selected_hero_id: account.selectedHeroId as PlayerState['hero']['selected_hero_id'],
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
        item_id: account.weaponItemId,
        astral_forge_eaf_level: clampInteger(account.weaponEaf, 0, 5) as PlayerState['equipment']['weapon']['astral_forge_eaf_level'],
        astral_forge_vaf_level: clampInteger(account.weaponVaf, 0, 5) as PlayerState['equipment']['weapon']['astral_forge_vaf_level'],
        chaos_fusion_level: clampInteger(account.weaponChaos, 0, 10),
        xeno_transmute_level: clampInteger(account.weaponXeno, 0, 13) as PlayerState['equipment']['weapon']['xeno_transmute_level'],
      },
      armor: {
        ...playerState.equipment.armor,
        item_id: account.armorItemId,
        astral_forge_eaf_level: clampInteger(account.armorEaf, 0, 5) as PlayerState['equipment']['armor']['astral_forge_eaf_level'],
        astral_forge_vaf_level: clampInteger(account.armorVaf, 0, 5) as PlayerState['equipment']['armor']['astral_forge_vaf_level'],
        chaos_fusion_level: clampInteger(account.armorChaos, 0, 10),
        xeno_transmute_level: clampInteger(account.armorXeno, 0, 13) as PlayerState['equipment']['armor']['xeno_transmute_level'],
      },
      necklace: {
        ...playerState.equipment.necklace,
        item_id: account.necklaceItemId,
        astral_forge_eaf_level: clampInteger(account.necklaceEaf, 0, 5) as PlayerState['equipment']['necklace']['astral_forge_eaf_level'],
        astral_forge_vaf_level: clampInteger(account.necklaceVaf, 0, 5) as PlayerState['equipment']['necklace']['astral_forge_vaf_level'],
        chaos_fusion_level: clampInteger(account.necklaceChaos, 0, 10),
        xeno_transmute_level: clampInteger(account.necklaceXeno, 0, 13) as PlayerState['equipment']['necklace']['xeno_transmute_level'],
      },
      belt: {
        ...playerState.equipment.belt,
        item_id: account.beltItemId,
        astral_forge_eaf_level: clampInteger(account.beltEaf, 0, 5) as PlayerState['equipment']['belt']['astral_forge_eaf_level'],
        astral_forge_vaf_level: clampInteger(account.beltVaf, 0, 5) as PlayerState['equipment']['belt']['astral_forge_vaf_level'],
        chaos_fusion_level: clampInteger(account.beltChaos, 0, 10),
        xeno_transmute_level: clampInteger(account.beltXeno, 0, 13) as PlayerState['equipment']['belt']['xeno_transmute_level'],
      },
      gloves: {
        ...playerState.equipment.gloves,
        item_id: account.glovesItemId,
        astral_forge_eaf_level: clampInteger(account.glovesEaf, 0, 5) as PlayerState['equipment']['gloves']['astral_forge_eaf_level'],
        astral_forge_vaf_level: clampInteger(account.glovesVaf, 0, 5) as PlayerState['equipment']['gloves']['astral_forge_vaf_level'],
        chaos_fusion_level: clampInteger(account.glovesChaos, 0, 10),
        xeno_transmute_level: clampInteger(account.glovesXeno, 0, 13) as PlayerState['equipment']['gloves']['xeno_transmute_level'],
      },
      boots: {
        ...playerState.equipment.boots,
        item_id: account.bootsItemId,
        astral_forge_eaf_level: clampInteger(account.bootsEaf, 0, 5) as PlayerState['equipment']['boots']['astral_forge_eaf_level'],
        astral_forge_vaf_level: clampInteger(account.bootsVaf, 0, 5) as PlayerState['equipment']['boots']['astral_forge_vaf_level'],
        chaos_fusion_level: clampInteger(account.bootsChaos, 0, 10),
        xeno_transmute_level: clampInteger(account.bootsXeno, 0, 13) as PlayerState['equipment']['boots']['xeno_transmute_level'],
      },
    },
    pet: {
      ...playerState.pet,
      deployed_pet_id: account.deployedPetId,
      awakening_level: clampInteger(account.petAwakening, 0, 8),
      deployed_is_xeno: account.petXeno >= 1,
      resonance_chance: Math.max(0, Math.trunc(account.petResonanceChance)),
      resonance_atk: Math.max(0, Math.trunc(account.petResonanceAtk)),
      assist_pet_1_id: account.petAssistPets >= 1 ? account.assistPet1Id : '',
      assist_pet_2_id: account.petAssistPets >= 2 ? account.assistPet2Id : '',
      xeno_preview_enabled: account.petXeno >= 1,
    },
    collectible: {
      ...playerState.collectible,
      edition_progress: clampInteger(account.collectionSets, 0, 38),
      red_star_total: Math.max(0, Math.trunc(account.collectionStars)),
      custom_collection_slots: Math.max(0, Math.trunc(account.customCollectionSets)),
      target_collectible_id: account.targetCollectibleId,
    },
    lme: {
      ...playerState.lme,
      turf_nodes_enabled: Math.max(0, Math.trunc(account.lmeTurf)),
    },
  };
}
