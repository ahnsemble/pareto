'use client';

import { useEffect, useMemo, useState } from 'react';
import { Link } from '../../i18n/navigation';
import { bootParetoStore, useParetoStore } from '../../app/lib/pareto-store/store';
import { selectPlayerState } from '../../app/lib/pareto-store/selectors';
import {
  DEFAULT_RESOURCE_WALLET_VALUES,
  RESOURCE_WALLET_FIELDS,
  type ResourceWalletId,
  type ResourceWalletValues,
} from '../../app/lib/pareto-store/resource-wallet';
import { parseProductProfileImport } from '../../app/lib/pareto-store/profile-import';
import {
  COLLECTIBLE_SET_INDEX,
  HERO_SCHEMA_INDEX,
  MOUNT_SCHEMA_INDEX,
  PET_SCHEMA_INDEX,
  SS_EQUIPMENT_SCHEMA_INDEX,
} from '../../app/lib/pareto-store/schemas';
import type { PlayerState } from '../../app/lib/pareto-store/types';
import { getWorker } from '../../app/lib/wasm-client';
import {
  initWasm,
  relicCoreOptimize,
  twinbornAutoAssign,
  validateSioTechInventory,
  type RelicCoreOptimizerResult,
  type SioInventoryValidation,
  type SioTechInventoryInput,
  type TechOptimizerResult,
  type TwinbornAutoAssignResult,
} from '../../app/lib/wasm';
import { presentTechLoadoutRows, presentTechSkillName } from './tech/techResultPresenter';

type BootState = 'pending' | 'ok' | string;
type ResourceId = 'eternalCores' | 'voidCores' | 'chaosCores' | 'relicKeys' | 'gold';

const RESOURCE_FIELDS: Array<{ id: ResourceId; label: string; value: number; step: number }> = [
  { id: 'eternalCores', label: 'Eternal cores', value: 18, step: 1 },
  { id: 'voidCores', label: 'Void cores', value: 12, step: 1 },
  { id: 'chaosCores', label: 'Chaos cores', value: 8, step: 1 },
  { id: 'relicKeys', label: 'Relic keys', value: 10, step: 1 },
  { id: 'gold', label: 'Gold', value: 600000, step: 50000 },
];

const shellClass = 'mx-auto w-full max-w-6xl space-y-4 p-6';
const headerClass = '-mx-6 border-b border-[color:var(--color-border)]/50 bg-[color:var(--color-bg)] px-6 pb-3 pt-2';
const panelClass = 'min-w-0 rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-surface-elev)] p-4';
const labelClass = 'text-xs uppercase text-[color:var(--color-text-muted)]';
const inputClass = 'min-h-[44px] min-w-0 w-full rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 py-2 font-mono text-sm text-[color:var(--color-text)]';
const buttonClass = 'min-h-[44px] rounded-md bg-[color:var(--color-primary)] px-4 py-2 font-mono text-sm font-semibold text-[color:var(--color-bg)] hover:bg-[color:var(--color-primary-strong)] disabled:cursor-not-allowed disabled:opacity-40';
const linkClass = 'inline-flex min-h-[44px] items-center rounded-md px-2 font-mono text-xs text-[color:var(--color-text-muted)] hover:text-[color:var(--color-primary)]';
const selectClass = inputClass;
const checkboxClass = 'h-5 w-5 rounded border border-[color:var(--color-border)] bg-[color:var(--color-bg)]';

const SIO_RARITY_FIELDS = ['Eternal', 'Legend4', 'Legend3', 'Legend2', 'Legend1', 'Legend', 'Epic3', 'Epic2', 'Epic1', 'Epic'] as const;
const SIO_RARITY_INPUTS: Array<{ id: (typeof SIO_RARITY_FIELDS)[number]; label: string }> = [
  { id: 'Eternal', label: 'Eternal' },
  { id: 'Legend4', label: 'Legend +4' },
  { id: 'Legend3', label: 'Legend +3' },
  { id: 'Legend2', label: 'Legend +2' },
  { id: 'Legend1', label: 'Legend +1' },
  { id: 'Legend', label: 'Legend' },
  { id: 'Epic3', label: 'Epic +3' },
  { id: 'Epic2', label: 'Epic +2' },
  { id: 'Epic1', label: 'Epic +1' },
  { id: 'Epic', label: 'Epic' },
];
const DEFAULT_RARITY_COUNTS: Record<(typeof SIO_RARITY_FIELDS)[number], number> = {
  Eternal: 0,
  Legend4: 0,
  Legend3: 0,
  Legend2: 0,
  Legend1: 0,
  Legend: 1,
  Epic3: 0,
  Epic2: 0,
  Epic1: 0,
  Epic: 6,
};
const SIO_MODE_CHOICES = [
  ['droneMode', 'Drone'],
  ['drillShotMode', 'Drill Shot'],
  ['soccerMode', 'Soccer'],
  ['boomerangMode', 'Boomerang'],
  ['rocketMode', 'Rocket'],
  ['molotovMode', 'Molotov'],
  ['durianMode', 'Durian'],
  ['lightningMode', 'Lightning'],
  ['laserMode', 'Laser'],
  ['guardianMode', 'Guardian'],
  ['brickMode', 'Brick'],
  ['forcefieldMode', 'Forcefield'],
] as const;
type SioModeId = (typeof SIO_MODE_CHOICES)[number][0];
type SkillStatus = 'auto' | 'locked' | 'disabled';
const DEFAULT_SKILL_STATUS = SIO_MODE_CHOICES.reduce(
  (status, [mode]) => {
    status[mode] = mode === 'rocketMode' || mode === 'guardianMode' ? 'disabled' : 'auto';
    return status;
  },
  {} as Record<SioModeId, SkillStatus>,
);
const SKILL_STATUS_LABEL: Record<SkillStatus, string> = {
  auto: 'Auto',
  locked: 'Locked',
  disabled: 'Excluded',
};
const DEFAULT_CANDIDATE_PRESELECT_TOP_K = 16;
type TechAccountContextInput = {
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
const DEFAULT_TECH_ACCOUNT_CONTEXT: TechAccountContextInput = {
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

function useV3OptimizerBoot(): BootState {
  const [bootStatus, setBootStatus] = useState<BootState>('pending');

  useEffect(() => {
    let mounted = true;
    initWasm()
      .then(() => {
        if (!mounted) return;
        bootParetoStore();
        setBootStatus('ok');
      })
      .catch((err) => {
        if (!mounted) return;
        const message = err instanceof Error ? err.message : String(err);
        setBootStatus(message);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return bootStatus;
}

function BootLine({ status }: { status: BootState }) {
  return (
    <p
      className={`mt-1 text-xs font-mono ${status === 'ok' ? 'text-[color:var(--color-accent)]' : status === 'pending' ? 'text-[color:var(--color-text-muted)]' : 'text-[color:var(--color-danger)]'}`}
      data-testid="v3-optimizer-boot-status"
    >
      {status === 'pending' ? 'Booting store...' : status === 'ok' ? '[TangtangStore] Boot OK' : status}
    </p>
  );
}

function formatNumber(value: number, digits = 2): string {
  return value.toLocaleString(undefined, { maximumFractionDigits: digits });
}

function formatCompactScientific(value: number): string {
  if (!Number.isFinite(value)) return 'n/a';
  if (value < 1_000_000) return formatNumber(value, 0);
  return value.toExponential(2);
}

function currentPlayerState() {
  return selectPlayerState(useParetoStore.getState());
}

function nextSkillStatus(status: SkillStatus): SkillStatus {
  if (status === 'auto') return 'locked';
  if (status === 'locked') return 'disabled';
  return 'auto';
}

function skillLabelsByStatus(statuses: Record<SioModeId, SkillStatus>, target: SkillStatus): string[] {
  return SIO_MODE_CHOICES.filter(([mode]) => statuses[mode] === target).map(([, label]) => label);
}

function safeValidation(status: BootState, inventory: SioTechInventoryInput): SioInventoryValidation {
  if (status !== 'ok') return { valid: false, errors: ['wasm_pending'], warnings: [] };
  try {
    return validateSioTechInventory(inventory);
  } catch (error) {
    return {
      valid: false,
      errors: [error instanceof Error ? error.message : String(error)],
      warnings: [],
    };
  }
}

const INVENTORY_MESSAGE_LABELS: Record<string, string> = {
  'overload.max_requires_overloadable': 'Max overload is only used when Overload is enabled',
  'overload.max_gt_18': 'Overload cap must be 18 or lower',
  'overload.max_too_high': 'Max overload must be 18 or lower',
  'chips.gt_999': 'Tech resonance chips must be 999 or lower',
  'chips.too_high': 'Tech resonance chips must be 999 or lower',
  'skill_slots.lt_1': 'Active skills must be at least 1',
  'skill_slots.too_low': 'Skill slots must be at least 1',
  'skill_slots.gt_6': 'Active skills must be 6 or lower',
  'skill_slots.too_high': 'Skill slots must be 6 or lower',
  wasm_pending: 'WASM is still loading',
};

function inventoryMessage(value: string): string {
  return INVENTORY_MESSAGE_LABELS[value] ?? value;
}

function buildLoadoutRows(build: TechOptimizerResult['builds'][number] | undefined): Array<Record<string, unknown>> {
  const loadout = build?.config?.loadout;
  return Array.isArray(loadout) ? (loadout as Array<Record<string, unknown>>) : [];
}

function buildChipRemainder(build: TechOptimizerResult['builds'][number] | undefined): string {
  const candidate = build?.config?.sioCandidate as Record<string, unknown> | undefined;
  const value = candidate?.chipRemainder;
  return typeof value === 'number' ? formatNumber(value, 0) : 'n/a';
}

function buildActiveSkills(build: TechOptimizerResult['builds'][number] | undefined): string {
  const candidate = build?.config?.sioCandidate as Record<string, unknown> | undefined;
  const skills = candidate?.activeSkills;
  if (!Array.isArray(skills) || skills.length === 0) return 'none';
  return skills.map((skill) => presentTechSkillName(String(skill))).join(', ');
}

function contextNumber(value: number | null | undefined, digits = 0): string {
  return typeof value === 'number' && Number.isFinite(value) ? formatNumber(value, digits) : '0';
}

function contextLabel(value: string | null | undefined): string {
  return value && value.trim().length > 0 ? value : 'none';
}

function displayNameById<T extends { id: string; display_name_en: string }>(
  rows: readonly T[],
  id: string | null | undefined,
  fallback = 'Unknown',
): string {
  return rows.find((row) => row.id === id)?.display_name_en ?? fallback;
}

function clampInteger(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.trunc(value)));
}

function buildSioLmContext(account: TechAccountContextInput): Record<string, unknown> {
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

function playerStateWithAccountContext(playerState: PlayerState, account: TechAccountContextInput): PlayerState {
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

function AccountContextPanel({
  playerState,
  account,
  onChange,
}: {
  playerState: PlayerState;
  account: TechAccountContextInput;
  onChange: (field: keyof TechAccountContextInput, value: number) => void;
}) {
  const equipment = playerState.equipment;
  const selectedHeroName = displayNameById(HERO_SCHEMA_INDEX, playerState.hero.selected_hero_id, 'Selected survivor');
  const deployedPetName = displayNameById(PET_SCHEMA_INDEX, playerState.pet.deployed_pet_id, 'Pet');
  const collectionRows = COLLECTIBLE_SET_INDEX.slice(0, 3);
  const petRows = PET_SCHEMA_INDEX.slice(0, 5);
  const mountRows = MOUNT_SCHEMA_INDEX.slice(0, 3);
  const equipmentSlotSections: Array<{
    id: 'weapon' | 'armor' | 'necklace' | 'belt' | 'gloves' | 'boots';
    label: string;
    fields: Array<{ id: keyof TechAccountContextInput; label: string; testId: string; min: number; max?: number }>;
  }> = [
    {
      id: 'weapon',
      label: 'Weapon',
      fields: [
        { id: 'weaponEaf', label: 'EAF', testId: 'tech-account-weapon-eaf', min: 0, max: 5 },
        { id: 'weaponVaf', label: 'VAF', testId: 'tech-account-weapon-vaf', min: 0, max: 5 },
        { id: 'weaponChaos', label: 'Chaos', testId: 'tech-account-weapon-chaos', min: 0, max: 10 },
        { id: 'weaponXeno', label: 'Xeno', testId: 'tech-account-weapon-xeno', min: 0, max: 13 },
      ],
    },
    {
      id: 'armor',
      label: 'Armor',
      fields: [
        { id: 'armorEaf', label: 'EAF', testId: 'tech-account-armor-eaf', min: 0, max: 5 },
        { id: 'armorVaf', label: 'VAF', testId: 'tech-account-armor-vaf', min: 0, max: 5 },
        { id: 'armorChaos', label: 'Chaos', testId: 'tech-account-armor-chaos', min: 0, max: 10 },
        { id: 'armorXeno', label: 'Xeno', testId: 'tech-account-armor-xeno', min: 0, max: 13 },
      ],
    },
    {
      id: 'necklace',
      label: 'Necklace',
      fields: [
        { id: 'necklaceEaf', label: 'EAF', testId: 'tech-account-necklace-eaf', min: 0, max: 5 },
        { id: 'necklaceVaf', label: 'VAF', testId: 'tech-account-necklace-vaf', min: 0, max: 5 },
        { id: 'necklaceChaos', label: 'Chaos', testId: 'tech-account-necklace-chaos', min: 0, max: 10 },
        { id: 'necklaceXeno', label: 'Xeno', testId: 'tech-account-necklace-xeno', min: 0, max: 13 },
      ],
    },
    {
      id: 'belt',
      label: 'Belt',
      fields: [
        { id: 'beltEaf', label: 'EAF', testId: 'tech-account-belt-eaf', min: 0, max: 5 },
        { id: 'beltVaf', label: 'VAF', testId: 'tech-account-belt-vaf', min: 0, max: 5 },
        { id: 'beltChaos', label: 'Chaos', testId: 'tech-account-belt-chaos', min: 0, max: 10 },
        { id: 'beltXeno', label: 'Xeno', testId: 'tech-account-belt-xeno', min: 0, max: 13 },
      ],
    },
    {
      id: 'gloves',
      label: 'Gloves',
      fields: [
        { id: 'glovesEaf', label: 'EAF', testId: 'tech-account-gloves-eaf', min: 0, max: 5 },
        { id: 'glovesVaf', label: 'VAF', testId: 'tech-account-gloves-vaf', min: 0, max: 5 },
        { id: 'glovesChaos', label: 'Chaos', testId: 'tech-account-gloves-chaos', min: 0, max: 10 },
        { id: 'glovesXeno', label: 'Xeno', testId: 'tech-account-gloves-xeno', min: 0, max: 13 },
      ],
    },
    {
      id: 'boots',
      label: 'Boots',
      fields: [
        { id: 'bootsEaf', label: 'EAF', testId: 'tech-account-boots-eaf', min: 0, max: 5 },
        { id: 'bootsVaf', label: 'VAF', testId: 'tech-account-boots-vaf', min: 0, max: 5 },
        { id: 'bootsChaos', label: 'Chaos', testId: 'tech-account-boots-chaos', min: 0, max: 10 },
        { id: 'bootsXeno', label: 'Xeno', testId: 'tech-account-boots-xeno', min: 0, max: 13 },
      ],
    },
  ];
  const sections: Array<{
    title: string;
    detailLabel?: string;
    fields: Array<{ id: keyof TechAccountContextInput; label: string; testId: string; min: number; max?: number; step?: number }>;
    summary?: Array<[string, string]>;
  }> = [
    {
      title: 'Build stats',
      fields: [
        { id: 'baseAtk', label: 'Base ATK', testId: 'tech-account-base-atk', min: 0, step: 1 },
        { id: 'finalAtk', label: 'Final ATK', testId: 'tech-account-final-atk', min: 0, step: 1 },
        { id: 'atkPercent', label: 'ATK %', testId: 'tech-account-atk-percent', min: 0, max: 5000 },
        { id: 'critRate', label: 'Crit rate', testId: 'tech-account-crit-rate', min: 0, max: 1000 },
        { id: 'critDamage', label: 'Crit damage', testId: 'tech-account-crit-damage', min: 0, max: 5000 },
        { id: 'skillDamage', label: 'Skill damage', testId: 'tech-account-skill-damage', min: 0, max: 5000 },
      ],
      summary: [['Mode', playerState.damage.combat_mode.toUpperCase()]],
    },
    {
      title: 'Collections',
      detailLabel: 'Collection detail',
      fields: [
        { id: 'collectionSets', label: 'Set progress', testId: 'tech-account-collection-sets', min: 0, max: 38 },
        { id: 'collectionStars', label: 'Set stars', testId: 'tech-account-collection-stars', min: 0 },
        { id: 'customCollectionSets', label: 'Custom sets', testId: 'tech-account-collection-custom-sets', min: 0 },
      ],
      summary: [
        ['Custom sets', contextNumber(playerState.collectible.custom_collection_slots)],
        ['Collector heart', contextNumber(playerState.collectible.advanced_collector_heart_level)],
      ],
    },
    {
      title: 'Survivors',
      detailLabel: 'Survivor detail',
      fields: [
        { id: 'survivorLevel', label: 'Level', testId: 'tech-account-survivor-level', min: 1, max: 120 },
        { id: 'survivorStar', label: 'Star', testId: 'tech-account-survivor-star', min: 0, max: 8 },
        { id: 'survivorAwakening', label: 'Awakening', testId: 'tech-account-survivor-awakening', min: 0, max: 8 },
        { id: 'survivorTeamwork', label: 'Teamwork slots', testId: 'tech-account-survivor-teamwork', min: 0, max: 4 },
        { id: 'survivorPassiveCrit', label: 'Passive crit rate', testId: 'tech-account-survivor-passive', min: 0, max: 1000 },
      ],
      summary: [
        ['Main', contextLabel(playerState.hero.selected_hero_id)],
        ['Teamwork', contextNumber(playerState.hero.teamwork_slots_unlocked)],
      ],
    },
    {
      title: 'Pet awakening',
      detailLabel: 'Pet detail',
      fields: [
        { id: 'petAwakening', label: 'Awakening', testId: 'tech-account-pet-awakening', min: 0, max: 8 },
        { id: 'petAssistPets', label: 'Assist pets', testId: 'tech-account-pet-assist-pets', min: 0, max: 2 },
        { id: 'petXeno', label: 'Xeno', testId: 'tech-account-pet-xeno', min: 0, max: 1 },
        { id: 'petResonanceChance', label: 'Resonance chance', testId: 'tech-account-pet-resonance-chance', min: 0, max: 100 },
        { id: 'petResonanceAtk', label: 'Resonance ATK', testId: 'tech-account-pet-resonance-atk', min: 0 },
      ],
      summary: [
        ['Main pet', contextLabel(playerState.pet.deployed_pet_id)],
        ['Xeno', playerState.pet.deployed_is_xeno ? 'on' : 'off'],
      ],
    },
    {
      title: 'Mounts',
      detailLabel: 'Mount detail',
      fields: [
        { id: 'mountCores', label: 'Mount cores', testId: 'tech-account-mount-cores', min: 0 },
        { id: 'mountPuzzleSlots', label: 'Puzzle slots', testId: 'tech-account-mount-puzzle', min: 0 },
        { id: 'mountStatInputs', label: 'Mount stat inputs', testId: 'tech-account-mount-stat', min: 0, max: 5000 },
        { id: 'mountAtk', label: 'Mount ATK %', testId: 'tech-account-mount-atk', min: 0, max: 5000 },
        { id: 'mountSkillDamage', label: 'Mount skill %', testId: 'tech-account-mount-skill', min: 0, max: 5000 },
      ],
    },
    {
      title: 'Equipment forging',
      detailLabel: 'Six-slot equipment',
      fields: [
        { id: 'equipmentOtherworldCores', label: 'Otherworld / forge cores', testId: 'tech-account-equipment-otherworld-cores', min: 0 },
      ],
      summary: [
        ['Weapon', contextLabel(equipment.weapon.item_id)],
        ['Designs', contextNumber(equipment.weapon.designs_owned)],
      ],
    },
    {
      title: 'Lunar Mine',
      fields: [
        { id: 'lmeTurf', label: 'Turf nodes', testId: 'tech-account-lme-turf', min: 0 },
      ],
      summary: [
        ['Phase', playerState.lme.battle_phase],
        ['Player medals', contextNumber(playerState.lme.player_medals)],
        ['Opponent medals', contextNumber(playerState.lme.opponent_medals)],
      ],
    },
  ];

  return (
    <div className={panelClass} data-testid="tech-account-context">
      <h2 className={labelClass}>Account context</h2>
      <div className="mt-2 grid gap-1 text-xs text-[color:var(--color-text-muted)]">
        {sections.map((section) => (
          <section key={section.title} className="border-t border-[color:var(--color-border)]/50 py-3">
            <h3 className="text-xs font-semibold uppercase text-[color:var(--color-text)]">{section.title}</h3>
            {section.detailLabel ? <p className="mt-1 text-xs text-[color:var(--color-text-muted)]">{section.detailLabel}</p> : null}
            {section.title === 'Collections' ? (
              <div className="mt-2 grid gap-2" data-testid="tech-collection-named-editor">
                {collectionRows.map((set) => (
                  <div
                    key={set.id}
                    className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 rounded-md border border-[color:var(--color-border)]/60 p-2 text-xs"
                    data-testid="tech-collection-named-row"
                  >
                    <span className="truncate text-[color:var(--color-text)]">{set.display_name_en}</span>
                    <span className="font-mono text-[color:var(--color-text-muted)]">Set {set.collectible_count}</span>
                  </div>
                ))}
              </div>
            ) : null}
            {section.title === 'Survivors' ? (
              <div className="mt-2 grid gap-2">
                <div
                  className="rounded-md border border-[color:var(--color-border)]/60 p-2 text-xs text-[color:var(--color-text)]"
                  data-testid="tech-survivor-selector"
                >
                  <span className="text-[color:var(--color-text-muted)]">Selected survivor</span>
                  <span className="ml-2 font-semibold">{selectedHeroName}</span>
                </div>
                <div
                  className="grid gap-2 sm:grid-cols-2"
                  data-testid="tech-teamwork-passive-picker"
                >
                  <div className="rounded-md border border-[color:var(--color-border)]/60 p-2 text-xs" data-testid="tech-teamwork-row">
                    <span className="font-semibold text-[color:var(--color-text)]">Teamwork passive</span>
                    <span className="mt-1 block text-[color:var(--color-text-muted)]">
                      {selectedHeroName} support slot summary
                    </span>
                  </div>
                  <div className="rounded-md border border-[color:var(--color-border)]/60 p-2 text-xs" data-testid="tech-passive-row">
                    <span className="font-semibold text-[color:var(--color-text)]">Passive crit</span>
                    <span className="mt-1 block text-[color:var(--color-text-muted)]">
                      Numeric fallback remains editable
                    </span>
                  </div>
                </div>
              </div>
            ) : null}
            {section.title === 'Pet awakening' ? (
              <div className="mt-2 grid gap-2" data-testid="tech-pet-selector">
                <div className="rounded-md border border-[color:var(--color-border)]/60 p-2 text-xs text-[color:var(--color-text)]">
                  <span className="text-[color:var(--color-text-muted)]">Deployed pet</span>
                  <span className="ml-2 font-semibold">{deployedPetName}</span>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="rounded-md border border-[color:var(--color-border)]/60 p-2 text-xs" data-testid="tech-pet-assist-1">
                    Assist 1 · {petRows[0]?.display_name_en ?? 'Pet'}
                  </div>
                  <div className="rounded-md border border-[color:var(--color-border)]/60 p-2 text-xs" data-testid="tech-pet-assist-2">
                    Assist 2 · {petRows[1]?.display_name_en ?? 'Pet'}
                  </div>
                </div>
              </div>
            ) : null}
            {section.title === 'Mounts' ? (
              <div className="mt-2 grid gap-2" data-testid="tech-mount-puzzle-editor">
                {mountRows.map((mount, index) => (
                  <div
                    key={mount.id}
                    className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 rounded-md border border-[color:var(--color-border)]/60 p-2 text-xs"
                    data-testid="tech-mount-puzzle-row"
                  >
                    <span className="truncate text-[color:var(--color-text)]">{mount.display_name_en}</span>
                    <span className="font-mono text-[color:var(--color-text-muted)]">Puzzle {index + 1}</span>
                  </div>
                ))}
              </div>
            ) : null}
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {section.fields.map((field) => (
                <label key={field.id} className="block text-sm text-[color:var(--color-text)]">
                  <span className="text-xs text-[color:var(--color-text-muted)]">{field.label}</span>
                  <input
                    className={inputClass + ' mt-1'}
                    data-testid={field.testId}
                    min={field.min}
                    max={field.max}
                    step={field.step ?? 1}
                    type="number"
                    value={account[field.id]}
                    onChange={(event) => onChange(field.id, Math.max(field.min, Number(event.target.value)))}
                  />
                </label>
              ))}
            </div>
            {section.title === 'Equipment forging' ? (
              <div className="mt-3 grid gap-3">
                {equipmentSlotSections.map((slot) => (
                  <div
                    key={slot.id}
                    className="rounded-md border border-[color:var(--color-border)]/60 p-3"
                    data-testid={`tech-equipment-slot-${slot.id}`}
                  >
                    <h4 className="text-xs font-semibold uppercase text-[color:var(--color-text)]">{slot.label}</h4>
                    <label className="mt-2 block text-sm text-[color:var(--color-text)]">
                      <span className="text-xs text-[color:var(--color-text-muted)]">Item</span>
                      <select
                        className={selectClass + ' mt-1'}
                        data-testid={`tech-equipment-item-selector-${slot.id}`}
                        value={equipment[slot.id].item_id}
                        onChange={() => undefined}
                      >
                        {SS_EQUIPMENT_SCHEMA_INDEX.filter((item) => item.slot === slot.id).map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.display_name_en}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="mt-2 grid gap-2 sm:grid-cols-4">
                      {slot.fields.map((field) => (
                        <label key={field.id} className="block text-sm text-[color:var(--color-text)]">
                          <span className="text-xs text-[color:var(--color-text-muted)]">{field.label}</span>
                          <input
                            className={inputClass + ' mt-1'}
                            data-testid={field.testId}
                            min={field.min}
                            max={field.max}
                            step={1}
                            type="number"
                            value={account[field.id]}
                            onChange={(event) => onChange(field.id, Math.max(field.min, Number(event.target.value)))}
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
            {section.summary && section.summary.length > 0 ? (
              <dl className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 font-mono">
                {section.summary.map(([label, value]) => (
                  <div key={`${section.title}-${label}`} className="contents">
                    <dt className="truncate">{label}</dt>
                    <dd className="text-right text-[color:var(--color-text)]">{value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </section>
        ))}
      </div>
    </div>
  );
}

function ResourceWalletPanel({
  values,
  onChange,
}: {
  values: ResourceWalletValues;
  onChange: (id: ResourceWalletId, value: number) => void;
}) {
  return (
    <div className={panelClass} data-testid="tech-resource-wallet">
      <h2 className={labelClass}>Resource wallet</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {RESOURCE_WALLET_FIELDS.map((field) => (
          <label key={field.id} className="block text-sm text-[color:var(--color-text)]">
            <span className="flex items-center justify-between gap-3">
              <span className="text-xs text-[color:var(--color-text-muted)]">{field.label}</span>
              <span className="rounded-sm border border-[color:var(--color-border)] px-2 py-1 font-mono text-[10px] uppercase text-[color:var(--color-text-muted)]">
                {field.scopeLabel}
              </span>
            </span>
            <input
              className={inputClass + ' mt-1'}
              data-testid={field.testId}
              min={0}
              type="number"
              value={values[field.id]}
              onChange={(event) => onChange(field.id, Math.max(0, Number(event.target.value)))}
            />
          </label>
        ))}
      </div>
    </div>
  );
}

function ProfileImportPanel({
  value,
  onChange,
  onImport,
  summary,
}: {
  value: string;
  onChange: (value: string) => void;
  onImport: () => void;
  summary: string;
}) {
  return (
    <div className={panelClass} data-testid="tech-profile-import">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className={labelClass}>Tangtang profile import</h2>
          <p className="mt-1 text-xs text-[color:var(--color-text-muted)]">
            Paste a profile export to fill this optimizer.
          </p>
        </div>
        <button type="button" className={buttonClass} disabled={value.trim().length === 0} onClick={onImport}>
          Import profile
        </button>
      </div>
      <label className="mt-3 block text-sm text-[color:var(--color-text)]">
        <span className="text-xs text-[color:var(--color-text-muted)]">Profile JSON</span>
        <textarea
          className={inputClass + ' mt-1 min-h-28 resize-y'}
          data-testid="tech-profile-import-input"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </label>
      <p className="mt-2 min-h-5 text-xs text-[color:var(--color-text-muted)]" data-testid="tech-profile-import-summary">
        {summary}
      </p>
    </div>
  );
}

export function RelicCoreOptimizerSurface() {
  const bootStatus = useV3OptimizerBoot();
  const [constraints, setConstraints] = useState<Record<ResourceId, number>>(() =>
    Object.fromEntries(RESOURCE_FIELDS.map((field) => [field.id, field.value])) as Record<ResourceId, number>,
  );
  const [result, setResult] = useState<RelicCoreOptimizerResult | null>(null);

  const canRun = bootStatus === 'ok';
  const request = useMemo(() => ({ ...constraints, topK: 5 }), [constraints]);

  return (
    <main className={shellClass} data-testid="relic-core-optimizer">
      <header className={headerClass}>
        <div className="flex items-baseline justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">
              <span className="text-[color:var(--color-primary)]">Tangtang</span>{' '}
              <span className="text-[color:var(--color-text)]">/ relic core</span>
            </h1>
            <BootLine status={bootStatus} />
          </div>
          <Link href="/v3" className={linkClass} data-testid="v3-hub-link">
            /v3
          </Link>
        </div>
      </header>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.6fr)]">
        <div className={panelClass}>
          <h2 className={labelClass}>Resource constraints</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {RESOURCE_FIELDS.map((field) => (
              <label key={field.id} className="block text-sm text-[color:var(--color-text)]">
                <span className="text-xs text-[color:var(--color-text-muted)]">{field.label}</span>
                <input
                  className={inputClass + ' mt-1'}
                  data-testid={`relic-constraint-${field.id}`}
                  min={0}
                  step={field.step}
                  type="number"
                  value={constraints[field.id]}
                  onChange={(event) =>
                    setConstraints((current) => ({
                      ...current,
                      [field.id]: Math.max(0, Number(event.target.value)),
                    }))
                  }
                />
              </label>
            ))}
          </div>
          <button
            type="button"
            className={buttonClass + ' mt-4 w-full'}
            data-testid="relic-core-run"
            disabled={!canRun}
            onClick={() => setResult(relicCoreOptimize(currentPlayerState(), request))}
          >
            Run
          </button>
        </div>

        <div className={panelClass}>
          <div className="flex items-center justify-between gap-3">
            <h2 className={labelClass}>Ranked builds</h2>
            <span className="font-mono text-xs text-[color:var(--color-text-muted)]" data-testid="relic-core-latency">
              {result ? `${formatNumber(result.latencyMs, 3)} ms` : '0 ms'}
            </span>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[520px] font-mono text-xs">
              <thead className="text-left text-[color:var(--color-text-muted)]">
                <tr>
                  <th className="py-2">Build</th>
                  <th>Score</th>
                  <th>Damage</th>
                </tr>
              </thead>
              <tbody>
                {(result?.builds ?? []).map((build) => (
                  <tr key={build.label} className="border-t border-[color:var(--color-border)]/50" data-testid="relic-core-result-row">
                    <td className="max-w-[260px] truncate py-2 text-[color:var(--color-text)]">{build.label}</td>
                    <td>{formatNumber(build.score, 2)}</td>
                    <td>{formatNumber(build.damageFactor, 2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-5">
            <h2 className={labelClass}>Efficient set</h2>
            <div className="mt-3 grid min-h-[120px] grid-cols-2 items-end gap-3 border-l border-b border-[color:var(--color-border)] px-3 py-2">
              {(result?.paretoSet ?? []).map((point, index) => (
                <div key={`${point.label}-${index}`} className="flex h-full flex-col justify-end" data-testid="relic-core-pareto-point">
                  <div
                    className="rounded-t bg-[color:var(--color-secondary)]"
                    style={{ height: `${Math.min(100, Math.max(18, point.damageFactor / 2))}%` }}
                    title={point.label}
                  />
                  <span className="mt-1 truncate font-mono text-[10px] text-[color:var(--color-text-muted)]">
                    {formatNumber(point.score, 0)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export function TwinbornAutoAssignSurface() {
  const bootStatus = useV3OptimizerBoot();
  const [availableChips, setAvailableChips] = useState(24);
  const [iterationCap, setIterationCap] = useState(10000);
  const [result, setResult] = useState<TwinbornAutoAssignResult | null>(null);
  const canRun = bootStatus === 'ok';

  return (
    <main className={shellClass} data-testid="twinborn-auto-assign">
      <header className={headerClass}>
        <div className="flex items-baseline justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">
              <span className="text-[color:var(--color-primary)]">Tangtang</span>{' '}
              <span className="text-[color:var(--color-text)]">/ twinborn</span>
            </h1>
            <BootLine status={bootStatus} />
          </div>
          <Link href="/v3" className={linkClass} data-testid="v3-hub-link">
            /v3
          </Link>
        </div>
      </header>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.6fr)]">
        <div className={panelClass}>
          <h2 className={labelClass}>Chip pool</h2>
          <div className="mt-3 grid gap-3">
            <label className="block text-sm text-[color:var(--color-text)]">
              <span className="text-xs text-[color:var(--color-text-muted)]">Available chips</span>
              <input
                className={inputClass + ' mt-1'}
                data-testid="twinborn-chip-pool"
                min={0}
                type="number"
                value={availableChips}
                onChange={(event) => setAvailableChips(Math.max(0, Number(event.target.value)))}
              />
            </label>
            <label className="block text-sm text-[color:var(--color-text)]">
              <span className="text-xs text-[color:var(--color-text-muted)]">Iteration cap</span>
              <input
                className={inputClass + ' mt-1'}
                data-testid="twinborn-iteration-cap"
                min={1}
                max={10000}
                type="number"
                value={iterationCap}
                onChange={(event) => setIterationCap(Math.max(1, Math.min(10000, Number(event.target.value))))}
              />
            </label>
          </div>
          <button
            type="button"
            className={buttonClass + ' mt-4 w-full'}
            data-testid="twinborn-auto-assign-run"
            disabled={!canRun}
            onClick={() =>
              setResult(
                twinbornAutoAssign(currentPlayerState(), {
                  availableChips,
                  iterationCap,
                  assignmentCount: 3,
                }),
              )
            }
          >
            Auto-Assign
          </button>
        </div>

        <div className={panelClass}>
          <div className="flex items-center justify-between gap-3">
            <h2 className={labelClass}>Assignments</h2>
            <span className="font-mono text-xs text-[color:var(--color-text-muted)]" data-testid="twinborn-iterations">
              {result ? `${result.iterations} / ${result.iterationCap}` : `0 / ${iterationCap}`}
            </span>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[520px] font-mono text-xs">
              <thead className="text-left text-[color:var(--color-text-muted)]">
                <tr>
                  <th className="py-2">Tech</th>
                  <th>Auto</th>
                  <th>Manual</th>
                  <th>Gain</th>
                </tr>
              </thead>
              <tbody>
                {(result?.assignments ?? []).map((assignment) => (
                  <tr key={assignment.techId} className="border-t border-[color:var(--color-border)]/50" data-testid="twinborn-assignment-row">
                    <td className="py-2 text-[color:var(--color-text)]">{assignment.techId}</td>
                    <td>{assignment.chips}</td>
                    <td>{assignment.manualChips}</td>
                    <td>{formatNumber(assignment.autoDamageGain, 3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2" data-testid="twinborn-comparison">
            <div className="rounded-md border border-[color:var(--color-border)] p-3">
              <p className={labelClass}>Manual</p>
              <p className="mt-2 font-mono text-lg text-[color:var(--color-text)]">
                {formatNumber((result?.assignments ?? []).reduce((sum, item) => sum + item.manualChips, 0), 0)}
              </p>
            </div>
            <div className="rounded-md border border-[color:var(--color-border)] p-3">
              <p className={labelClass}>Auto</p>
              <p className="mt-2 font-mono text-lg text-[color:var(--color-accent)]">
                {formatNumber((result?.assignments ?? []).reduce((sum, item) => sum + item.chips, 0), 0)}
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export function TechPartsOptimizerSurface() {
  const bootStatus = useV3OptimizerBoot();
  const storeState = useParetoStore();
  const playerState = useMemo(() => selectPlayerState(storeState), [storeState]);
  const [topK, setTopK] = useState(10);
  const beamWidth = 64;
  const maxExactNodes = 250000;
  const [accountContext, setAccountContext] = useState(DEFAULT_TECH_ACCOUNT_CONTEXT);
  const [profileImportText, setProfileImportText] = useState('');
  const [profileImportSummary, setProfileImportSummary] = useState('');
  const [resourceWallet, setResourceWallet] = useState<ResourceWalletValues>(DEFAULT_RESOURCE_WALLET_VALUES);
  const [rarityCounts, setRarityCounts] = useState(DEFAULT_RARITY_COUNTS);
  const [chips, setChips] = useState(40);
  const [skillSlots, setSkillSlots] = useState(4);
  const [overloadable, setOverloadable] = useState(false);
  const [maxOverload, setMaxOverload] = useState(4);
  const [speedMode, setSpeedMode] = useState('normal');
  const [limit, setLimit] = useState('basic');
  const candidatePreselectTopK = DEFAULT_CANDIDATE_PRESELECT_TOP_K;
  const [skillStatus, setSkillStatus] = useState(DEFAULT_SKILL_STATUS);
  const [result, setResult] = useState<TechOptimizerResult | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const inventory = useMemo<SioTechInventoryInput>(
    () => ({
      rarityCounts: Object.fromEntries(
        SIO_RARITY_FIELDS.flatMap((rarity) => {
          const count = Math.max(0, Math.trunc(rarityCounts[rarity] ?? 0));
          return count > 0 ? [[rarity, count] as const] : [];
        }),
      ),
      chips: Math.max(0, Math.trunc(chips)),
      skillSlots: Math.max(0, Math.trunc(skillSlots)),
      overloadable,
      ...(overloadable ? { maxOverload: Math.max(0, Math.trunc(maxOverload)) } : {}),
      modes: SIO_MODE_CHOICES.map(([mode]) => mode),
      forcedSkills: skillLabelsByStatus(skillStatus, 'locked'),
      preferredSkills: [],
      disabledSkills: skillLabelsByStatus(skillStatus, 'disabled'),
      speedMode,
      limit,
      candidatePreselectTopK: Math.max(1, Math.trunc(candidatePreselectTopK)),
    }),
    [candidatePreselectTopK, chips, limit, maxOverload, overloadable, rarityCounts, skillSlots, skillStatus, speedMode],
  );
  const inventoryValidation = useMemo(() => safeValidation(bootStatus, inventory), [bootStatus, inventory]);
  const topBuild = result?.builds?.[0];
  const topLoadout = buildLoadoutRows(topBuild);
  const topPresentedLoadout = presentTechLoadoutRows(topLoadout);
  const activeSkills = buildActiveSkills(topBuild);
  const chipRemainder = buildChipRemainder(topBuild);
  const canRun = bootStatus === 'ok' && inventoryValidation.valid && !running;
  const validationText = inventoryValidation.valid
    ? inventoryValidation.warnings.length > 0
      ? `Inventory valid / ${inventoryValidation.warnings.map(inventoryMessage).join(', ')}`
      : 'Inventory valid'
    : `Inventory blocked / ${inventoryValidation.errors.map(inventoryMessage).join(', ')}`;
  const playerStateForRun = useMemo(() => playerStateWithAccountContext(playerState, accountContext), [accountContext, playerState]);
  const sioLmContextForRun = useMemo(() => buildSioLmContext(accountContext), [accountContext]);
  const handleProfileImport = () => {
    const imported = parseProductProfileImport(profileImportText);
    if (!imported.ok) {
      setProfileImportSummary('Profile import failed. Check the JSON and try again.');
      return;
    }

    if (imported.wallet.techResonanceChips !== undefined) setChips(imported.wallet.techResonanceChips);
    else if (imported.tech.chips !== undefined) setChips(imported.tech.chips);
    if (imported.tech.skillSlots !== undefined) setSkillSlots(imported.tech.skillSlots);
    if (imported.tech.rarityCounts) {
      setRarityCounts((current) => ({
        ...current,
        ...imported.tech.rarityCounts,
      }));
    }
    setAccountContext((current) => ({
      ...current,
      ...Object.fromEntries(
        Object.entries(imported.account).filter(([, value]) => value !== undefined),
      ) as Partial<TechAccountContextInput>,
    }));
    setResourceWallet((current) => ({
      ...current,
      ...Object.fromEntries(
        Object.entries(imported.wallet).filter(([, value]) => value !== undefined),
      ) as Partial<ResourceWalletValues>,
    }));
    setProfileImportSummary(imported.summary);
  };

  return (
    <main className={shellClass} data-testid="tech-parts-optimizer">
      <header className={headerClass}>
        <div className="flex items-baseline justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">
              <span className="text-[color:var(--color-primary)]">Tangtang</span>{' '}
              <span className="text-[color:var(--color-text)]">/ tech parts</span>
            </h1>
            <BootLine status={bootStatus} />
          </div>
          <Link href="/v3" className={linkClass} data-testid="v3-hub-link">
            /v3
          </Link>
        </div>
      </header>

      <section className="grid min-w-0 gap-4 lg:grid-cols-[minmax(280px,0.95fr)_minmax(0,1.55fr)]">
        <div className="min-w-0 space-y-4">
          <ProfileImportPanel
            value={profileImportText}
            onChange={setProfileImportText}
            onImport={handleProfileImport}
            summary={profileImportSummary}
          />

          <ResourceWalletPanel
            values={{ ...resourceWallet, techResonanceChips: chips }}
            onChange={(id, value) => {
              if (id === 'techResonanceChips') {
                setChips(value);
                return;
              }
              setResourceWallet((current) => ({ ...current, [id]: value }));
            }}
          />

          <div className={panelClass} data-testid="tech-inventory-contract">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-[color:var(--color-text)]">Owned tech materials</h2>
                <p className="mt-1 text-xs text-[color:var(--color-text-muted)]">Sub-parts excluding equipped main parts</p>
              </div>
              <span
                className={`font-mono text-xs ${inventoryValidation.valid ? 'text-[color:var(--color-accent)]' : 'text-[color:var(--color-danger)]'}`}
                data-testid="tech-inventory-validation"
              >
                {validationText}
              </span>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block text-sm text-[color:var(--color-text)]">
                <span className="text-xs text-[color:var(--color-text-muted)]">Tech resonance chips</span>
                <input
                  className={inputClass + ' mt-1'}
                  data-testid="tech-inventory-chips"
                  min={0}
                  max={999}
                  type="number"
                  value={chips}
                  onChange={(event) => setChips(Math.max(0, Number(event.target.value)))}
                />
              </label>
              <label className="block text-sm text-[color:var(--color-text)]">
                <span className="text-xs text-[color:var(--color-text-muted)]">Active skills</span>
                <input
                  className={inputClass + ' mt-1'}
                  data-testid="tech-inventory-skill-slots"
                  min={1}
                  max={6}
                  type="number"
                  value={skillSlots}
                  onChange={(event) => setSkillSlots(Math.max(0, Number(event.target.value)))}
                />
              </label>
              <label className="block text-sm text-[color:var(--color-text)]">
                <span className="text-xs text-[color:var(--color-text-muted)]">Search depth</span>
                <select className={selectClass + ' mt-1'} value={speedMode} onChange={(event) => setSpeedMode(event.target.value)}>
                  {['fast', 'normal', 'precise', 'precise+', 'full'].map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm text-[color:var(--color-text)]">
                <span className="text-xs text-[color:var(--color-text-muted)]">Input mode</span>
                <select className={selectClass + ' mt-1'} value={limit} onChange={(event) => setLimit(event.target.value)}>
                  {['basic', 'advanced'].map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex min-h-[44px] items-center gap-3 text-sm text-[color:var(--color-text)]">
                <input
                  className={checkboxClass}
                  type="checkbox"
                  checked={overloadable}
                  onChange={(event) => setOverloadable(event.target.checked)}
                />
                <span>Overload</span>
              </label>
              <label className="block text-sm text-[color:var(--color-text)]">
                <span className="text-xs text-[color:var(--color-text-muted)]">Overload cap</span>
                <input
                  className={inputClass + ' mt-1'}
                  data-testid="tech-inventory-max-overload"
                  min={0}
                  max={18}
                  type="number"
                  value={maxOverload}
                  disabled={!overloadable}
                  onChange={(event) => setMaxOverload(Math.max(0, Number(event.target.value)))}
                />
              </label>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
              {SIO_RARITY_INPUTS.map((rarity) => (
                <label key={rarity.id} className="block text-sm text-[color:var(--color-text)]">
                  <span className="text-xs text-[color:var(--color-text-muted)]">{rarity.label}</span>
                  <input
                    className={inputClass + ' mt-1'}
                    min={0}
                    type="number"
                    value={rarityCounts[rarity.id]}
                    onChange={(event) =>
                      setRarityCounts((current) => ({
                        ...current,
                        [rarity.id]: Math.max(0, Number(event.target.value)),
                      }))
                    }
                  />
                </label>
              ))}
            </div>
          </div>

          <div className={panelClass}>
            <h2 className={labelClass}>Skill constraints</h2>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {SIO_MODE_CHOICES.map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  className={`min-h-[52px] rounded-md border px-3 py-2 text-left text-sm ${
                    skillStatus[mode] === 'disabled'
                      ? 'border-[color:var(--color-border)] bg-[color:var(--color-bg)] text-[color:var(--color-text-muted)]'
                      : skillStatus[mode] === 'locked'
                        ? 'border-[color:var(--color-primary)] bg-[color:var(--color-surface)] text-[color:var(--color-primary)]'
                        : 'border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-text)]'
                  }`}
                  data-testid={`tech-skill-status-${mode}`}
                  aria-label={`${label} ${SKILL_STATUS_LABEL[skillStatus[mode]]}`}
                  onClick={() =>
                    setSkillStatus((current) => ({
                      ...current,
                      [mode]: nextSkillStatus(current[mode]),
                    }))
                  }
                >
                  <span className="block truncate">{label}</span>
                  <span className="mt-1 block font-mono text-[11px] uppercase">{SKILL_STATUS_LABEL[skillStatus[mode]]}</span>
                </button>
              ))}
            </div>
          </div>

          <AccountContextPanel
            playerState={playerStateForRun}
            account={accountContext}
            onChange={(field, value) =>
              setAccountContext((current) => ({
                ...current,
                [field]: Number.isFinite(value) ? value : 0,
              }))
            }
          />

          <div className={panelClass}>
            <h2 className={labelClass}>Search</h2>
            <div className="mt-3 grid gap-3">
              <label className="block text-sm text-[color:var(--color-text)]">
                <span className="text-xs text-[color:var(--color-text-muted)]">Top builds</span>
                <input
                  className={inputClass + ' mt-1'}
                  data-testid="tech-optimizer-top-k"
                  min={1}
                  max={50}
                  type="number"
                  value={topK}
                  onChange={(event) => setTopK(Math.max(1, Math.min(50, Number(event.target.value))))}
                />
              </label>
            </div>
            <button
              type="button"
              className={buttonClass + ' mt-4 w-full'}
              data-testid="tech-optimizer-run"
              disabled={!canRun}
              onClick={async () => {
                setRunning(true);
                setRunError(null);
                try {
                  const worker = await getWorker();
                  const workerResult = await worker.optimizeTech({
                    playerState: playerStateForRun,
                    topK,
                    beamWidth,
                    maxExactNodes,
                    sioTechInventory: inventory,
                    sioLm: sioLmContextForRun,
                  });
                  setResult(workerResult);
                } catch (error) {
                  setRunError(error instanceof Error ? error.message : String(error));
                } finally {
                  setRunning(false);
                }
              }}
            >
              {running ? 'Running' : 'Run'}
            </button>
            {runError ? (
              <p className="mt-2 font-mono text-xs text-[color:var(--color-danger)]" data-testid="tech-optimizer-error">
                Optimizer run failed. Try different inputs.
              </p>
            ) : null}
          </div>
        </div>

        <div
          className={panelClass}
          data-testid="tech-optimizer-results"
          data-mode-used={result?.metrics.mode_used ?? 'idle'}
          data-scoring-model={result?.scope?.scoring_model ?? 'idle'}
          data-full-sio-equivalent={result?.scope?.full_sio_equivalent ? 'true' : 'false'}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className={labelClass}>Ranked tech builds</h2>
          </div>
          {result ? (
            <div className="mt-3 rounded-md border border-[color:var(--color-border)] p-3 text-sm text-[color:var(--color-text)]" data-testid="tech-optimizer-result-summary">
              <p className="font-semibold">Top build</p>
              <p className="mt-1 text-xs text-[color:var(--color-text-muted)]">
                {topPresentedLoadout[0]
                  ? `${topPresentedLoadout[0].partName} / ${topPresentedLoadout[0].modeName}`
                  : 'No parts selected'}
              </p>
              <p className="mt-2 font-mono text-xs">
                Chips left {chipRemainder} · Active skills {activeSkills}
              </p>
            </div>
          ) : (
            <div className="mt-3 rounded-md border border-dashed border-[color:var(--color-border)] p-3 text-sm text-[color:var(--color-text-muted)]" data-testid="tech-optimizer-empty-state">
              Run the optimizer to compare builds.
            </div>
          )}
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <div className="rounded-md border border-[color:var(--color-border)] p-3">
              <p className={labelClass}>First answer</p>
              <p className="mt-2 font-mono text-lg text-[color:var(--color-accent)]" data-testid="tech-optimizer-first-answer">
                {result ? `${formatNumber(result.metrics.first_answer_ms, 3)} ms` : '0 ms'}
              </p>
            </div>
            <div className="rounded-md border border-[color:var(--color-border)] p-3">
              <p className={labelClass}>Visited</p>
              <p className="mt-2 font-mono text-lg text-[color:var(--color-text)]" data-testid="tech-optimizer-visited">
                {result ? formatNumber(result.metrics.visited_nodes, 0) : '0'}
              </p>
            </div>
            <div className="rounded-md border border-[color:var(--color-border)] p-3">
              <p className={labelClass}>Chips left</p>
              <p className="mt-2 font-mono text-lg text-[color:var(--color-text)]" data-testid="tech-optimizer-chip-remainder">
                {result ? chipRemainder : 'n/a'}
              </p>
            </div>
          </div>
          <div className="mt-3 rounded-md border border-[color:var(--color-border)] p-3">
            <p className={labelClass}>Active skills</p>
            <p className="mt-2 break-words font-mono text-sm text-[color:var(--color-text)]" data-testid="tech-optimizer-active-skills">
              {result ? activeSkills : 'none'}
            </p>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[560px] font-mono text-xs">
              <thead className="text-left text-[color:var(--color-text-muted)]">
                <tr>
                  <th className="py-2">Build</th>
                  <th>Score</th>
                  <th>Damage</th>
                  <th>Chips left</th>
                  <th>Parts</th>
                </tr>
              </thead>
              <tbody>
                {(result?.builds ?? []).map((build, index) => (
                  <tr
                    key={`${build.label}-${index}`}
                    className="border-t border-[color:var(--color-border)]/50"
                    data-testid="tech-optimizer-result-row"
                    data-raw-label={build.label}
                  >
                    <td className="max-w-[260px] truncate py-2 text-[color:var(--color-text)]">{`Build ${index + 1}`}</td>
                    <td>{formatCompactScientific(build.score)}</td>
                    <td>{formatCompactScientific(build.damageFactor)}</td>
                    <td>{buildChipRemainder(build)}</td>
                    <td>{buildLoadoutRows(build).length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 grid gap-2">
            {topPresentedLoadout.map((row, index) => {
              return (
                <div
                  key={`${row.rawPartId}-${row.rawModeId}-${index}`}
                  className="grid gap-2 rounded-md border border-[color:var(--color-border)] p-3 font-mono text-xs sm:grid-cols-[1.2fr_1fr_0.9fr_0.7fr]"
                  data-testid="tech-optimizer-part-row"
                  data-part-id={row.rawPartId}
                  data-mode-id={row.rawModeId}
                >
                  <span className="truncate text-[color:var(--color-text)]">{row.partName}</span>
                  <span className="truncate">{row.modeName}</span>
                  <span>Chip allocation {formatNumber(row.chipAllocation, 0)}</span>
                  <span>Overload {formatNumber(row.overload, 0)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
