import type {
  ImportedTechSnapshot,
  ProductImportCoverage,
  ProductProfileAccountImport,
  ProductProfileImportResult,
  ProductProfileTechImport,
  ProductProfileWalletImport,
} from './profile-import';

const SHORT_ALPHABET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@£$%^&*()_+=';
const SHORT_KEYS = [
  'meta', 'synergy', 'mainHero', 'harmonyL', 'harmonyR', 'teamwork', 'synergyLevel',
  'heroes', 'collectibles', 'items', 'evoTree', 'petSkills', 'techs', 'customSets',
  'pet', 'skills', 'level', 'stars', 'enabled', 'name', 'v', 'c', 'e', 'base',
  'deployed', 'mode', 'resonance', 'rarity', 'rarities', 'atk', 'settings',
  'revives', 'berserk', 'instakill', 'gameMode', 'lmeTestaments', 'eeSkills',
  'numberFormat', 'ceSSWeapon', 'ceSkills', 'calcMode', 'value', 'Capy',
  'Crucker', 'Puffo', 'ceXeno', 'chips', 'inputs', 'modes', 'techsOptimizer',
  'itemsOptimizer', 'targetCores', 'advanced', 'limitE', 'limitV', 'limitC',
  'limitMinCores', 'minCores', 'entries', 'state', 'min', 'max',
  'heroesOptimizer', 'targetShards', 'mainHeroes', 'atkFinal', 'maxGear',
  'atkEquipPercent', 'turf', 'designs', 'atkBase', 'expanded', 'parts',
  'skillsMap', 'synergyLimit', 'eeOmnipower', 'clanLevel', 'atkHeroPercent',
  'mult', 'supportParts', 'experimentalFeatures', 'x', 'transmuteEffect',
  'pets', 'active', 'auto', 'transmuteCores', 'support', 'skill',
  'transmuteCondition', 'lme1Damage', 'limitMinTransmuteCores',
  'minTransmuteCores', 'transmuteExchange', 'transmuteBuy', 'transmuteSell',
  'minResonance', 'maxResonance', 'minOverload', 'maxOverload', 'overload',
  'multithread', 'computePool', 'strategy', 'speedMode', 'reservedLegends',
  'fodder', 'overloadable', 'limit', 'modeEntries', 'mounts', 'stats', 'lines',
  'data', 'petsCoresOptimizer', 'skillDamage', 'critDamage', 'shieldDamage',
  'weakened', 'poisoned', 'chilled', 'laceration', 'damageBoss', 'elixirs',
  'fillEmpties', 'petsSkillsOptimizer',
] as const;

const TECH_PART_NAMES = [
  'Energy Guidance System',
  'Antimatter Maintainer',
  'Quantum Nanobot',
  'Phase Driver',
  'Energy Diffuser',
  'Hi-Maintainer',
  'Precision Device',
  'Antimatter Generator',
  'Exo-radicator',
  'Hi-Gravity Pulser',
] as const;

const DEFAULT_TECH_MODES = [
  'Drone Mode',
  'Drill Shot Mode',
  'Soccer Mode',
  'Lightning Mode',
  'Laser Mode',
  undefined,
  undefined,
  undefined,
  undefined,
  'Molotov Mode',
] as const;

const RARITY_NAMES = ['Eternal', 'Legend4', 'Legend3', 'Legend2', 'Legend1', 'Legend'] as const;
const EXTERNAL_RARITIES = ['Eternal', 'Legend +4', 'Legend +3', 'Legend +2', 'Legend +1', 'Legend'] as const;
const SPEED_MODE_NAMES = ['normal', 'fast', 'precise', 'precise+', 'full'] as const;
const HERO_IDS = [
  'common',
  'tsukuyomi',
  'catnips',
  'worm',
  'king',
  'wesson',
  'yelena',
  'masterYang',
  'metalia',
  'joey',
  'taloxa',
  'raphael',
  'april',
  'donatello',
  'splinter',
  'leonardo',
  'michelangelo',
  'squidward',
  'spongebob',
  'sandy',
  'patrick',
  'venato',
] as const;
const ITEM_IDS_BY_EXTERNAL_INDEX: Record<number, string> = {
  1: 'twinLance',
  2: 'evervoidArmor',
  4: 'judgmentNecklace',
  6: 'stardustSash',
  8: 'moonscarBracer',
  10: 'glacialWarboots',
};
const ITEM_FIELD_BY_SLOT = [
  'weaponItemId',
  'armorItemId',
  'necklaceItemId',
  'beltItemId',
  'glovesItemId',
  'bootsItemId',
] as const;
const ITEM_FORGE_FIELDS_BY_SLOT = [
  ['weaponEaf', 'weaponVaf', 'weaponChaos', 'weaponXeno'],
  ['armorEaf', 'armorVaf', 'armorChaos', 'armorXeno'],
  ['necklaceEaf', 'necklaceVaf', 'necklaceChaos', 'necklaceXeno'],
  ['beltEaf', 'beltVaf', 'beltChaos', 'beltXeno'],
  ['glovesEaf', 'glovesVaf', 'glovesChaos', 'glovesXeno'],
  ['bootsEaf', 'bootsVaf', 'bootsChaos', 'bootsXeno'],
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function decodeShortKey(key: string): string {
  if (key.startsWith('_')) return key;
  let index = 0;
  for (const char of key) {
    const value = SHORT_ALPHABET.indexOf(char);
    if (value < 0) return key;
    index = index * SHORT_ALPHABET.length + value;
  }
  return SHORT_KEYS[index] ?? key;
}

function expandValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(expandValue);
  if (!isRecord(value)) return value;
  const expanded: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value)) {
    expanded[decodeShortKey(key)] = expandValue(nested);
  }
  return expanded;
}

export function expandExternalCalculationProfile(compact: Record<string, unknown>): Record<string, unknown> {
  if (compact._V !== 5) {
    throw new Error('Unsupported calculation link version');
  }
  return expandValue(compact) as Record<string, unknown>;
}

function readNumber(source: unknown, key: string): number | undefined {
  if (!isRecord(source)) return undefined;
  const value = source[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function readString(source: unknown, key: string): string | undefined {
  if (!isRecord(source)) return undefined;
  const value = source[key];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function importedCoverage(
  id: string,
  label: string,
  imported: boolean,
  count?: number,
): ProductImportCoverage {
  return {
    id,
    label,
    status: imported ? 'imported' : 'missing',
    ...(count !== undefined ? { count } : {}),
  };
}

function normalizeTech(expanded: Record<string, unknown>): {
  wallet: ProductProfileWalletImport;
  tech: ProductProfileTechImport;
  importedTechSnapshot: ImportedTechSnapshot;
} {
  const techsOptimizer = isRecord(expanded.techsOptimizer) ? expanded.techsOptimizer : {};
  const chips = readNumber(techsOptimizer, 'chips');
  const skillSlots = readNumber(techsOptimizer, 'skills');
  const inputs = Array.isArray(techsOptimizer.inputs) ? techsOptimizer.inputs : [];
  const rarityCounts: Record<string, number> = {};

  for (const [index, rarity] of RARITY_NAMES.entries()) {
    const value = inputs[index];
    if (typeof value === 'number' && Number.isFinite(value)) {
      rarityCounts[rarity] = Math.max(0, Math.trunc(value));
    }
  }

  const parts: ImportedTechSnapshot['parts'] = [];
  const techs = Array.isArray(expanded.techs) ? expanded.techs : [];
  for (const [index, rawPart] of techs.entries()) {
    if (!isRecord(rawPart)) continue;
    const resonance = readNumber(rawPart, 'resonance');
    const overload = readNumber(rawPart, 'overload');
    const rarityIndex = readNumber(rawPart, 'rarity');
    const deployed = Boolean(rawPart.deployed);
    if (!deployed && resonance === undefined && overload === undefined) continue;

    parts.push({
      partName: TECH_PART_NAMES[index] ?? `Tech part ${index + 1}`,
      modeName: DEFAULT_TECH_MODES[index],
      rarity: rarityIndex !== undefined ? EXTERNAL_RARITIES[rarityIndex] : undefined,
      resonance,
      overload,
      deployed,
    });
  }

  return {
    wallet: chips !== undefined ? { techResonanceChips: chips } : {},
    tech: {
      ...(chips !== undefined ? { chips } : {}),
      ...(skillSlots !== undefined ? { skillSlots } : {}),
      ...(Object.keys(rarityCounts).length > 0 ? { rarityCounts } : {}),
    },
    importedTechSnapshot: {
      parts,
      optimizerSettings: {
        speedMode: typeof techsOptimizer.speedMode === 'number' ? SPEED_MODE_NAMES[techsOptimizer.speedMode] : undefined,
        limit: readString(techsOptimizer, 'limit'),
        skillSlots,
        chips,
        overloadable: typeof techsOptimizer.overloadable === 'boolean' ? techsOptimizer.overloadable : undefined,
      },
    },
  };
}

function normalizeAccount(expanded: Record<string, unknown>): ProductProfileAccountImport {
  const meta = isRecord(expanded.meta) ? expanded.meta : {};
  const account: ProductProfileAccountImport = {};
  const baseAtk = readNumber(meta, 'atkBase');
  const finalAtk = readNumber(meta, 'atkFinal');
  const mainHero = readNumber(meta, 'mainHero');
  const synergyLevel = readNumber(meta, 'synergyLevel');
  const designs = readNumber(meta, 'designs');
  const maxGear = readNumber(meta, 'maxGear');

  if (baseAtk !== undefined) account.baseAtk = baseAtk;
  if (finalAtk !== undefined) account.finalAtk = finalAtk;
  if (mainHero !== undefined) account.selectedHeroId = HERO_IDS[mainHero - 1] ?? HERO_IDS[mainHero];
  if (synergyLevel !== undefined) account.survivorTeamwork = Math.max(0, Math.min(4, Math.floor(synergyLevel / 20)));
  if (designs !== undefined) account.collectionStars = designs;
  if (maxGear !== undefined) account.mountPuzzleSlots = maxGear;

  const directStatFields = [
    ['skillDamage', 'skillDamage'],
    ['critDamage', 'critDamage'],
    ['shieldDamage', 'shieldDamage'],
    ['poisoned', 'poisonedDamage'],
    ['weakened', 'weakenedDamage'],
    ['chilled', 'chilledDamage'],
    ['laceration', 'lacerationDamage'],
  ] as const;
  for (const [sourceKey, accountKey] of directStatFields) {
    const value = readNumber(expanded, sourceKey);
    if (value !== undefined) account[accountKey] = value;
  }

  const items = Array.isArray(expanded.items) ? expanded.items : [];
  for (const [index, item] of items.entries()) {
    if (!isRecord(item)) continue;
    const itemId = readNumber(item, 'name');
    const field = ITEM_FIELD_BY_SLOT[index];
    if (field && itemId !== undefined && ITEM_IDS_BY_EXTERNAL_INDEX[itemId]) {
      account[field] = ITEM_IDS_BY_EXTERNAL_INDEX[itemId];
    }
    const forgeFields = ITEM_FORGE_FIELDS_BY_SLOT[index];
    if (forgeFields) {
      const [eaf, vaf, chaos, xeno] = forgeFields;
      const e = readNumber(item, 'e');
      const v = readNumber(item, 'v');
      const c = readNumber(item, 'c');
      const x = readNumber(item, 'x');
      if (e !== undefined) account[eaf] = e;
      if (v !== undefined) account[vaf] = v;
      if (c !== undefined) account[chaos] = c;
      if (x !== undefined) account[xeno] = x;
    }
  }

  const turf = isRecord(expanded.turf) ? expanded.turf : {};
  const lme1Damage = Array.isArray(turf.lme1Damage) ? turf.lme1Damage : [];
  const lmeTurf = lme1Damage.reduce(
    (total, value) => total + (typeof value === 'number' && Number.isFinite(value) ? value : 0),
    0,
  );
  if (lmeTurf > 0) account.lmeTurf = lmeTurf;

  return account;
}

function buildCoverage(expanded: Record<string, unknown>, partsCount: number): ProductImportCoverage[] {
  const meta = isRecord(expanded.meta) ? expanded.meta : {};
  const techs = Array.isArray(expanded.techs) ? expanded.techs : [];
  return [
    importedCoverage('buildStats', 'Build stats', readNumber(meta, 'atkBase') !== undefined || readNumber(meta, 'atkFinal') !== undefined),
    importedCoverage('techInventory', 'Tech inventory', partsCount > 0, partsCount),
    importedCoverage('optimizerSettings', 'Optimizer settings', isRecord(expanded.techsOptimizer)),
    importedCoverage('equipment', 'Equipment', Array.isArray(expanded.items), Array.isArray(expanded.items) ? expanded.items.length : undefined),
    importedCoverage('accountContext', 'Account context', isRecord(expanded.meta) || isRecord(expanded.pets) || isRecord(expanded.mounts)),
    importedCoverage('profileDomains', 'Profile domains', techs.length > 0 || isRecord(expanded.turf)),
  ];
}

export function normalizeExternalCalculationProfile(compact: Record<string, unknown>): ProductProfileImportResult {
  try {
    const expanded = expandExternalCalculationProfile(compact);
    const { wallet, tech, importedTechSnapshot } = normalizeTech(expanded);
    const account = normalizeAccount(expanded);
    const coverage = buildCoverage(expanded, importedTechSnapshot.parts.length);

    return {
      ok: true,
      wallet,
      tech,
      account,
      importedTechSnapshot,
      coverage,
      summary: 'Imported calculation link / Imported account context / Imported tech inventory',
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
