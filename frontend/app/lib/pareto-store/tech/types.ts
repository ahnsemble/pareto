export const TECH_RARITIES = [
  'legend',
  'epic1',
  'epic',
  'excellent1',
  'excellent',
  'better',
  'good',
  'advanced',
  'super',
  'all',
] as const;

export type TechRarity = (typeof TECH_RARITIES)[number];

export const TWINBORN_CATEGORIES = [
  'energyGuidanceSystem',
  'antimatterMaintainer',
  'quantumNanobot',
  'phaseDriver',
  'energyDiffuser',
  'hiMaintainer',
  'precisionDevice',
  'antimatterGenerator',
  'exoRadicator',
  'hiGravityPulser',
] as const;

export type TwinbornCategory = (typeof TWINBORN_CATEGORIES)[number];

export const TECH_MODES = [
  'molotovMode',
  'durianMode',
  'soccerMode',
  'droneMode',
  'forcefieldMode',
  'drillShotMode',
  'rocketMode',
  'lightningMode',
  'boomerangMode',
  'guardianMode',
  'laserMode',
  'brickMode',
] as const;

export type TechMode = (typeof TECH_MODES)[number];

export interface TechPartConfig {
  id: TwinbornCategory;
  rarity: TechRarity;
  mode: TechMode | null;
  resonance: number;
  overload: number;
  supportParts: boolean;
  twinbornLevel: 0 | 1 | 2 | 3 | 4 | 5;
  equipped: boolean;
}

export type TechPartConfigMap = Record<TwinbornCategory, TechPartConfig>;

export function isTwinbornCategory(value: string): value is TwinbornCategory {
  return (TWINBORN_CATEGORIES as readonly string[]).includes(value);
}

export function isTechMode(value: string): value is TechMode {
  return (TECH_MODES as readonly string[]).includes(value);
}
