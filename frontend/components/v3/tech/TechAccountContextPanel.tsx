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
import type { TechAccountContextInput, TechAccountContextNamedField } from './techAccountContext';

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

export function AccountContextPanel({
  playerState,
  account,
  onChange,
  onNamedChange,
}: {
  playerState: PlayerState;
  account: TechAccountContextInput;
  onChange: (field: keyof TechAccountContextInput, value: number) => void;
  onNamedChange: (field: TechAccountContextNamedField, value: string) => void;
}) {
  const equipment = playerState.equipment;
  const selectedHeroName = displayNameById(HERO_SCHEMA_INDEX, playerState.hero.selected_hero_id, 'Selected survivor');
  const deployedPetName = displayNameById(PET_SCHEMA_INDEX, playerState.pet.deployed_pet_id, 'Pet');
  const selectedCollectibleName = displayNameById(COLLECTIBLE_ITEM_INDEX, playerState.collectible.target_collectible_id, 'None');
  const selectedMountName = displayNameById(MOUNT_SCHEMA_INDEX, account.selectedMountId, 'Mount');
  const collectionRows = COLLECTIBLE_SET_INDEX.slice(0, 3);
  const petRows = PET_SCHEMA_INDEX.slice(0, 5);
  const mountRows = MOUNT_SCHEMA_INDEX.slice(0, 3);
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
    ['Final ATK', contextNumber(account.finalAtk)],
    ['Crit', `${contextNumber(account.critRate)} / ${contextNumber(account.critDamage)}`],
    ['Conditions', contextNumber(activeConditionCount)],
    ['Review', contextNumber(reviewOnlyCount)],
  ];
  const equipmentSlotSections: Array<{
    id: 'weapon' | 'armor' | 'necklace' | 'belt' | 'gloves' | 'boots';
    label: string;
    itemField: TechAccountContextNamedField;
    fields: Array<{ id: keyof TechAccountContextInput; label: string; testId: string; min: number; max?: number }>;
  }> = [
    {
      id: 'weapon',
      label: 'Weapon',
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
      label: 'Armor',
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
      label: 'Necklace',
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
      label: 'Belt',
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
      label: 'Gloves',
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
      label: 'Boots',
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
      title: 'Damage conditions',
      fields: [
        { id: 'shieldDamage', label: 'Shield damage', testId: 'tech-account-shield-damage', min: 0, max: 5000, step: 0.5 },
        { id: 'poisonedDamage', label: 'Poisoned target', testId: 'tech-account-poisoned-damage', min: 0, max: 5000, step: 0.5 },
        { id: 'weakenedDamage', label: 'Weakened target', testId: 'tech-account-weakened-damage', min: 0, max: 5000, step: 0.5 },
        { id: 'chilledDamage', label: 'Chilled target', testId: 'tech-account-chilled-damage', min: 0, max: 5000, step: 0.5 },
        { id: 'lacerationDamage', label: 'Lacerated target', testId: 'tech-account-laceration-damage', min: 0, max: 5000, step: 0.5 },
      ],
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
      title: 'Movement and pet totals',
      fields: [
        { id: 'petAtk', label: 'Pet ATK', testId: 'tech-account-pet-atk', min: 0, step: 1 },
        { id: 'otherworldPetSyncRate', label: 'Otherworld pet sync', testId: 'tech-account-otherworld-pet-sync-rate', min: 0, max: 5000, step: 0.5 },
        { id: 'movementSpeed', label: 'Movement speed', testId: 'tech-account-movement-speed', min: 0, max: 1000, step: 0.5 },
        { id: 'movementSpeedCap', label: 'Movement speed cap', testId: 'tech-account-movement-speed-cap', min: 0, max: 1000, step: 0.5 },
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
            {section.title === 'Collections' ? (
              <div className="mt-2 grid gap-2" data-testid="tech-collection-named-editor">
                <label className="block text-sm text-[color:var(--color-text)]">
                  <span className="text-xs text-[color:var(--color-text-muted)]">Target collectible</span>
                  <select
                    className={selectClass + ' mt-1'}
                    data-testid="tech-collection-target-select"
                    value={account.targetCollectibleId}
                    onChange={(event) => onNamedChange('targetCollectibleId', event.target.value)}
                  >
                    <option value="">None</option>
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
                    Selected target: {selectedCollectibleName}
                  </span>
                </label>
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
                  <label className="block text-sm text-[color:var(--color-text)]">
                    <span className="text-xs text-[color:var(--color-text-muted)]">Selected survivor</span>
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
                      <span className="text-xs text-[color:var(--color-text-muted)]">Teamwork passive</span>
                      <select
                        className={selectClass + ' mt-1'}
                        data-testid="tech-teamwork-select"
                        value={account.survivorTeamwork}
                        onChange={(event) => onChange('survivorTeamwork', Number(event.target.value))}
                      >
                        {[0, 1, 2, 3, 4].map((value) => (
                          <option key={value} value={value}>
                            {value} slots
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="rounded-md border border-[color:var(--color-border)]/60 p-2 text-xs" data-testid="tech-passive-row">
                    <label className="block text-sm text-[color:var(--color-text)]">
                      <span className="text-xs text-[color:var(--color-text-muted)]">Passive crit</span>
                      <select
                        className={selectClass + ' mt-1'}
                        data-testid="tech-passive-select"
                        value={account.survivorPassiveCrit}
                        onChange={(event) => onChange('survivorPassiveCrit', Number(event.target.value))}
                      >
                        {[0, 6, 12, 18, 24].map((value) => (
                          <option key={value} value={value}>
                            {value}%
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>
              </div>
            ) : null}
            {section.title === 'Pet awakening' ? (
              <div className="mt-2 grid gap-2" data-testid="tech-pet-selector">
                <div className="rounded-md border border-[color:var(--color-border)]/60 p-2 text-xs text-[color:var(--color-text)]">
                  <label className="block text-sm text-[color:var(--color-text)]">
                    <span className="text-xs text-[color:var(--color-text-muted)]">Deployed pet</span>
                    <select
                      className={selectClass + ' mt-1'}
                      data-testid="tech-pet-deployed-select"
                      value={account.deployedPetId}
                      onChange={(event) => onNamedChange('deployedPetId', event.target.value)}
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
                      <span className="text-xs text-[color:var(--color-text-muted)]">Assist 1</span>
                      <select
                        className={selectClass + ' mt-1'}
                        data-testid="tech-pet-assist-1-select"
                        value={account.assistPet1Id}
                        onChange={(event) => {
                          onNamedChange('assistPet1Id', event.target.value);
                          onChange('petAssistPets', Math.max(account.petAssistPets, event.target.value ? 1 : 0));
                        }}
                      >
                        <option value="">None</option>
                        {petRows.map((pet) => (
                          <option key={pet.id} value={pet.id}>
                            {pet.display_name_en}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="rounded-md border border-[color:var(--color-border)]/60 p-2 text-xs" data-testid="tech-pet-assist-2">
                    <label className="block text-sm text-[color:var(--color-text)]">
                      <span className="text-xs text-[color:var(--color-text-muted)]">Assist 2</span>
                      <select
                        className={selectClass + ' mt-1'}
                        data-testid="tech-pet-assist-2-select"
                        value={account.assistPet2Id}
                        onChange={(event) => {
                          onNamedChange('assistPet2Id', event.target.value);
                          onChange('petAssistPets', Math.max(account.petAssistPets, event.target.value ? 2 : 0));
                        }}
                      >
                        <option value="">None</option>
                        {petRows.map((pet) => (
                          <option key={pet.id} value={pet.id}>
                            {pet.display_name_en}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>
              </div>
            ) : null}
            {section.title === 'Mounts' ? (
              <div className="mt-2 grid gap-2" data-testid="tech-mount-puzzle-editor">
                <label className="block rounded-md border border-[color:var(--color-border)]/60 p-2 text-sm text-[color:var(--color-text)]">
                  <span className="text-xs text-[color:var(--color-text-muted)]">Selected mount</span>
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
