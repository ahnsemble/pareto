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

export function parseProductProfileImport(text: string): ProductProfileImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
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
