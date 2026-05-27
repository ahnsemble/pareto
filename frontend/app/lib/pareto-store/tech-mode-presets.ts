import type { TechProfileSaveSlotId } from './tech-profile-storage';

export type TechModePreset = {
  id: TechProfileSaveSlotId;
  skillSlots: number;
  overloadable: boolean;
  maxOverload: number;
  speedMode: 'fast' | 'normal' | 'precise' | 'precise+' | 'full';
  limit: 'basic' | 'advanced';
  skillStatusOverrides: Record<string, 'auto' | 'locked' | 'disabled'>;
  accountContextOverrides: Record<string, number>;
};

export const TECH_MODE_PRESETS: TechModePreset[] = [
  {
    id: 'endersEcho',
    skillSlots: 4,
    overloadable: false,
    maxOverload: 4,
    speedMode: 'normal',
    limit: 'basic',
    skillStatusOverrides: {
      rocketMode: 'disabled',
      guardianMode: 'disabled',
    },
    accountContextOverrides: {
      guildExpeditionTestaments: 0,
    },
  },
  {
    id: 'guildExpedition',
    skillSlots: 6,
    overloadable: true,
    maxOverload: 18,
    speedMode: 'precise',
    limit: 'advanced',
    skillStatusOverrides: {
      rocketMode: 'auto',
      guardianMode: 'auto',
    },
    accountContextOverrides: {
      guildExpeditionTestaments: 600,
    },
  },
];

export function getTechModePreset(id: TechProfileSaveSlotId): TechModePreset {
  return TECH_MODE_PRESETS.find((preset) => preset.id === id) ?? TECH_MODE_PRESETS[0];
}
