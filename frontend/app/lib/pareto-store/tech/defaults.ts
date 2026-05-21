import {
  TechPartConfig,
  TechPartConfigMap,
  TechRarity,
  TwinbornCategory,
  TWINBORN_CATEGORIES,
} from './types';

const defaultConfig = (
  id: TwinbornCategory,
  overrides: Partial<Omit<TechPartConfig, 'id'>> = {},
): TechPartConfig => ({
  id,
  rarity: 'legend',
  mode: null,
  resonance: 0,
  overload: 0,
  supportParts: false,
  twinbornLevel: 0,
  equipped: false,
  ...overrides,
});

export const DEFAULT_TECH_CONFIGS: TechPartConfigMap = {
  energyGuidanceSystem: defaultConfig('energyGuidanceSystem', {
    mode: 'droneMode',
    resonance: 3000,
    equipped: true,
  }),
  antimatterMaintainer: defaultConfig('antimatterMaintainer', {
    resonance: 3000,
    equipped: true,
  }),
  quantumNanobot: defaultConfig('quantumNanobot', {
    mode: 'durianMode',
    resonance: 3000,
    equipped: true,
  }),
  phaseDriver: defaultConfig('phaseDriver'),
  energyDiffuser: defaultConfig('energyDiffuser', {
    resonance: 2100,
    equipped: true,
  }),
  hiMaintainer: defaultConfig('hiMaintainer'),
  precisionDevice: defaultConfig('precisionDevice'),
  antimatterGenerator: defaultConfig('antimatterGenerator'),
  exoRadicator: defaultConfig('exoRadicator'),
  hiGravityPulser: defaultConfig('hiGravityPulser'),
};

export const DEFAULT_TECH_CONFIG_LIST = TWINBORN_CATEGORIES.map((id) => DEFAULT_TECH_CONFIGS[id]);

export function cloneDefaultTechConfigs(): TechPartConfigMap {
  return Object.fromEntries(
    TWINBORN_CATEGORIES.map((id) => [id, { ...DEFAULT_TECH_CONFIGS[id] }]),
  ) as TechPartConfigMap;
}

export function normalizeTechRarity(value: string | undefined): TechRarity {
  if (value === 'eternal') return 'legend';
  if (
    value === 'legend' ||
    value === 'epic1' ||
    value === 'epic' ||
    value === 'excellent1' ||
    value === 'excellent' ||
    value === 'better' ||
    value === 'good' ||
    value === 'advanced' ||
    value === 'super' ||
    value === 'all'
  ) {
    return value;
  }
  return 'legend';
}
