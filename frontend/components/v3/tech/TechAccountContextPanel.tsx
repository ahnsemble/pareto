'use client';

import {
  CATALOG_ONLY_COLLECTIBLE_ITEM_IDS,
  COLLECTIBLE_ITEM_INDEX,
  COLLECTIBLE_SET_INDEX,
  HERO_SCHEMA_INDEX,
  MOUNT_SCHEMA_INDEX,
  PET_SCHEMA_INDEX,
  SS_EQUIPMENT_SCHEMA_INDEX,
} from '../../../app/lib/pareto-store/schemas';
import type { ImportedCollectibleSnapshot } from '../../../app/lib/pareto-store/profile-import-types';
import type { PlayerState } from '../../../app/lib/pareto-store/types';
import { formatNumber, inputClass, labelClass, panelClass, selectClass } from '../optimizerUi';
import {
  collectibleItemReviewMarker,
  formatPassiveCritOptionLabel,
  formatTeamworkOptionLabel,
  guildExpeditionDebuffSummary,
  lmeTurfPresetLabel,
  mountReviewSummary,
  normalizePetAssistContext,
  petXenoStatusLabel,
  survivorContextSummary,
  type TechAccountContextInput,
  type TechAccountContextNamedField,
  type TechProfileModeId,
} from './techAccountContext';
import { getTechOptimizerCopy, localizeTechEntityName, type TechEntityNameKind } from './techLocaleCopy';

const CATALOG_ONLY_COLLECTIBLE_ITEM_ID_SET = new Set<string>(CATALOG_ONLY_COLLECTIBLE_ITEM_IDS);
const SOURCE_BACKED_COLLECTIBLE_ITEM_OPTIONS = COLLECTIBLE_ITEM_INDEX.filter(
  (item) => !item.id.startsWith('event') && !CATALOG_ONLY_COLLECTIBLE_ITEM_ID_SET.has(item.id),
);
const TARGET_COLLECTIBLE_OPTIONS = SOURCE_BACKED_COLLECTIBLE_ITEM_OPTIONS;
const SOURCE_BACKED_COLLECTIBLE_ITEM_ID_SET = new Set(SOURCE_BACKED_COLLECTIBLE_ITEM_OPTIONS.map((item) => item.id));

function contextNumber(value: number | null | undefined, digits = 0): string {
  return typeof value === 'number' && Number.isFinite(value) ? formatNumber(value, digits) : '0';
}

function contextLabel(value: string | null | undefined, emptyLabel = 'none'): string {
  return value && value.trim().length > 0 ? value : emptyLabel;
}

function displayNameById<T extends { id: string; display_name_en: string; display_name_ko?: string }>(
  kind: TechEntityNameKind,
  rows: readonly T[],
  id: string | null | undefined,
  locale: string | undefined,
  fallback = 'Unknown',
): string {
  const row = rows.find((candidate) => candidate.id === id);
  if (!row) return fallback;
  if (locale === 'ko' && row.display_name_ko && row.display_name_ko !== row.display_name_en) {
    return row.display_name_ko;
  }
  return localizeTechEntityName(kind, row.display_name_en, locale);
}

type AccountContextField = {
  id: keyof TechAccountContextInput;
  label: string;
  testId: string;
  min: number;
  max?: number;
  step?: number;
};

type AccountContextSection = {
  title: string;
  detailLabel?: string;
  fields: AccountContextField[];
  summary?: Array<[string, string]>;
};

type CollectibleSnapshotItem = ImportedCollectibleSnapshot['items'][number];
type CollectibleVisualTone = 'target' | 'custom' | 'red' | 'gold' | 'review';

const collectibleToneClass: Record<CollectibleVisualTone, string> = {
  target: 'border-[color:var(--color-primary)] bg-[color:var(--color-primary)]/15 text-[color:var(--color-primary)]',
  custom: 'border-orange-400/80 bg-orange-400/15 text-orange-200',
  red: 'border-red-400/80 bg-red-500/15 text-red-200',
  gold: 'border-amber-300/80 bg-amber-300/15 text-amber-100',
  review: 'border-[color:var(--color-border)] bg-[color:var(--color-bg)] text-[color:var(--color-text-muted)]',
};

const turfColorTokens = [
  { id: 'red', label: 'Red', className: 'border-red-400/80 bg-red-500/15 text-red-200' },
  { id: 'yellow', label: 'Yellow', className: 'border-amber-300/80 bg-amber-300/15 text-amber-100' },
  { id: 'black', label: 'Black', className: 'border-zinc-500/80 bg-zinc-950 text-zinc-200' },
] as const;

function collectibleInitials(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  const initials = words.slice(0, 2).map((word) => word[0] ?? '').join('');
  return (initials || name.slice(0, 2)).toUpperCase();
}

function collectibleTone(isTarget: boolean, snapshotItem: CollectibleSnapshotItem | undefined): CollectibleVisualTone {
  if (isTarget) return 'target';
  if ((snapshotItem?.customSetLevel ?? 0) > 0) return 'custom';
  const stars = snapshotItem?.stars;
  if (typeof stars === 'number' && stars >= 6) return 'red';
  if (typeof stars === 'number' && stars > 0) return 'gold';
  return 'review';
}

function collectibleStatusLabel({
  isTarget,
  locale,
  snapshotItem,
}: {
  isTarget: boolean;
  locale: string | undefined;
  snapshotItem: CollectibleSnapshotItem | undefined;
}): string {
  if (isTarget) return collectibleItemReviewMarker(true, locale);
  const parts: string[] = [];
  if (typeof snapshotItem?.stars === 'number' && Number.isFinite(snapshotItem.stars)) {
    parts.push(locale === 'ko' ? `${snapshotItem.stars}성` : `${snapshotItem.stars} stars`);
  }
  if (typeof snapshotItem?.customSetLevel === 'number' && snapshotItem.customSetLevel > 0) {
    parts.push(locale === 'ko' ? `커스텀 ${snapshotItem.customSetLevel}` : `Custom ${snapshotItem.customSetLevel}`);
  }
  return parts.length > 0 ? parts.join(' / ') : collectibleItemReviewMarker(false, locale);
}

function buildCollectibleSnapshotById(snapshot: ImportedCollectibleSnapshot | null | undefined): Map<string, CollectibleSnapshotItem> {
  const output = new Map<string, CollectibleSnapshotItem>();
  for (const item of snapshot?.items ?? []) {
    const row = COLLECTIBLE_ITEM_INDEX[item.itemIndex];
    if (!row || !SOURCE_BACKED_COLLECTIBLE_ITEM_ID_SET.has(row.id)) continue;
    output.set(row.id, item);
  }
  return output;
}

function normalizeControlValue(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function AccountNumberControl({
  field,
  onChange,
  value,
}: {
  field: AccountContextField;
  value: number;
  onChange: (field: keyof TechAccountContextInput, value: number) => void;
}) {
  const step = field.step ?? 1;
  const hasSlider = typeof field.max === 'number' && Number.isFinite(field.max);
  const sliderMax = hasSlider ? Math.max(field.max ?? field.min, value, field.min) : undefined;
  const sliderValue = hasSlider && sliderMax !== undefined ? Math.min(Math.max(value, field.min), sliderMax) : value;
  const setValue = (nextValue: number) => onChange(field.id, Number.isFinite(nextValue) ? Math.max(field.min, nextValue) : field.min);

  return (
    <label className="block text-sm text-[color:var(--color-text)]">
      <span className="text-xs text-[color:var(--color-text-muted)]">{field.label}</span>
      <input
        className={inputClass + ' mt-1'}
        data-testid={field.testId}
        min={field.min}
        max={field.max}
        step={step}
        type="number"
        value={value}
        onChange={(event) => setValue(Number(event.target.value))}
      />
      {hasSlider && sliderMax !== undefined ? (
        <input
          aria-label={`${field.label} slider`}
          className="mt-2 h-2 w-full cursor-pointer"
          data-testid={`${field.testId}-slider`}
          min={field.min}
          max={sliderMax}
          step={step}
          type="range"
          value={sliderValue}
          onChange={(event) => setValue(Number(event.target.value))}
          style={{ accentColor: 'var(--color-primary)' }}
        />
      ) : null}
    </label>
  );
}

export function AccountContextPanel({
  playerState,
  account,
  onChange,
  onNamedChange,
  locale,
  profileSlotId = 'endersEcho',
  importedCollectibleSnapshot = null,
}: {
  playerState: PlayerState;
  account: TechAccountContextInput;
  onChange: (field: keyof TechAccountContextInput, value: number) => void;
  onNamedChange: (field: TechAccountContextNamedField, value: string) => void;
  locale?: string;
  profileSlotId?: TechProfileModeId;
  importedCollectibleSnapshot?: ImportedCollectibleSnapshot | null;
}) {
  const copy = getTechOptimizerCopy(locale);
  const labels = copy.account.labels;
  const equipment = playerState.equipment;
  const selectedHeroName = displayNameById('hero', HERO_SCHEMA_INDEX, playerState.hero.selected_hero_id, locale, copy.account.selectedSurvivorFallback);
  const deployedPetName = displayNameById('pet', PET_SCHEMA_INDEX, playerState.pet.deployed_pet_id, locale, copy.account.petFallback);
  const selectedCollectibleName = displayNameById('collectibleItem', SOURCE_BACKED_COLLECTIBLE_ITEM_OPTIONS, playerState.collectible.target_collectible_id, locale, copy.account.selectedCollectibleFallback);
  const selectedMountName = displayNameById('mount', MOUNT_SCHEMA_INDEX, account.selectedMountId, locale, copy.account.selectedMountFallback);
  const collectionRows = COLLECTIBLE_SET_INDEX;
  const collectibleSnapshotById = buildCollectibleSnapshotById(importedCollectibleSnapshot);
  const petRows = PET_SCHEMA_INDEX.slice(0, 5);
  const mountRows = MOUNT_SCHEMA_INDEX.slice(0, 3);
  const assistPet1Rows = petRows.filter((pet) => pet.id !== account.deployedPetId && pet.id !== account.assistPet2Id);
  const assistPet2Rows = petRows.filter((pet) => pet.id !== account.deployedPetId && pet.id !== account.assistPet1Id);
  const updatePetSelection = (patch: Partial<TechAccountContextInput>) => {
    const next = normalizePetAssistContext({ ...account, ...patch });
    if (next.deployedPetId !== account.deployedPetId) onNamedChange('deployedPetId', next.deployedPetId);
    if (next.assistPet1Id !== account.assistPet1Id) onNamedChange('assistPet1Id', next.assistPet1Id);
    if (next.assistPet2Id !== account.assistPet2Id) onNamedChange('assistPet2Id', next.assistPet2Id);
    if (next.petAssistPets !== account.petAssistPets) onChange('petAssistPets', next.petAssistPets);
  };
  const activeConditionCount = [
    account.shieldDamage,
    account.poisonedDamage,
    account.weakenedDamage,
    account.chilledDamage,
    account.lacerationDamage,
  ].filter((value) => value > 0).length;
  const reviewOnlyCount = [
    account.petAtk,
    account.movementSpeed,
    account.movementSpeedCap,
  ].filter((value) => value > 0).length;
  const summaryRows: Array<[string, string]> = [
    [copy.account.summary.finalAtk, contextNumber(account.finalAtk)],
    [copy.account.summary.crit, `${contextNumber(account.critRate)} / ${contextNumber(account.critDamage)}`],
    [copy.account.summary.conditions, contextNumber(activeConditionCount)],
    [copy.account.summary.review, contextNumber(reviewOnlyCount)],
  ];
  const equipmentSlotSections: Array<{
    id: 'weapon' | 'armor' | 'necklace' | 'belt' | 'gloves' | 'boots';
    label: string;
    itemField: TechAccountContextNamedField;
    fields: Array<{ id: keyof TechAccountContextInput; label: string; testId: string; min: number; max?: number }>;
  }> = [
    {
      id: 'weapon',
      label: labels.weapon,
      itemField: 'weaponItemId',
      fields: [
        { id: 'weaponEaf', label: 'EAF', testId: 'tech-account-weapon-eaf', min: 0, max: 5 },
        { id: 'weaponVaf', label: 'VAF', testId: 'tech-account-weapon-vaf', min: 0, max: 5 },
        { id: 'weaponChaos', label: 'Chaos', testId: 'tech-account-weapon-chaos', min: 0, max: 10 },
        { id: 'weaponXeno', label: 'Xeno', testId: 'tech-account-weapon-xeno', min: 0, max: 13 },
      ],
    },
    {
      id: 'armor',
      label: labels.armor,
      itemField: 'armorItemId',
      fields: [
        { id: 'armorEaf', label: 'EAF', testId: 'tech-account-armor-eaf', min: 0, max: 5 },
        { id: 'armorVaf', label: 'VAF', testId: 'tech-account-armor-vaf', min: 0, max: 5 },
        { id: 'armorChaos', label: 'Chaos', testId: 'tech-account-armor-chaos', min: 0, max: 10 },
        { id: 'armorXeno', label: 'Xeno', testId: 'tech-account-armor-xeno', min: 0, max: 13 },
      ],
    },
    {
      id: 'necklace',
      label: labels.necklace,
      itemField: 'necklaceItemId',
      fields: [
        { id: 'necklaceEaf', label: 'EAF', testId: 'tech-account-necklace-eaf', min: 0, max: 5 },
        { id: 'necklaceVaf', label: 'VAF', testId: 'tech-account-necklace-vaf', min: 0, max: 5 },
        { id: 'necklaceChaos', label: 'Chaos', testId: 'tech-account-necklace-chaos', min: 0, max: 10 },
        { id: 'necklaceXeno', label: 'Xeno', testId: 'tech-account-necklace-xeno', min: 0, max: 13 },
      ],
    },
    {
      id: 'belt',
      label: labels.belt,
      itemField: 'beltItemId',
      fields: [
        { id: 'beltEaf', label: 'EAF', testId: 'tech-account-belt-eaf', min: 0, max: 5 },
        { id: 'beltVaf', label: 'VAF', testId: 'tech-account-belt-vaf', min: 0, max: 5 },
        { id: 'beltChaos', label: 'Chaos', testId: 'tech-account-belt-chaos', min: 0, max: 10 },
        { id: 'beltXeno', label: 'Xeno', testId: 'tech-account-belt-xeno', min: 0, max: 13 },
      ],
    },
    {
      id: 'gloves',
      label: labels.gloves,
      itemField: 'glovesItemId',
      fields: [
        { id: 'glovesEaf', label: 'EAF', testId: 'tech-account-gloves-eaf', min: 0, max: 5 },
        { id: 'glovesVaf', label: 'VAF', testId: 'tech-account-gloves-vaf', min: 0, max: 5 },
        { id: 'glovesChaos', label: 'Chaos', testId: 'tech-account-gloves-chaos', min: 0, max: 10 },
        { id: 'glovesXeno', label: 'Xeno', testId: 'tech-account-gloves-xeno', min: 0, max: 13 },
      ],
    },
    {
      id: 'boots',
      label: labels.boots,
      itemField: 'bootsItemId',
      fields: [
        { id: 'bootsEaf', label: 'EAF', testId: 'tech-account-boots-eaf', min: 0, max: 5 },
        { id: 'bootsVaf', label: 'VAF', testId: 'tech-account-boots-vaf', min: 0, max: 5 },
        { id: 'bootsChaos', label: 'Chaos', testId: 'tech-account-boots-chaos', min: 0, max: 10 },
        { id: 'bootsXeno', label: 'Xeno', testId: 'tech-account-boots-xeno', min: 0, max: 13 },
      ],
    },
  ];
  const guildExpeditionSections: AccountContextSection[] = profileSlotId === 'guildExpedition'
    ? [
        {
          title: labels.guildExpedition,
          detailLabel: labels.guildExpeditionDetail,
          fields: [
            {
              id: 'guildExpeditionTestaments',
              label: labels.guildExpeditionTestaments,
              testId: 'tech-account-guild-expedition-testaments',
              min: 0,
              max: 100000,
            },
          ],
          summary: [[labels.guildExpeditionDebuff, guildExpeditionDebuffSummary(account, locale)]],
        },
      ]
    : [];
  const sections: AccountContextSection[] = [
    {
      title: labels.buildStats,
      fields: [
        { id: 'baseAtk', label: labels.baseAtk, testId: 'tech-account-base-atk', min: 0, step: 1 },
        { id: 'finalAtk', label: labels.finalAtk, testId: 'tech-account-final-atk', min: 0, step: 1 },
        { id: 'atkPercent', label: labels.atkPercent, testId: 'tech-account-atk-percent', min: 0, max: 5000 },
        { id: 'critRate', label: labels.critRate, testId: 'tech-account-crit-rate', min: 0, max: 1000 },
        { id: 'critDamage', label: labels.critDamage, testId: 'tech-account-crit-damage', min: 0, max: 5000 },
        { id: 'skillDamage', label: labels.skillDamage, testId: 'tech-account-skill-damage', min: 0, max: 5000 },
      ],
      summary: [[labels.mode, playerState.damage.combat_mode.toUpperCase()]],
    },
    {
      title: labels.damageConditions,
      fields: [
        { id: 'shieldDamage', label: labels.shieldDamage, testId: 'tech-account-shield-damage', min: 0, max: 5000, step: 0.5 },
        { id: 'poisonedDamage', label: labels.poisonedTarget, testId: 'tech-account-poisoned-damage', min: 0, max: 5000, step: 0.5 },
        { id: 'weakenedDamage', label: labels.weakenedTarget, testId: 'tech-account-weakened-damage', min: 0, max: 5000, step: 0.5 },
        { id: 'chilledDamage', label: labels.chilledTarget, testId: 'tech-account-chilled-damage', min: 0, max: 5000, step: 0.5 },
        { id: 'lacerationDamage', label: labels.laceratedTarget, testId: 'tech-account-laceration-damage', min: 0, max: 5000, step: 0.5 },
      ],
    },
    ...guildExpeditionSections,
    {
      title: labels.collections,
      detailLabel: labels.collectionDetail,
      fields: [
        { id: 'collectionSets', label: labels.setProgress, testId: 'tech-account-collection-sets', min: 0, max: 38 },
        { id: 'collectionStars', label: labels.setStars, testId: 'tech-account-collection-stars', min: 0 },
        { id: 'collectionYellowStars', label: labels.setYellowStars, testId: 'tech-account-collection-yellow-stars', min: 0 },
        { id: 'customCollectionSets', label: labels.customSets, testId: 'tech-account-collection-custom-sets', min: 0 },
      ],
      summary: [
        [labels.customSets, contextNumber(playerState.collectible.custom_collection_slots)],
        [labels.collectorHeart, contextNumber(playerState.collectible.advanced_collector_heart_level)],
      ],
    },
    {
      title: labels.survivors,
      detailLabel: labels.survivorDetail,
      fields: [
        { id: 'survivorLevel', label: labels.level, testId: 'tech-account-survivor-level', min: 1, max: 120 },
        { id: 'survivorStar', label: labels.star, testId: 'tech-account-survivor-star', min: 0, max: 8 },
        { id: 'survivorAwakening', label: labels.awakening, testId: 'tech-account-survivor-awakening', min: 0, max: 8 },
        { id: 'survivorTeamwork', label: labels.teamworkSlots, testId: 'tech-account-survivor-teamwork', min: 0, max: 4 },
        { id: 'survivorPassiveCrit', label: labels.passiveCritRate, testId: 'tech-account-survivor-passive', min: 0, max: 1000 },
      ],
      summary: [
        [labels.main, contextLabel(playerState.hero.selected_hero_id, copy.common.none)],
        [labels.teamwork, contextNumber(playerState.hero.teamwork_slots_unlocked)],
      ],
    },
    {
      title: labels.petAwakening,
      detailLabel: labels.petDetail,
      fields: [
        { id: 'petAwakening', label: labels.awakening, testId: 'tech-account-pet-awakening', min: 0, max: 8 },
        { id: 'petAssistPets', label: labels.assistPets, testId: 'tech-account-pet-assist-pets', min: 0, max: 2 },
        { id: 'petXeno', label: labels.xeno, testId: 'tech-account-pet-xeno', min: 0, max: 1 },
        { id: 'petResonanceChance', label: labels.resonanceChance, testId: 'tech-account-pet-resonance-chance', min: 0, max: 100 },
        { id: 'petResonanceAtk', label: labels.resonanceAtk, testId: 'tech-account-pet-resonance-atk', min: 0 },
      ],
      summary: [
        [labels.mainPet, contextLabel(playerState.pet.deployed_pet_id, copy.common.none)],
        [labels.xeno, playerState.pet.deployed_is_xeno ? (locale === 'ko' ? '켜짐' : 'on') : locale === 'ko' ? '꺼짐' : 'off'],
      ],
    },
    {
      title: labels.movementAndPetTotals,
      fields: [
        { id: 'petAtk', label: labels.petAtk, testId: 'tech-account-pet-atk', min: 0, step: 1 },
        { id: 'otherworldPetSyncRate', label: labels.otherworldPetSync, testId: 'tech-account-otherworld-pet-sync-rate', min: 0, max: 5000, step: 0.5 },
        { id: 'movementSpeed', label: labels.movementSpeed, testId: 'tech-account-movement-speed', min: 0, max: 1000, step: 0.5 },
        { id: 'movementSpeedCap', label: labels.movementSpeedCap, testId: 'tech-account-movement-speed-cap', min: 0, max: 1000, step: 0.5 },
      ],
    },
    {
      title: labels.mounts,
      detailLabel: labels.mountDetail,
      fields: [
        { id: 'mountCores', label: labels.mountCores, testId: 'tech-account-mount-cores', min: 0 },
        { id: 'mountPuzzleSlots', label: labels.puzzleSlots, testId: 'tech-account-mount-puzzle', min: 0 },
        { id: 'mountStatInputs', label: labels.mountStatInputs, testId: 'tech-account-mount-stat', min: 0, max: 5000 },
        { id: 'mountAtk', label: labels.mountAtk, testId: 'tech-account-mount-atk', min: 0, max: 5000 },
        { id: 'mountSkillDamage', label: labels.mountSkillDamage, testId: 'tech-account-mount-skill', min: 0, max: 5000 },
      ],
    },
    {
      title: labels.equipmentForging,
      detailLabel: labels.sixSlotEquipment,
      fields: [
        { id: 'equipmentOtherworldCores', label: labels.otherworldForgeCores, testId: 'tech-account-equipment-otherworld-cores', min: 0 },
      ],
      summary: [
        [labels.weapon, contextLabel(equipment.weapon.item_id, copy.common.none)],
        [labels.designs, contextNumber(equipment.weapon.designs_owned)],
      ],
    },
    {
      title: labels.lunarMine,
      fields: [
        { id: 'lmeTurf', label: labels.turfNodes, testId: 'tech-account-lme-turf', min: 0 },
      ],
      summary: [
        [labels.phase, playerState.lme.battle_phase],
        [labels.playerMedals, contextNumber(playerState.lme.player_medals)],
        [labels.opponentMedals, contextNumber(playerState.lme.opponent_medals)],
      ],
    },
  ];
  const wideSectionTitles = new Set([labels.collections, labels.equipmentForging]);

  return (
    <div className={panelClass} data-testid="tech-account-context">
      <h2 className={labelClass}>{copy.account.title}</h2>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4" data-testid="tech-account-summary">
        {summaryRows.map(([label, value]) => (
          <div key={label} className="rounded-md border border-[color:var(--color-border)]/60 p-2">
            <p className="text-[10px] uppercase text-[color:var(--color-text-muted)]">{label}</p>
            <p className="mt-1 truncate font-mono text-sm text-[color:var(--color-text)]">{value}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 grid items-start gap-3 text-xs text-[color:var(--color-text-muted)] md:grid-cols-2 xl:grid-cols-4" data-testid="tech-account-section-grid">
        {sections.map((section) => (
          <section
            key={section.title}
            className={`min-w-0 rounded-md border border-[color:var(--color-border)]/60 p-3 ${wideSectionTitles.has(section.title) ? 'xl:col-span-2' : ''}`}
          >
            <h3 className="text-xs font-semibold uppercase text-[color:var(--color-text)]">{section.title}</h3>
            {section.detailLabel ? <p className="mt-1 text-xs text-[color:var(--color-text-muted)]">{section.detailLabel}</p> : null}
            {section.title === labels.collections ? (
              <div className="mt-2 grid gap-2" data-testid="tech-collection-named-editor">
                <label className="block text-sm text-[color:var(--color-text)]">
                  <span className="text-xs text-[color:var(--color-text-muted)]">{labels.targetCollectible}</span>
                  <select
                    className={selectClass + ' mt-1'}
                    data-testid="tech-collection-target-select"
                    value={account.targetCollectibleId}
                    onChange={(event) => onNamedChange('targetCollectibleId', event.target.value)}
                  >
                    <option value="">{copy.common.none}</option>
                    {TARGET_COLLECTIBLE_OPTIONS.map((item) => (
                      <option key={item.id} value={item.id}>
                        {localizeTechEntityName('collectibleItem', item.display_name_en, locale)}
                      </option>
                    ))}
                  </select>
                  <span
                    className="mt-1 block text-xs text-[color:var(--color-text-muted)]"
                    data-testid="tech-collection-selected-target"
                  >
                    {copy.account.selectedTargetPrefix}: {selectedCollectibleName}
                  </span>
                </label>
                <div className="grid max-h-52 gap-2 overflow-y-auto pr-1 sm:grid-cols-2" data-testid="tech-collection-set-editor">
                  {collectionRows.map((set) => (
                    <div
                      key={set.id}
                      className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 rounded-md border border-[color:var(--color-border)]/60 p-2 text-xs"
                      data-testid="tech-collection-named-row"
                    >
                      <span className="truncate text-[color:var(--color-text)]">{localizeTechEntityName('collectibleSet', set.display_name_en, locale)}</span>
                      <span className="font-mono text-[color:var(--color-text-muted)]">{labels.set} {set.collectible_count}</span>
                    </div>
                  ))}
                </div>
                <div className="grid max-h-72 gap-2 overflow-y-auto pr-1 sm:grid-cols-2 xl:grid-cols-3" data-testid="tech-collection-item-editor">
                  {SOURCE_BACKED_COLLECTIBLE_ITEM_OPTIONS.map((item) => {
                    const snapshotItem = collectibleSnapshotById.get(item.id);
                    const isTarget = account.targetCollectibleId === item.id;
                    const tone = collectibleTone(isTarget, snapshotItem);
                    const itemName = localizeTechEntityName('collectibleItem', item.display_name_en, locale);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={`grid min-h-[44px] grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-2 rounded-md border p-2 text-left text-xs ${
                          isTarget ? 'border-[color:var(--color-primary)]/70 bg-[color:var(--color-primary)]/10' : 'border-[color:var(--color-border)]/60'
                        }`}
                        data-testid="tech-collection-item-row"
                        onClick={() => onNamedChange('targetCollectibleId', item.id)}
                      >
                        <span
                          aria-hidden="true"
                          className={`inline-flex h-8 w-8 items-center justify-center rounded-md border font-mono text-[10px] font-semibold ${collectibleToneClass[tone]}`}
                          data-testid="tech-collection-item-icon"
                        >
                          {collectibleInitials(item.display_name_en)}
                        </span>
                        <span className="truncate text-[color:var(--color-text)]">{itemName}</span>
                        <span className="font-mono text-[color:var(--color-text-muted)]" data-testid="tech-collection-item-status">
                          {collectibleStatusLabel({ isTarget, locale, snapshotItem })}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
            {section.title === labels.survivors ? (
              <div className="mt-2 grid gap-2">
                <div
                  className="rounded-md border border-[color:var(--color-border)]/60 p-2 text-xs text-[color:var(--color-text)]"
                  data-testid="tech-survivor-selector"
                >
                  <label className="block text-sm text-[color:var(--color-text)]">
                    <span className="text-xs text-[color:var(--color-text-muted)]">{labels.selectedSurvivor}</span>
                    <select
                      className={selectClass + ' mt-1'}
                      data-testid="tech-survivor-select"
                      value={account.selectedHeroId}
                      onChange={(event) => onNamedChange('selectedHeroId', event.target.value)}
                    >
                      {HERO_SCHEMA_INDEX.map((hero) => (
                        <option key={hero.id} value={hero.id}>
                          {localizeTechEntityName('hero', hero.display_name_en, locale)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <span className="mt-2 block font-semibold" data-testid="tech-survivor-selected-name">
                    {selectedHeroName}
                  </span>
                </div>
                <div
                  className="grid gap-2 sm:grid-cols-2"
                  data-testid="tech-teamwork-passive-picker"
                >
                  <div className="rounded-md border border-[color:var(--color-border)]/60 p-2 text-xs" data-testid="tech-teamwork-row">
                    <label className="block text-sm text-[color:var(--color-text)]">
                      <span className="text-xs text-[color:var(--color-text-muted)]">{labels.teamworkPassive}</span>
                      <select
                        className={selectClass + ' mt-1'}
                        data-testid="tech-teamwork-select"
                        value={account.survivorTeamwork}
                        onChange={(event) => onChange('survivorTeamwork', Number(event.target.value))}
                      >
                        {[0, 1, 2, 3, 4].map((value) => (
                          <option key={value} value={value}>
                            {formatTeamworkOptionLabel(value, locale)}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="rounded-md border border-[color:var(--color-border)]/60 p-2 text-xs" data-testid="tech-passive-row">
                    <label className="block text-sm text-[color:var(--color-text)]">
                      <span className="text-xs text-[color:var(--color-text-muted)]">{labels.passiveCrit}</span>
                      <select
                        className={selectClass + ' mt-1'}
                        data-testid="tech-passive-select"
                        value={account.survivorPassiveCrit}
                        onChange={(event) => onChange('survivorPassiveCrit', Number(event.target.value))}
                      >
                        {[0, 6, 12, 18, 24].map((value) => (
                          <option key={value} value={value}>
                            {formatPassiveCritOptionLabel(value, locale)}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>
                <p className="text-xs text-[color:var(--color-text-muted)]" data-testid="tech-survivor-context-summary">
                  {selectedHeroName} / {survivorContextSummary(account, locale)}
                </p>
              </div>
            ) : null}
            {section.title === labels.petAwakening ? (
              <div className="mt-2 grid gap-2" data-testid="tech-pet-selector">
                <div className="rounded-md border border-[color:var(--color-border)]/60 p-2 text-xs text-[color:var(--color-text)]">
                  <label className="block text-sm text-[color:var(--color-text)]">
                    <span className="text-xs text-[color:var(--color-text-muted)]">{labels.deployedPet}</span>
                    <select
                      className={selectClass + ' mt-1'}
                      data-testid="tech-pet-deployed-select"
                      value={account.deployedPetId}
                      onChange={(event) => updatePetSelection({ deployedPetId: event.target.value })}
                    >
                      {PET_SCHEMA_INDEX.map((pet) => (
                        <option key={pet.id} value={pet.id}>
                          {localizeTechEntityName('pet', pet.display_name_en, locale)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <span className="mt-2 block font-semibold">{deployedPetName}</span>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="rounded-md border border-[color:var(--color-border)]/60 p-2 text-xs" data-testid="tech-pet-assist-1">
                    <label className="block text-sm text-[color:var(--color-text)]">
                      <span className="text-xs text-[color:var(--color-text-muted)]">{labels.assist1}</span>
                      <select
                        className={selectClass + ' mt-1'}
                        data-testid="tech-pet-assist-1-select"
                        value={account.assistPet1Id}
                        onChange={(event) => updatePetSelection({ assistPet1Id: event.target.value })}
                      >
                        <option value="">{copy.common.none}</option>
                        {assistPet1Rows.map((pet) => (
                          <option key={pet.id} value={pet.id}>
                            {localizeTechEntityName('pet', pet.display_name_en, locale)}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="rounded-md border border-[color:var(--color-border)]/60 p-2 text-xs" data-testid="tech-pet-assist-2">
                    <label className="block text-sm text-[color:var(--color-text)]">
                      <span className="text-xs text-[color:var(--color-text-muted)]">{labels.assist2}</span>
                      <select
                        className={selectClass + ' mt-1'}
                        data-testid="tech-pet-assist-2-select"
                        value={account.assistPet2Id}
                        onChange={(event) => updatePetSelection({ assistPet2Id: event.target.value })}
                      >
                        <option value="">{copy.common.none}</option>
                        {assistPet2Rows.map((pet) => (
                          <option key={pet.id} value={pet.id}>
                            {localizeTechEntityName('pet', pet.display_name_en, locale)}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>
                <div className="rounded-md border border-[color:var(--color-border)]/60 p-2 text-xs" data-testid="tech-pet-xeno-status">
                  {petXenoStatusLabel(account, locale)}
                </div>
              </div>
            ) : null}
            {section.title === labels.mounts ? (
              <div className="mt-2 grid gap-2" data-testid="tech-mount-puzzle-editor">
                <label className="block rounded-md border border-[color:var(--color-border)]/60 p-2 text-sm text-[color:var(--color-text)]">
                  <span className="text-xs text-[color:var(--color-text-muted)]">{labels.selectedMount}</span>
                  <select
                    className={selectClass + ' mt-1'}
                    data-testid="tech-mount-select"
                    value={account.selectedMountId}
                    onChange={(event) => onNamedChange('selectedMountId', event.target.value)}
                  >
                    {MOUNT_SCHEMA_INDEX.map((mount) => (
                      <option key={mount.id} value={mount.id}>
                        {localizeTechEntityName('mount', mount.display_name_en, locale)}
                      </option>
                    ))}
                  </select>
                  <span
                    className="mt-2 block text-xs font-semibold text-[color:var(--color-text)]"
                    data-testid="tech-mount-selected-name"
                  >
                    {selectedMountName}
                  </span>
                </label>
                <p className="text-xs text-[color:var(--color-text-muted)]" data-testid="tech-mount-review-summary">
                  {mountReviewSummary(account, locale)}
                </p>
                {mountRows.map((mount, index) => (
                  <div
                    key={mount.id}
                    className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 rounded-md border border-[color:var(--color-border)]/60 p-2 text-xs"
                    data-testid="tech-mount-puzzle-row"
                  >
                    <span className="truncate text-[color:var(--color-text)]">{localizeTechEntityName('mount', mount.display_name_en, locale)}</span>
                    <span className="font-mono text-[color:var(--color-text-muted)]">{labels.puzzle} {index + 1}</span>
                  </div>
                ))}
              </div>
            ) : null}
            {section.title === labels.lunarMine ? (
              <div className="mt-2 grid gap-2" data-testid="tech-lme-turf-visual">
                <div className="grid grid-cols-3 gap-2" data-testid="tech-lme-turf-color-legend">
                  {turfColorTokens.map((token) => (
                    <span
                      key={token.id}
                      className={`inline-flex min-h-[32px] items-center justify-center rounded-md border px-2 py-1 font-mono text-[10px] uppercase ${token.className}`}
                      data-testid="tech-lme-turf-color-token"
                    >
                      {locale === 'ko'
                        ? token.id === 'red'
                          ? '빨강'
                          : token.id === 'yellow'
                            ? '노랑'
                            : '검정'
                        : token.label}
                    </span>
                  ))}
                </div>
                <div className="grid grid-cols-5 gap-2" data-testid="tech-lme-turf-presets">
                  {[0, 3, 6, 9, 12].map((value) => (
                    <button
                      key={value}
                      type="button"
                      className={`rounded-md border px-2 py-1 text-xs ${
                        value === account.lmeTurf
                          ? 'border-[color:var(--color-primary)] bg-[color:var(--color-primary)]/10 text-[color:var(--color-primary)]'
                          : 'border-[color:var(--color-border)]/60'
                      }`}
                      onClick={() => onChange('lmeTurf', value)}
                    >
                      {lmeTurfPresetLabel(value, locale)}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {section.fields.map((field) => (
                <AccountNumberControl
                  key={field.id}
                  field={field}
                  value={normalizeControlValue(account[field.id])}
                  onChange={onChange}
                />
              ))}
            </div>
            {section.title === labels.equipmentForging ? (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {equipmentSlotSections.map((slot) => (
                  <div
                    key={slot.id}
                    className="rounded-md border border-[color:var(--color-border)]/60 p-3"
                    data-testid={`tech-equipment-slot-${slot.id}`}
                  >
                    <h4 className="text-xs font-semibold uppercase text-[color:var(--color-text)]">{slot.label}</h4>
                    <label className="mt-2 block text-sm text-[color:var(--color-text)]">
                      <span className="text-xs text-[color:var(--color-text-muted)]">{labels.item}</span>
                      <select
                        className={selectClass + ' mt-1'}
                        data-testid={`tech-equipment-item-selector-${slot.id}`}
                        value={account[slot.itemField]}
                        onChange={(event) => onNamedChange(slot.itemField, event.target.value)}
                      >
                        {SS_EQUIPMENT_SCHEMA_INDEX.filter((item) => item.slot === slot.id).map((item) => (
                          <option key={item.id} value={item.id}>
                            {localizeTechEntityName('equipment', item.display_name_en, locale)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="mt-2 grid gap-2 sm:grid-cols-4">
                      {slot.fields.map((field) => (
                        <AccountNumberControl
                          key={field.id}
                          field={field}
                          value={normalizeControlValue(account[field.id])}
                          onChange={onChange}
                        />
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
