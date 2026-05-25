const TECH_PART_LABELS: Record<string, string> = {
  energyGuidanceSystem: 'Energy Guidance System',
  antimatterMaintainer: 'Antimatter Maintainer',
  quantumNanobot: 'Quantum Nanobot',
  phaseDriver: 'Phase Driver',
  energyDiffuser: 'Energy Diffuser',
  hiMaintainer: 'Hi-Maintainer',
  precisionDevice: 'Precision Device',
  antimatterGenerator: 'Antimatter Generator',
  exoRadicator: 'Exo-radicator',
  hiGravityPulser: 'Hi-Gravity Pulser',
};

const TECH_MODE_LABELS: Record<string, string> = {
  molotovMode: 'Molotov Mode',
  durianMode: 'Durian Mode',
  soccerMode: 'Soccer Mode',
  droneMode: 'Drone Mode',
  forcefieldMode: 'Forcefield Mode',
  drillShotMode: 'Drill Shot Mode',
  rocketMode: 'Rocket Mode',
  lightningMode: 'Lightning Mode',
  boomerangMode: 'Boomerang Mode',
  guardianMode: 'Guardian Mode',
  laserMode: 'Laser Mode',
  brickMode: 'Brick Mode',
};

export interface PresentedTechPartRow {
  rawPartId: string;
  partName: string;
  rawModeId: string;
  modeName: string;
  chipAllocation: number;
  overload: number;
}

function toTitleCase(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function readNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

export function displayTechPartName(id: string): string {
  return TECH_PART_LABELS[id] ?? toTitleCase(id);
}

export function displayTechModeName(id: string): string {
  return TECH_MODE_LABELS[id] ?? toTitleCase(id);
}

export function presentTechLoadoutRows(rows: Array<Record<string, unknown>>): PresentedTechPartRow[] {
  return rows.map((row) => {
    const detail = readRecord(row.app);
    const rawPartId = String(row.id ?? '');
    const rawModeId = String(row.mode ?? '');
    return {
      rawPartId,
      partName: displayTechPartName(rawPartId),
      rawModeId,
      modeName: displayTechModeName(rawModeId),
      chipAllocation: readNumber(detail.chip ?? row.chip),
      overload: readNumber(row.overload),
    };
  });
}

export function presentTechSkillName(value: string): string {
  if (value.endsWith('Mode')) return value;
  return displayTechModeName(value);
}
