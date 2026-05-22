import type { ImportedTechSnapshot } from './profile-import';

export type TechUpgradeRecommendation = {
  id: string;
  priority: number;
  title: string;
  action: string;
  reason: string;
  expectedGainLabel?: string;
  confidence: 'high' | 'medium' | 'low';
};

type TechRecommendationInput = {
  result: unknown;
  importedTechSnapshot?: ImportedTechSnapshot | null;
  chipRemainder?: number;
};

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toTitleCase(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function partName(value: unknown): string {
  const raw = String(value ?? '');
  return TECH_PART_LABELS[raw] ?? toTitleCase(raw);
}

function modeName(value: unknown): string {
  const raw = String(value ?? '');
  return TECH_MODE_LABELS[raw] ?? toTitleCase(raw);
}

function readChip(row: Record<string, unknown>): number {
  const detail = isRecord(row.sio) ? row.sio : {};
  const chip = detail.chip ?? row.chip;
  return typeof chip === 'number' && Number.isFinite(chip) ? chip : 0;
}

function readOverload(row: Record<string, unknown>): number {
  const detail = isRecord(row.sio) ? row.sio : {};
  const overload = detail.overload ?? row.overload;
  return typeof overload === 'number' && Number.isFinite(overload) ? overload : 0;
}

function topBuildLoadout(result: unknown): Array<Record<string, unknown>> {
  if (!isRecord(result) || !Array.isArray(result.builds)) return [];
  const firstBuild = result.builds[0];
  if (!isRecord(firstBuild) || !isRecord(firstBuild.config) || !Array.isArray(firstBuild.config.loadout)) {
    return [];
  }
  return firstBuild.config.loadout.filter(isRecord);
}

function findSnapshotPart(snapshot: ImportedTechSnapshot | null | undefined, part: string, mode: string) {
  return snapshot?.parts.find((item) => item.partName === part && (!item.modeName || item.modeName === mode));
}

export function buildTechUpgradeRecommendations({
  result,
  importedTechSnapshot,
  chipRemainder = 0,
}: TechRecommendationInput): TechUpgradeRecommendation[] {
  const loadout = topBuildLoadout(result);
  if (loadout.length === 0) return [];

  const topChipRow = [...loadout].sort((left, right) => readChip(right) - readChip(left))[0];
  const topPartName = partName(topChipRow.part ?? topChipRow.id);
  const topModeName = modeName(topChipRow.mode);
  const topChip = readChip(topChipRow);
  const topOverload = readOverload(topChipRow);
  const snapshotPart = findSnapshotPart(importedTechSnapshot, topPartName, topModeName);
  const recommendations: TechUpgradeRecommendation[] = [];

  if (snapshotPart && (snapshotPart.overload ?? 0) < topOverload) {
    recommendations.push({
      id: 'top-overload',
      priority: 100,
      title: `Upgrade ${topPartName} overload`,
      action: `Raise ${topModeName} overload from ${snapshotPart.overload ?? 0} toward ${topOverload}.`,
      reason: 'The fastest build is spending its strongest upgrade pressure there.',
      confidence: 'high',
    });
  }

  if (chipRemainder > 0 && topChip > 0) {
    recommendations.push({
      id: 'chip-allocation',
      priority: 80,
      title: `Allocate chips to ${topPartName}`,
      action: `Use spare resonance chips on ${topModeName} before spreading them across lower-priority parts.`,
      reason: `The top build assigns ${topChip} chips to this slot.`,
      expectedGainLabel: `${chipRemainder} chips available`,
      confidence: snapshotPart ? 'high' : 'medium',
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      id: 'review-fit',
      priority: 50,
      title: `Tune ${topPartName}`,
      action: `Review ${topModeName} resonance and overload against the top build.`,
      reason: 'The optimizer is repeatedly selecting this part in the best build.',
      confidence: snapshotPart ? 'high' : 'medium',
    });
  }

  return recommendations.sort((left, right) => right.priority - left.priority);
}
