'use client';

import {
  COLLECTIBLE_ITEM_INDEX,
  COLLECTIBLE_SET_INDEX,
  HERO_SCHEMA_INDEX,
  MOUNT_SCHEMA_INDEX,
  PET_SCHEMA_INDEX,
  SS_EQUIPMENT_SCHEMA_INDEX,
} from '../../../app/lib/pareto-store/schemas';
import type { PlayerState } from '../../../app/lib/pareto-store/types';
import { formatNumber, inputClass, labelClass, panelClass, selectClass } from '../optimizerUi';
import {
  collectibleItemReviewMarker,
  formatPassiveCritOptionLabel,
  formatTeamworkOptionLabel,
  lmeTurfPresetLabel,
  mountReviewSummary,
  normalizePetAssistContext,
  petXenoStatusLabel,
  survivorContextSummary,
  type TechAccountContextInput,
  type TechAccountContextNamedField,
} from './techAccountContext';
import { getTechOptimizerCopy } from './techLocaleCopy';

function contextNumber(value: number | null | undefined, digits = 0): string {
  return typeof value === 'number' && Number.isFinite(value) ? formatNumber(value, digits) : '0';
}

function contextLabel(value: string | null | undefined, emptyLabel = 'none'): string {
  return value && value.trim().length > 0 ? value : emptyLabel;
}

function displayNameById<T extends { id: string; display_name_en: string }>(
  rows: readonly T[],
  id: string | null | undefined,
  fallback = 'Unknown',
): string {
  return rows.find((row) => row.id === id)?.display_name_en ?? fallback;
}

export function AccountContextPanel({
  playerState,
  account,
  onChange,
  onNamedChange,
  locale,
}: {
  playerState: PlayerState;
  account: TechAccountContextInput;
  onChange: (field: keyof TechAccountContextInput, value: number) => void;
  onNamedChange: (field: TechAccountContextNamedField, value: string) => void;
  locale?: string;
}) {
  const copy = getTechOptimizerCopy(locale);
  const labels = copy.account.labels;
  const equipment = playerState.equipment;
  const selectedHeroName = displayNameById(HERO_SCHEMA_INDEX, playerState.hero.selected_hero_id, copy.account.selectedSurvivorFallback);
  const deployedPetName = displayNameById(PET_SCHEMA_INDEX, playerState.pet.deployed_pet_id, copy.account.petFallback);
  const selectedCollectibleName = displayNameById(COLLECTIBLE_ITEM_INDEX, playerState.collectible.target_collectible_id, copy.account.selectedCollectibleFallback);
  const selectedMountName = displayNameById(MOUNT_SCHEMA_INDEX, account.selectedMountId, copy.account.selectedMountFallback);
  const collectionRows = COLLECTIBLE_SET_INDEX.slice(0, 3);
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
  const sections: Array<{
    title: string;
    detailLabel?: string;
    fields: Array<{ id: keyof TechAccountContextInput; label: string; testId: string; min: number; max?: number; step?: number }>;
    summary?: Array<[string, string]>;
  }> = [
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
    {
      title: labels.collections,
      detailLabel: labels.collectionDetail,
      fields: [
        { id: 'collectionSets', label: labels.setProgress, testId: 'tech-account-collection-sets', min: 0, max: 38 },
        { id: 'collectionStars', label: labels.setStars, testId: 'tech-account-collection-stars', min: 0 },
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
      <div className="mt-2 grid gap-1 text-xs text-[color:var(--color-text-muted)]">
        {sections.map((section) => (
          <section key={section.title} className="border-t border-[color:var(--color-border)]/50 py-3">
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
                    {COLLECTIBLE_ITEM_INDEX.slice(0, 20).map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.display_name_en}
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
                {collectionRows.map((set) => (
                  <div
                    key={set.id}
                    className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 rounded-md border border-[color:var(--color-border)]/60 p-2 text-xs"
                    data-testid="tech-collection-named-row"
                  >
                    <span className="truncate text-[color:var(--color-text)]">{set.display_name_en}</span>
                    <span className="font-mono text-[color:var(--color-text-muted)]">{labels.set} {set.collectible_count}</span>
                  </div>
                ))}
                <div className="grid gap-2" data-testid="tech-collection-item-editor">
                  {COLLECTIBLE_ITEM_INDEX.slice(0, 12).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 rounded-md border border-[color:var(--color-border)]/60 p-2 text-left text-xs"
                      data-testid="tech-collection-item-row"
                      onClick={() => onNamedChange('targetCollectibleId', item.id)}
                    >
                      <span className="truncate text-[color:var(--color-text)]">{item.display_name_en}</span>
                      <span className="font-mono text-[color:var(--color-text-muted)]">
                        {collectibleItemReviewMarker(account.targetCollectibleId === item.id, locale)}
                      </span>
                    </button>
                  ))}
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
                          {hero.display_name_en}
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
                          {pet.display_name_en}
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
                            {pet.display_name_en}
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
                            {pet.display_name_en}
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
                        {mount.display_name_en}
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
                    <span className="truncate text-[color:var(--color-text)]">{mount.display_name_en}</span>
                    <span className="font-mono text-[color:var(--color-text-muted)]">{labels.puzzle} {index + 1}</span>
                  </div>
                ))}
              </div>
            ) : null}
            {section.title === labels.lunarMine ? (
              <div className="mt-2 grid grid-cols-5 gap-2" data-testid="tech-lme-turf-presets">
                {[0, 3, 6, 9, 12].map((value) => (
                  <button
                    key={value}
                    type="button"
                    className="rounded-md border border-[color:var(--color-border)]/60 px-2 py-1 text-xs"
                    onClick={() => onChange('lmeTurf', value)}
                  >
                    {lmeTurfPresetLabel(value, locale)}
                  </button>
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
            {section.title === labels.equipmentForging ? (
              <div className="mt-3 grid gap-3">
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
