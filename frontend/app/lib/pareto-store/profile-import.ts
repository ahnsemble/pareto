export type ProductProfileWalletImport = Partial<{
  techResonanceChips: number;
  relicArtifactCores: number;
  survivorAwakeningCores: number;
  otherworldForgeCores: number;
  mountCores: number;
}>;

export type ProductProfileTechImport = Partial<{
  chips: number;
  skillSlots: number;
  rarityCounts: Record<string, number>;
}>;

export type ImportedTechSnapshot = {
  parts: Array<{
    partName: string;
    modeName?: string;
    rarity?: string;
    resonance?: number;
    overload?: number;
    deployed?: boolean;
  }>;
  optimizerSettings?: {
    speedMode?: string;
    limit?: string;
    skillSlots?: number;
    chips?: number;
    overloadable?: boolean;
  };
};

export type ProductImportCoverage = {
  id: string;
  label: string;
  status: 'imported' | 'missing' | 'needsReview';
  count?: number;
};

export type ProductImportFieldSummary = {
  id: string;
  label: string;
  value: string;
  group: 'Wallet' | 'Tech' | 'Account';
  needsReview?: boolean;
};

type ProductProfileAccountImportShape = {
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

export type ProductProfileAccountImport = Partial<ProductProfileAccountImportShape>;
type ProductProfileAccountStringField = {
  [Key in keyof ProductProfileAccountImportShape]: ProductProfileAccountImportShape[Key] extends string ? Key : never;
}[keyof ProductProfileAccountImportShape];
type ProductProfileAccountNumberField = {
  [Key in keyof ProductProfileAccountImportShape]: ProductProfileAccountImportShape[Key] extends number ? Key : never;
}[keyof ProductProfileAccountImportShape];

export type ProductProfileImportResult =
  | {
      ok: true;
      wallet: ProductProfileWalletImport;
      tech: ProductProfileTechImport;
      account: ProductProfileAccountImport;
      importedTechSnapshot?: ImportedTechSnapshot;
      coverage?: ProductImportCoverage[];
      summary: string;
    }
  | {
      ok: false;
      error: string;
    };

const ROOT_ALIASES = ['profile', 'playerState', 'player_state', 'state', 'export'] as const;
const ACCOUNT_STRING_FIELDS: Array<[ProductProfileAccountStringField, readonly string[]]> = [
  ['selectedHeroId', ['selectedHeroId', 'selected_hero_id', 'hero.selected_hero_id', 'hero.id']],
  ['targetCollectibleId', ['targetCollectibleId', 'target_collectible_id', 'collectible.target_collectible_id']],
  ['deployedPetId', ['deployedPetId', 'deployed_pet_id', 'pet.deployed_pet_id']],
  ['assistPet1Id', ['assistPet1Id', 'assist_pet_1_id', 'pet.assist_pet_1_id']],
  ['assistPet2Id', ['assistPet2Id', 'assist_pet_2_id', 'pet.assist_pet_2_id']],
  ['selectedMountId', ['selectedMountId', 'selected_mount_id', 'mount.selected_mount_id']],
  ['weaponItemId', ['weaponItemId', 'weapon_item_id', 'equipment.weapon.item_id']],
  ['armorItemId', ['armorItemId', 'armor_item_id', 'equipment.armor.item_id']],
  ['necklaceItemId', ['necklaceItemId', 'necklace_item_id', 'equipment.necklace.item_id']],
  ['beltItemId', ['beltItemId', 'belt_item_id', 'equipment.belt.item_id']],
  ['glovesItemId', ['glovesItemId', 'gloves_item_id', 'equipment.gloves.item_id']],
  ['bootsItemId', ['bootsItemId', 'boots_item_id', 'equipment.boots.item_id']],
];
const ACCOUNT_NUMBER_FIELDS: Array<[ProductProfileAccountNumberField, readonly string[]]> = [
  ['baseAtk', ['baseAtk', 'base_atk', 'baseAttack', 'base_attack', 'damage.base_attack']],
  ['finalAtk', ['finalAtk', 'final_atk', 'finalAttack', 'final_attack', 'damage.final_attack']],
  ['atkPercent', ['atkPercent', 'atk_percent']],
  ['critRate', ['critRate', 'crit_rate']],
  ['critDamage', ['critDamage', 'crit_damage']],
  ['skillDamage', ['skillDamage', 'skill_damage']],
  ['shieldDamage', ['shieldDamage', 'shield_damage', 'damage.shield_damage']],
  ['poisonedDamage', ['poisonedDamage', 'poisoned_damage', 'poisoned', 'damage.poisoned']],
  ['weakenedDamage', ['weakenedDamage', 'weakened_damage', 'weakened', 'damage.weakened']],
  ['chilledDamage', ['chilledDamage', 'chilled_damage', 'chilled', 'damage.chilled']],
  ['lacerationDamage', ['lacerationDamage', 'laceration_damage', 'laceration', 'damage.laceration']],
  ['movementSpeed', ['movementSpeed', 'movement_speed']],
  ['movementSpeedCap', ['movementSpeedCap', 'movement_speed_cap']],
  ['petAtk', ['petAtk', 'pet_atk', 'pet.attack', 'pet.atk']],
  ['otherworldPetSyncRate', ['otherworldPetSyncRate', 'otherworld_pet_sync_rate', 'xenoSyncRate', 'xeno_sync_rate']],
  ['collectionSets', ['collectionSets', 'collection_sets', 'collectible.edition_progress']],
  ['collectionStars', ['collectionStars', 'collection_stars', 'collectible.red_star_total']],
  ['customCollectionSets', ['customCollectionSets', 'custom_collection_sets', 'collectible.custom_collection_slots']],
  ['survivorLevel', ['survivorLevel', 'survivor_level', 'hero.selected_hero_level']],
  ['survivorStar', ['survivorStar', 'survivor_star', 'hero.selected_hero_star']],
  ['survivorAwakening', ['survivorAwakening', 'survivor_awakening', 'hero.selected_hero_awakening']],
  ['survivorTeamwork', ['survivorTeamwork', 'survivor_teamwork', 'hero.teamwork_slots_unlocked']],
  ['survivorPassiveCrit', ['survivorPassiveCrit', 'survivor_passive_crit', 'hero.passive_crit_rate_percent']],
  ['petAwakening', ['petAwakening', 'pet_awakening', 'pet.awakening_level']],
  ['petAssistPets', ['petAssistPets', 'pet_assist_pets']],
  ['petXeno', ['petXeno', 'pet_xeno', 'pet.deployed_is_xeno']],
  ['petResonanceChance', ['petResonanceChance', 'pet_resonance_chance', 'pet.resonance_chance']],
  ['petResonanceAtk', ['petResonanceAtk', 'pet_resonance_atk', 'pet.resonance_atk']],
  ['mountCores', ['mountCores', 'mount_cores']],
  ['mountPuzzleSlots', ['mountPuzzleSlots', 'mount_puzzle_slots']],
  ['mountStatInputs', ['mountStatInputs', 'mount_stat_inputs']],
  ['mountAtk', ['mountAtk', 'mount_atk']],
  ['mountSkillDamage', ['mountSkillDamage', 'mount_skill_damage']],
  ['equipmentOtherworldCores', ['equipmentOtherworldCores', 'equipment_otherworld_cores', 'otherworldForgeCores']],
  ['weaponEaf', ['weaponEaf', 'weapon_eaf', 'equipment.weapon.astral_forge_eaf_level']],
  ['weaponVaf', ['weaponVaf', 'weapon_vaf', 'equipment.weapon.astral_forge_vaf_level']],
  ['weaponChaos', ['weaponChaos', 'weapon_chaos', 'equipment.weapon.chaos_fusion_level']],
  ['weaponXeno', ['weaponXeno', 'weapon_xeno', 'equipment.weapon.xeno_transmute_level']],
  ['armorEaf', ['armorEaf', 'armor_eaf', 'equipment.armor.astral_forge_eaf_level']],
  ['armorVaf', ['armorVaf', 'armor_vaf', 'equipment.armor.astral_forge_vaf_level']],
  ['armorChaos', ['armorChaos', 'armor_chaos', 'equipment.armor.chaos_fusion_level']],
  ['armorXeno', ['armorXeno', 'armor_xeno', 'equipment.armor.xeno_transmute_level']],
  ['necklaceEaf', ['necklaceEaf', 'necklace_eaf', 'equipment.necklace.astral_forge_eaf_level']],
  ['necklaceVaf', ['necklaceVaf', 'necklace_vaf', 'equipment.necklace.astral_forge_vaf_level']],
  ['necklaceChaos', ['necklaceChaos', 'necklace_chaos', 'equipment.necklace.chaos_fusion_level']],
  ['necklaceXeno', ['necklaceXeno', 'necklace_xeno', 'equipment.necklace.xeno_transmute_level']],
  ['beltEaf', ['beltEaf', 'belt_eaf', 'equipment.belt.astral_forge_eaf_level']],
  ['beltVaf', ['beltVaf', 'belt_vaf', 'equipment.belt.astral_forge_vaf_level']],
  ['beltChaos', ['beltChaos', 'belt_chaos', 'equipment.belt.chaos_fusion_level']],
  ['beltXeno', ['beltXeno', 'belt_xeno', 'equipment.belt.xeno_transmute_level']],
  ['glovesEaf', ['glovesEaf', 'gloves_eaf', 'equipment.gloves.astral_forge_eaf_level']],
  ['glovesVaf', ['glovesVaf', 'gloves_vaf', 'equipment.gloves.astral_forge_vaf_level']],
  ['glovesChaos', ['glovesChaos', 'gloves_chaos', 'equipment.gloves.chaos_fusion_level']],
  ['glovesXeno', ['glovesXeno', 'gloves_xeno', 'equipment.gloves.xeno_transmute_level']],
  ['bootsEaf', ['bootsEaf', 'boots_eaf', 'equipment.boots.astral_forge_eaf_level']],
  ['bootsVaf', ['bootsVaf', 'boots_vaf', 'equipment.boots.astral_forge_vaf_level']],
  ['bootsChaos', ['bootsChaos', 'boots_chaos', 'equipment.boots.chaos_fusion_level']],
  ['bootsXeno', ['bootsXeno', 'boots_xeno', 'equipment.boots.xeno_transmute_level']],
  ['lmeTurf', ['lmeTurf', 'lme_turf', 'lme.turf_nodes_enabled']],
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readPath(source: unknown, path: string): unknown {
  if (!isRecord(source)) return undefined;
  if (path in source) return source[path];

  let current: unknown = source;
  for (const part of path.split('.')) {
    if (!isRecord(current) || !(part in current)) return undefined;
    current = current[part];
  }
  return current;
}

function readCandidate(source: unknown, candidates: readonly string[]): unknown {
  for (const candidate of candidates) {
    const value = readPath(source, candidate);
    if (value !== undefined) return value;
  }
  return undefined;
}

function readNumber(source: unknown, candidates: readonly string[]): number | undefined {
  const value = readCandidate(source, candidates);
  const number =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(value.replace(/,/g, ''))
        : NaN;
  return Number.isFinite(number) ? number : undefined;
}

function readString(source: unknown, candidates: readonly string[]): string | undefined {
  const value = readCandidate(source, candidates);
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeRarityCounts(value: unknown): Record<string, number> | undefined {
  if (!isRecord(value)) return undefined;
  const counts: Record<string, number> = {};
  for (const [key, raw] of Object.entries(value)) {
    const number = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw.replace(/,/g, '')) : NaN;
    if (Number.isFinite(number)) counts[key] = Math.max(0, Math.trunc(number));
  }
  return Object.keys(counts).length > 0 ? counts : undefined;
}

function unwrapRoot(source: unknown): unknown {
  for (const alias of ROOT_ALIASES) {
    const nested = readPath(source, alias);
    if (isRecord(nested)) return nested;
  }
  return source;
}

function buildSummary(wallet: ProductProfileWalletImport, tech: ProductProfileTechImport, account: ProductProfileAccountImport): string {
  const parts: string[] = [];
  if (Object.values(wallet).some((value) => value !== undefined)) parts.push('Imported wallet');
  if (Object.values(tech).some((value) => value !== undefined)) parts.push('Imported tech inventory');
  if (Object.values(account).some((value) => value !== undefined)) parts.push('Imported account context');
  return parts.length > 0 ? parts.join(' / ') : 'Profile imported';
}

function formatImportValue(value: string | number | Record<string, number>): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return Number.isInteger(value) ? String(value) : String(value);
  return Object.entries(value)
    .map(([key, count]) => `${key} ${count}`)
    .join(', ');
}

export function buildProductImportFieldSummary(
  imported: Extract<ProductProfileImportResult, { ok: true }>,
): ProductImportFieldSummary[] {
  const rows: ProductImportFieldSummary[] = [];
  const add = (
    group: ProductImportFieldSummary['group'],
    id: string,
    label: string,
    value: string | number | Record<string, number> | undefined,
    needsReview = false,
  ) => {
    if (value === undefined) return;
    if (typeof value === 'string' && value.trim().length === 0) return;
    if (typeof value === 'object' && Object.keys(value).length === 0) return;
    rows.push({ group, id, label, value: formatImportValue(value), needsReview });
  };

  add('Wallet', 'techResonanceChips', 'Tech resonance chips', imported.wallet.techResonanceChips);
  add('Wallet', 'relicArtifactCores', 'Relic / artifact cores', imported.wallet.relicArtifactCores);
  add('Wallet', 'survivorAwakeningCores', 'Survivor awakening cores', imported.wallet.survivorAwakeningCores);
  add('Wallet', 'otherworldForgeCores', 'Otherworld / forge cores', imported.wallet.otherworldForgeCores);
  add('Wallet', 'mountCores', 'Mount cores', imported.wallet.mountCores);
  add('Tech', 'chips', 'Optimizer chips', imported.tech.chips);
  add('Tech', 'skillSlots', 'Active skills', imported.tech.skillSlots);
  add('Tech', 'rarityCounts', 'Tech rarity counts', imported.tech.rarityCounts);

  const accountFields: Array<[keyof ProductProfileAccountImport, string, boolean?]> = [
    ['baseAtk', 'Base ATK'],
    ['finalAtk', 'Final ATK'],
    ['atkPercent', 'ATK %'],
    ['critRate', 'Crit rate'],
    ['critDamage', 'Crit damage'],
    ['skillDamage', 'Skill damage'],
    ['shieldDamage', 'Shield damage'],
    ['poisonedDamage', 'Poisoned target'],
    ['weakenedDamage', 'Weakened target'],
    ['chilledDamage', 'Chilled target'],
    ['lacerationDamage', 'Lacerated target'],
    ['otherworldPetSyncRate', 'Otherworld pet sync'],
    ['petAtk', 'Pet ATK', true],
    ['movementSpeed', 'Movement speed', true],
    ['movementSpeedCap', 'Movement speed cap', true],
    ['collectionSets', 'Collection set progress'],
    ['collectionStars', 'Collection stars'],
    ['customCollectionSets', 'Custom collection sets'],
    ['survivorLevel', 'Survivor level'],
    ['survivorStar', 'Survivor star'],
    ['survivorAwakening', 'Survivor awakening'],
    ['survivorTeamwork', 'Teamwork slots'],
    ['survivorPassiveCrit', 'Passive crit'],
    ['petAwakening', 'Pet awakening'],
    ['petAssistPets', 'Assist pets'],
    ['petXeno', 'Pet xeno'],
    ['petResonanceChance', 'Pet resonance chance'],
    ['petResonanceAtk', 'Pet resonance ATK'],
    ['mountCores', 'Mount cores'],
    ['mountPuzzleSlots', 'Mount puzzle slots'],
    ['mountStatInputs', 'Mount stat inputs'],
    ['mountAtk', 'Mount ATK %'],
    ['mountSkillDamage', 'Mount skill %'],
    ['equipmentOtherworldCores', 'Equipment otherworld cores'],
    ['lmeTurf', 'Lunar Mine turf nodes'],
  ];
  for (const [field, label, needsReview] of accountFields) {
    add('Account', String(field), label, imported.account[field] as string | number | undefined, needsReview);
  }

  return rows.slice(0, 24);
}

function readScreenshotNumber(text: string, labels: readonly string[]): number | undefined {
  const escapedLabels = labels.map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const pattern = new RegExp(`(?:${escapedLabels})\\s*[:：]?\\s*([^\\n\\r]+)`, 'i');
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(pattern);
    if (!match) continue;
    const numberMatch = match[1].match(/^\s*-?\d[\d,]*(?:\.\d+)?/);
    if (!numberMatch) continue;
    const value = Number(numberMatch[0].replace(/,/g, ''));
    if (Number.isFinite(value)) return value;
  }
  return undefined;
}

function parseScreenshotTextImport(text: string): ProductProfileImportResult | null {
  const wallet: ProductProfileWalletImport = {};
  const tech: ProductProfileTechImport = {};
  const account: ProductProfileAccountImport = {};

  const baseAtk = readScreenshotNumber(text, ['기본 공격력', 'Base ATK', 'Base attack']);
  if (baseAtk !== undefined) account.baseAtk = baseAtk;

  const finalAtk = readScreenshotNumber(text, ['최후의 공격', '최종 공격력', 'Final ATK', 'Final attack']);
  if (finalAtk !== undefined) account.finalAtk = finalAtk;

  const atkPercent = readScreenshotNumber(text, ['공격력 보너스', 'ATK bonus', 'ATK %']);
  if (atkPercent !== undefined) account.atkPercent = atkPercent;

  const critRate = readScreenshotNumber(text, ['치명타 확률', 'Crit rate']);
  if (critRate !== undefined) account.critRate = critRate;

  const critDamage = readScreenshotNumber(text, ['치명타 피해량', 'Crit damage']);
  if (critDamage !== undefined) account.critDamage = critDamage;

  const skillDamage = readScreenshotNumber(text, ['스킬 피해', 'Skill damage']);
  if (skillDamage !== undefined) account.skillDamage = skillDamage;

  const shieldDamage = readScreenshotNumber(text, ['보호막 데미지 증가', 'Shield damage increase', 'Shield damage']);
  if (shieldDamage !== undefined) account.shieldDamage = shieldDamage;

  const poisonedDamage = readScreenshotNumber(text, ['중독 대상 데미지 증가', 'Poisoned target damage increase', 'Poisoned damage']);
  if (poisonedDamage !== undefined) account.poisonedDamage = poisonedDamage;

  const weakenedDamage = readScreenshotNumber(text, ['약화 대상 데미지 증가', 'Weakened target damage increase', 'Weakened damage']);
  if (weakenedDamage !== undefined) account.weakenedDamage = weakenedDamage;

  const chilledDamage = readScreenshotNumber(text, ['빙결 대상 데미지 증가', '감속 대상 데미지 증가', 'Chilled target damage increase', 'Chilled damage']);
  if (chilledDamage !== undefined) account.chilledDamage = chilledDamage;

  const lacerationDamage = readScreenshotNumber(text, ['열상 대상 데미지 증가', 'Lacerated target damage increase', 'Laceration damage']);
  if (lacerationDamage !== undefined) account.lacerationDamage = lacerationDamage;

  const movementSpeedCap = readScreenshotNumber(text, ['이동 속도 상한', 'Movement speed cap']);
  if (movementSpeedCap !== undefined) account.movementSpeedCap = movementSpeedCap;

  const movementSpeed = readScreenshotNumber(text, ['이동 속도', 'Movement speed']);
  if (movementSpeed !== undefined) account.movementSpeed = movementSpeed;

  const petAtk = readScreenshotNumber(text, ['펫 공격력', 'Pet ATK', 'Pet attack']);
  if (petAtk !== undefined) account.petAtk = petAtk;

  const otherworldPetSyncRate = readScreenshotNumber(text, ['이세계 펫 동조율', 'Otherworld pet sync rate', 'Pet sync rate']);
  if (otherworldPetSyncRate !== undefined) account.otherworldPetSyncRate = otherworldPetSyncRate;

  const techResonanceChips = readScreenshotNumber(text, ['공진 칩', 'Tech resonance chips', 'Resonance chips']);
  if (techResonanceChips !== undefined) {
    wallet.techResonanceChips = techResonanceChips;
    tech.chips = techResonanceChips;
  }

  const relicArtifactCores = readScreenshotNumber(text, ['신기 핵심', 'Relic core', 'Artifact core']);
  if (relicArtifactCores !== undefined) wallet.relicArtifactCores = relicArtifactCores;

  const survivorAwakeningCores = readScreenshotNumber(text, ['특공대 각성 코어', 'Survivor awakening core']);
  if (survivorAwakeningCores !== undefined) wallet.survivorAwakeningCores = survivorAwakeningCores;

  const otherworldForgeCores = readScreenshotNumber(text, ['이세계 코어', 'Otherworld core', 'Forge core']);
  if (otherworldForgeCores !== undefined) wallet.otherworldForgeCores = otherworldForgeCores;

  if (
    !Object.values(wallet).some((value) => value !== undefined) &&
    !Object.values(tech).some((value) => value !== undefined) &&
    !Object.values(account).some((value) => value !== undefined)
  ) {
    return null;
  }

  return {
    ok: true,
    wallet,
    tech,
    account,
    coverage: [
      { id: 'screenshot-build-stats', label: 'Screenshot build stats', status: Object.keys(account).length > 0 ? 'imported' : 'missing' },
      { id: 'screenshot-core-inventory', label: 'Screenshot core inventory', status: Object.keys(wallet).length > 0 ? 'imported' : 'missing' },
      { id: 'screenshot-extra-stats', label: 'Screenshot extra stats', status: 'needsReview' },
    ],
    summary: 'Imported screenshot text / ' + buildSummary(wallet, tech, account),
  };
}

export function parseProductProfileImport(text: string): ProductProfileImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    const screenshotImport = parseScreenshotTextImport(text);
    if (screenshotImport) return screenshotImport;
    return {
      ok: false,
      error: `Invalid JSON: ${error instanceof Error ? error.message : String(error)}`,
    };
  }

  const source = unwrapRoot(parsed);
  const walletSource = readPath(source, 'wallet');
  const techSource = readPath(source, 'tech');
  const accountSource = readPath(source, 'account');

  const wallet: ProductProfileWalletImport = {};
  const tech: ProductProfileTechImport = {};
  const account: ProductProfileAccountImport = {};

  const techResonanceChips = readNumber(walletSource ?? source, [
    'techResonanceChips',
    'tech_resonance_chips',
    'techChips',
    'chips',
  ]);
  if (techResonanceChips !== undefined) wallet.techResonanceChips = techResonanceChips;

  const relicArtifactCores = readNumber(walletSource ?? source, [
    'relicArtifactCores',
    'relic_artifact_cores',
    'relicCores',
  ]);
  if (relicArtifactCores !== undefined) wallet.relicArtifactCores = relicArtifactCores;

  const survivorAwakeningCores = readNumber(walletSource ?? source, [
    'survivorAwakeningCores',
    'survivor_awakening_cores',
  ]);
  if (survivorAwakeningCores !== undefined) wallet.survivorAwakeningCores = survivorAwakeningCores;

  const otherworldForgeCores = readNumber(walletSource ?? source, [
    'otherworldForgeCores',
    'otherworld_forge_cores',
    'forgeCores',
  ]);
  if (otherworldForgeCores !== undefined) wallet.otherworldForgeCores = otherworldForgeCores;

  const mountCores = readNumber(walletSource ?? source, ['mountCores', 'mount_cores']);
  if (mountCores !== undefined) wallet.mountCores = mountCores;

  const techChips = readNumber(techSource ?? source, [
    'chips',
    'chips_available',
    'availableChips',
    'tech.chips_available',
    'techResonanceChips',
    'tech_resonance_chips',
  ]);
  tech.chips = techChips ?? wallet.techResonanceChips;

  const skillSlots = readNumber(techSource ?? source, ['skillSlots', 'skill_slots', 'activeSkills', 'active_skills']);
  if (skillSlots !== undefined) tech.skillSlots = skillSlots;

  const rarityCounts = normalizeRarityCounts(readCandidate(techSource ?? source, ['rarityCounts', 'rarity_counts']));
  if (rarityCounts) tech.rarityCounts = rarityCounts;

  for (const [field, aliases] of ACCOUNT_NUMBER_FIELDS) {
    const value = readNumber(accountSource ?? source, aliases);
    if (value !== undefined) account[field] = value;
  }
  for (const [field, aliases] of ACCOUNT_STRING_FIELDS) {
    const value = readString(accountSource ?? source, aliases);
    if (value !== undefined) account[field] = value;
  }
  if (account.petAssistPets === undefined) {
    if (account.assistPet2Id) account.petAssistPets = 2;
    else if (account.assistPet1Id) account.petAssistPets = 1;
  }

  return {
    ok: true,
    wallet,
    tech,
    account,
    summary: buildSummary(wallet, tech, account),
  };
}

export async function importProductProfileInput(
  text: string,
  options: { resolveCode?: (code: string) => Promise<string> } = {},
): Promise<ProductProfileImportResult> {
  const { parseExternalCalculationInput, decodeExternalCalculationRaw, resolveExternalCalculationCode } = await import('./external-calculation-link');
  const { normalizeExternalCalculationProfile } = await import('./external-calculation-profile');

  try {
    const parsed = parseExternalCalculationInput(text);
    if (parsed.kind === 'json') return parseProductProfileImport(parsed.text);
    if (parsed.kind === 'raw') return normalizeExternalCalculationProfile(await decodeExternalCalculationRaw(parsed.raw));
    if (parsed.kind === 'code') {
      const raw = await (options.resolveCode ?? resolveExternalCalculationCode)(parsed.code);
      return normalizeExternalCalculationProfile(await decodeExternalCalculationRaw(raw));
    }
    return parseProductProfileImport(text);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
