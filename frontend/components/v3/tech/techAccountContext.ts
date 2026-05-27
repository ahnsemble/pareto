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
  guildExpeditionTestaments: number;
};

export type TechProfileModeId = 'endersEcho' | 'guildExpedition';

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
  guildExpeditionTestaments: 0,
};

const DEFAULT_TECH_CALCULATION_CONTEXT: Record<string, unknown> = {
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

const GUILD_EXPEDITION_DEBUFF_DELTAS: Array<[number, string, number]> = [
  [80, 'critRate', -10],
  [120, 'skillDamage', -10],
  [160, 'critDamage', -10],
  [200, 'shieldDamage', -5],
  [280, 'vulnerability', -5],
  [320, 'critDamage', -10],
  [360, 'skillDamage', -10],
  [400, 'weakened', -10],
  [500, 'critDamage', -10],
  [550, 'skillDamage', -10],
  [600, 'damageDealt', -5],
  [650, 'poisoned', -10],
  [750, 'skillDamage', -10],
  [800, 'shieldDamage', -5],
  [850, 'critDamage', -10],
  [900, 'chilled', -10],
  [1000, 'critRate', -10],
  [1050, 'skillDamage', -10],
  [1100, 'critDamage', -10],
  [1150, 'vulnerability', -5],
  [1260, 'skillDamage', -10],
  [1320, 'shieldDamage', -5],
  [1380, 'vulnerability', -5],
  [1440, 'damageDealt', -5],
  [1640, 'skillDamage', -10],
  [1710, 'weakened', -10],
  [1780, 'critDamage', -10],
  [1850, 'vulnerability', -5],
  [1990, 'skillDamage', -10],
  [2060, 'poisoned', -10],
  [2130, 'critDamage', -10],
  [2200, 'damageDealt', -5],
  [2340, 'shieldDamage', -5],
  [2410, 'chilled', -10],
  [2480, 'critRate', -10],
  [2550, 'critDamage', -10],
  [2690, 'damageDealt', -5],
  [2760, 'skillDamage', -10],
  [2840, 'critDamage', -10],
  [2920, 'shieldDamage', -5],
  [3160, 'critRate', -10],
  [3240, 'skillDamage', -10],
  [3400, 'vulnerability', -5],
  [3480, 'critDamage', -10],
  [3640, 'shieldDamage', -5],
  [3800, 'vulnerability', -5],
  [3880, 'critDamage', -15],
  [4040, 'skillDamage', -15],
  [4130, 'weakened', -10],
  [4130, 'poisoned', -10],
  [4130, 'chilled', -10],
  [4310, 'shieldDamage', -5],
  [4400, 'damageDealt', -5],
  [4700, 'shieldDamage', -5],
  [4800, 'critRate', -10],
  [4900, 'skillDamage', -15],
  [5100, 'shieldDamage', -5],
  [5200, 'critDamage', -15],
  [5300, 'skillDamage', -15],
  [5400, 'critRate', -10],
  [5600, 'shieldDamage', -5],
  [5700, 'critDamage', -15],
  [5800, 'damageDealt', -5],
  [5900, 'skillDamage', -15],
  [6200, 'shieldDamage', -10],
  [6300, 'weakened', -20],
  [6300, 'poisoned', -20],
  [6300, 'chilled', -20],
  [6400, 'critDamage', -20],
  [6600, 'vulnerability', -10],
  [6700, 'critDamage', -20],
  [6800, 'skillDamage', -20],
  [6900, 'shieldDamage', -10],
  [7100, 'critRate', -10],
  [7200, 'skillDamage', -20],
  [7300, 'shieldDamage', -15],
  [7400, 'damageDealt', -5],
  [7700, 'critRate', -15],
  [7800, 'skillDamage', -25],
  [7900, 'vulnerability', -15],
  [8000, 'critDamage', -25],
  [8200, 'skillDamage', -25],
  [8300, 'critDamage', -25],
  [8400, 'shieldDamage', -15],
  [8500, 'weakened', -20],
  [8500, 'poisoned', -20],
  [8500, 'chilled', -20],
  [8700, 'critDamage', -25],
  [8800, 'skillDamage', -25],
  [8900, 'damageDealt', -5],
  [9200, 'critRate', -15],
  [9300, 'skillDamage', -25],
  [9400, 'shieldDamage', -15],
  [9500, 'critDamage', -25],
  [9700, 'vulnerability', -15],
  [9800, 'skillDamage', -25],
  [9900, 'critDamage', -25],
  [10000, 'shieldDamage', -15],
  [10200, 'skillDamage', -25],
  [10300, 'critDamage', -25],
  [10400, 'weakened', -20],
  [10400, 'poisoned', -20],
  [10400, 'chilled', -20],
  [10700, 'vulnerability', -20],
  [10800, 'critDamage', -30],
  [10900, 'skillDamage', -30],
  [11000, 'shieldDamage', -20],
  [11200, 'critRate', -20],
  [11300, 'shieldDamage', -20],
  [11400, 'damageDealt', -5],
  [11500, 'skillDamage', -30],
  [11700, 'weakened', -20],
  [11700, 'poisoned', -20],
  [11700, 'chilled', -20],
  [11800, 'critDamage', -30],
  [11900, 'skillDamage', -30],
  [12200, 'critDamage', -40],
  [12300, 'skillDamage', -40],
  [12400, 'weakened', -30],
  [12400, 'poisoned', -30],
  [12400, 'chilled', -30],
  [12500, 'vulnerability', -20],
  [12700, 'shieldDamage', -30],
  [12800, 'critDamage', -50],
  [12900, 'skillDamage', -50],
  [13000, 'critRate', -40],
  [13000, 'damageDealt', -5],
  [13200, 'weakened', -30],
  [13200, 'poisoned', -30],
  [13200, 'chilled', -30],
  [13300, 'vulnerability', -20],
  [13400, 'shieldDamage', -30],
  [14100, 'skillDamage', -60],
  [14400, 'weakened', -40],
  [14400, 'poisoned', -40],
  [14400, 'chilled', -40],
  [14700, 'critDamage', -60],
  [15000, 'shieldDamage', -40],
  [15600, 'vulnerability', -20],
  [15900, 'damageDealt', -5],
  [16200, 'skillDamage', -60],
  [16500, 'shieldDamage', -40],
  [17100, 'weakened', -40],
  [17100, 'poisoned', -40],
  [17100, 'chilled', -40],
  [17400, 'vulnerability', -20],
  [17700, 'critDamage', -60],
  [19000, 'skillDamage', -60],
  [19500, 'critDamage', -60],
  [20000, 'shieldDamage', -40],
  [20500, 'vulnerability', -20],
  [21500, 'skillDamage', -60],
  [22000, 'critRate', -20],
  [22000, 'critDamage', -60],
  [22500, 'weakened', -40],
  [22500, 'poisoned', -40],
  [22500, 'chilled', -40],
  [23000, 'critDamage', -60],
  [23500, 'skillDamage', -60],
  [24500, 'damageDealt', -5],
  [25000, 'vulnerability', -20],
  [25500, 'critRate', -20],
  [25500, 'critDamage', -60],
  [26000, 'shieldDamage', -40],
  [26500, 'weakened', -40],
  [26500, 'poisoned', -40],
  [26500, 'chilled', -40],
  [29000, 'critDamage', -60],
  [30000, 'shieldDamage', -40],
  [31000, 'vulnerability', -20],
  [32000, 'skillDamage', -60],
  [34000, 'critRate', -20],
  [34000, 'critDamage', -60],
  [35000, 'weakened', -40],
  [35000, 'poisoned', -40],
  [35000, 'chilled', -40],
  [36000, 'skillDamage', -60],
  [37000, 'critDamage', -60],
  [38000, 'damageDealt', -5],
  [40000, 'skillDamage', -60],
  [41000, 'vulnerability', -20],
  [42000, 'critRate', -20],
  [42000, 'critDamage', -60],
  [43000, 'skillDamage', -60],
  [44000, 'shieldDamage', -40],
  [46000, 'vulnerability', -20],
  [46500, 'critDamage', -60],
  [47000, 'skillDamage', -60],
  [47500, 'weakened', -40],
  [47500, 'poisoned', -40],
  [47500, 'chilled', -40],
  [48000, 'vulnerability', -20],
  [48500, 'shieldDamage', -40],
  [49500, 'skillDamage', -60],
  [50000, 'vulnerability', -20],
  [50500, 'critRate', -20],
  [50500, 'critDamage', -60],
  [51000, 'shieldDamage', -40],
  [51500, 'laceration', -10],
  [52500, 'vulnerability', -20],
  [53000, 'weakened', -40],
  [53000, 'poisoned', -40],
  [53000, 'chilled', -40],
  [53500, 'shieldDamage', -40],
  [54000, 'critDamage', -60],
  [54500, 'vulnerability', -20],
  [55000, 'laceration', -20],
  [56500, 'shieldDamage', -40],
  [57000, 'weakened', -50],
  [57000, 'poisoned', -50],
  [57000, 'chilled', -50],
  [57500, 'vulnerability', -30],
  [58000, 'skillDamage', -75],
  [58500, 'critRate', -30],
  [58500, 'critDamage', -75],
  [59000, 'shieldDamage', -40],
  [60000, 'laceration', -20],
  [60500, 'damageDealt', -5],
  [61000, 'skillDamage', -100],
  [61500, 'vulnerability', -30],
  [62000, 'critDamage', -100],
  [63000, 'weakened', -50],
  [63000, 'poisoned', -50],
  [63000, 'chilled', -50],
  [63500, 'skillDamage', -100],
  [64000, 'shieldDamage', -40],
  [64500, 'vulnerability', -30],
  [65000, 'critDamage', -100],
  [65500, 'laceration', -20],
  [67000, 'skillDamage', -100],
  [67500, 'vulnerability', -30],
  [68000, 'critDamage', -100],
  [68500, 'shieldDamage', -40],
  [69000, 'laceration', -30],
  [69500, 'xenoResDamage', -20],
  [70500, 'weakened', -50],
  [70500, 'poisoned', -50],
  [70500, 'chilled', -50],
  [71000, 'vulnerability', -30],
  [71500, 'skillDamage', -100],
  [72000, 'damageDealt', -5],
  [72500, 'damageBoss', -10],
  [73500, 'vulnerability', -40],
  [74000, 'laceration', -30],
  [74500, 'shieldDamage', -40],
  [75000, 'critRate', -30],
  [75000, 'critDamage', -100],
  [75500, 'xenoResDamage', -20],
  [76000, 'damageBoss', -20],
  [77500, 'weakened', -60],
  [77500, 'poisoned', -60],
  [77500, 'chilled', -60],
  [78000, 'shieldDamage', -40],
  [78500, 'critRate', -40],
  [78500, 'critDamage', -100],
  [79000, 'vulnerability', -40],
  [79500, 'skillDamage', -100],
  [80000, 'laceration', -30],
  [81000, 'critDamage', -100],
  [81500, 'skillDamage', -100],
  [82000, 'shieldDamage', -40],
  [82500, 'damageDealt', -5],
  [83000, 'xenoResDamage', -20],
  [84000, 'skillDamage', -100],
  [84500, 'shieldDamage', -40],
  [85000, 'critRate', -40],
  [85000, 'critDamage', -100],
  [85500, 'vulnerability', -40],
  [86000, 'laceration', -30],
  [86500, 'damageBoss', -20],
];

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

export function petXenoStatusLabel(account: TechAccountContextInput, locale: string = 'en'): string {
  if (locale === 'ko') {
    if (account.petXeno < 1) return 'Xeno 꺼짐';
    if (account.petResonanceChance > 0 || account.petResonanceAtk > 0) return 'Xeno 공명 준비됨';
    return 'Xeno 미리보기 켜짐';
  }
  if (account.petXeno < 1) return 'Xeno off';
  if (account.petResonanceChance > 0 || account.petResonanceAtk > 0) return 'Xeno resonance ready';
  return 'Xeno preview on';
}

export function formatTeamworkOptionLabel(value: number, locale: string = 'en'): string {
  if (locale === 'ko') {
    const labels: Record<number, string> = {
      0: '0칸 / 없음',
      1: '1칸 / 시작',
      2: '2칸 / 안정',
      3: '3칸 / 강함',
      4: '4칸 / 전체',
    };
    return labels[value] ?? `${value}칸`;
  }
  const labels: Record<number, string> = {
    0: '0 slots / none',
    1: '1 slot / starter',
    2: '2 slots / standard',
    3: '3 slots / advanced',
    4: '4 slots / full',
  };
  return labels[value] ?? `${value} slots`;
}

export function formatPassiveCritOptionLabel(value: number, locale: string = 'en'): string {
  if (locale === 'ko') return value <= 0 ? '패시브 치명 없음' : `치명 +${value}%`;
  return value <= 0 ? 'No passive crit' : `Crit +${value}%`;
}

export function survivorContextSummary(account: TechAccountContextInput, locale: string = 'en'): string {
  return `${formatTeamworkOptionLabel(account.survivorTeamwork, locale)} / ${formatPassiveCritOptionLabel(account.survivorPassiveCrit, locale)}`;
}

export function collectibleItemReviewMarker(isTarget: boolean, locale: string = 'en'): string {
  if (locale === 'ko') return isTarget ? '목표' : '확인 필요';
  return isTarget ? 'Target' : 'Needs review';
}

export function mountReviewSummary(account: TechAccountContextInput, locale: string = 'en'): string {
  const puzzleSlots = Math.max(0, Math.trunc(account.mountPuzzleSlots));
  const mountCores = Math.max(0, Math.trunc(account.mountCores));
  if (locale === 'ko') return `퍼즐 슬롯 ${puzzleSlots} / 탈것 코어 ${mountCores} / 확인 필요 퍼즐 행`;
  return `Puzzle slots ${puzzleSlots} / Mount cores ${mountCores} / Confirm puzzle rows`;
}

export function lmeTurfPresetLabel(value: number, locale: string = 'en'): string {
  if (locale === 'ko') return `${Math.max(0, Math.trunc(value))} 노드`;
  return `${Math.max(0, Math.trunc(value))} nodes`;
}

export function buildGuildExpeditionDebuffStats(testaments: number): Record<string, number> {
  const normalized = Number.isFinite(testaments) ? Math.max(0, Math.trunc(testaments)) : 0;
  const stats: Record<string, number> = {};
  for (const [threshold, stat, delta] of GUILD_EXPEDITION_DEBUFF_DELTAS) {
    if (normalized < threshold) continue;
    stats[stat] = (stats[stat] ?? 0) + delta;
  }
  return stats;
}

export function guildExpeditionDebuffSummary(account: TechAccountContextInput, locale: string = 'en'): string {
  const testaments = Math.max(0, Math.trunc(account.guildExpeditionTestaments));
  const stats = buildGuildExpeditionDebuffStats(testaments);
  const entries = Object.entries(stats).filter(([, value]) => value !== 0);
  if (entries.length === 0) {
    return locale === 'ko' ? `${testaments} 증표 / 디버프 없음` : `${testaments} testaments / no debuff`;
  }
  const preview = entries
    .slice(0, 3)
    .map(([key, value]) => `${key} ${value > 0 ? '+' : ''}${value}`)
    .join(', ');
  const suffix = entries.length > 3 ? (locale === 'ko' ? ` 외 ${entries.length - 3}개` : ` +${entries.length - 3} more`) : '';
  return locale === 'ko' ? `${testaments} 증표 / ${preview}${suffix}` : `${testaments} testaments / ${preview}${suffix}`;
}

function clampInteger(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.trunc(value)));
}

function applyStatDeltas(baseStats: Record<string, unknown>, deltas: Record<string, number>) {
  for (const [key, delta] of Object.entries(deltas)) {
    const current = baseStats[key];
    baseStats[key] = (typeof current === 'number' && Number.isFinite(current) ? current : 0) + delta;
  }
}

export function buildTechCalculationContext(
  account: TechAccountContextInput,
  profileMode: TechProfileModeId = 'endersEcho',
): Record<string, unknown> {
  const baseStats = DEFAULT_TECH_CALCULATION_CONTEXT.baseStats as Record<string, unknown>;
  const nextBaseStats: Record<string, unknown> = {
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
  };
  if (profileMode === 'guildExpedition') {
    applyStatDeltas(nextBaseStats, buildGuildExpeditionDebuffStats(account.guildExpeditionTestaments));
  }

  return {
    ...DEFAULT_TECH_CALCULATION_CONTEXT,
    gameMode: profileMode === 'guildExpedition' ? 'lme2' : 'lme1',
    baseStats: nextBaseStats,
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
