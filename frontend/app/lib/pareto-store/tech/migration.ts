import { cloneDefaultTechConfigs } from './defaults';
import { isTwinbornCategory, TechPartConfigMap } from './types';

interface LegacyTechPart {
  id?: string;
  resonance_chip_allocated?: number;
  is_twinborn?: boolean;
}

interface LegacyTechState {
  equipped_slots?: Record<string, string | null>;
  tech_parts?: LegacyTechPart[];
}

export interface TechMigrationResult {
  configs: TechPartConfigMap;
  legacyWarnings: string[];
}

export function migrateLegacyTechState(input: LegacyTechState): TechMigrationResult {
  const configs = cloneDefaultTechConfigs();
  const legacyWarnings: string[] = [];

  if (input.equipped_slots && Object.keys(input.equipped_slots).length > 0) {
    legacyWarnings.push('legacy equipped_slots converted; attack/defense slots are no longer canonical');
  }

  for (const part of input.tech_parts ?? []) {
    if (!part.id || !isTwinbornCategory(part.id)) continue;
    const resonance = Math.max(0, Math.trunc(part.resonance_chip_allocated ?? configs[part.id].resonance));
    configs[part.id] = {
      ...configs[part.id],
      resonance,
      equipped: part.is_twinborn ?? configs[part.id].equipped,
    };
  }

  return { configs, legacyWarnings };
}
