import { buildCollectibleUpgradeRecommendation } from './collectible-upgrade-recommendations';
import type { ImportedTechSnapshot } from './profile-import-types';
import type { TechRecommendationInput, TechUpgradeRecommendation } from './tech-upgrade-recommendation-types';

export type { TechUpgradeRecommendation } from './tech-upgrade-recommendation-types';

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
  importedCollectibleSnapshot,
  accountContext,
  chipRemainder = 0,
  locale,
}: TechRecommendationInput): TechUpgradeRecommendation[] {
  const loadout = topBuildLoadout(result);
  if (loadout.length === 0) return [];
  const ko = locale === 'ko';

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
      title: ko ? `오버로드 강화: ${topPartName}` : `Upgrade ${topPartName} overload`,
      action: ko
        ? `${topModeName} 오버로드를 ${snapshotPart.overload ?? 0}에서 ${topOverload} 쪽으로 올리세요.`
        : `Raise ${topModeName} overload from ${snapshotPart.overload ?? 0} toward ${topOverload}.`,
      reason: ko ? '가장 빠른 빌드가 이 슬롯에 가장 큰 강화 압력을 쓰고 있습니다.' : 'The fastest build is spending its strongest upgrade pressure there.',
      confidence: 'high',
    });
  }

  if (chipRemainder > 0 && topChip > 0) {
    recommendations.push({
      id: 'chip-allocation',
      priority: 80,
      title: ko ? `칩 배분: ${topPartName}` : `Allocate chips to ${topPartName}`,
      action: ko
        ? `남은 공명 칩은 낮은 우선순위 파츠에 나누기 전에 ${topModeName}에 먼저 쓰세요.`
        : `Use spare resonance chips on ${topModeName} before spreading them across lower-priority parts.`,
      reason: ko ? `상위 빌드는 이 슬롯에 ${topChip}칩을 배정합니다.` : `The top build assigns ${topChip} chips to this slot.`,
      expectedGainLabel: ko ? `${chipRemainder}칩 사용 가능` : `${chipRemainder} chips available`,
      confidence: snapshotPart ? 'high' : 'medium',
    });
  }

  const collectionRecommendation = buildCollectibleUpgradeRecommendation({ accountContext, importedCollectibleSnapshot, locale });
  if (collectionRecommendation) recommendations.push(collectionRecommendation);

  if (recommendations.length === 0) {
    recommendations.push({
      id: 'review-fit',
      priority: 50,
      title: ko ? `점검: ${topPartName}` : `Tune ${topPartName}`,
      action: ko ? `상위 빌드 기준으로 ${topModeName} 공명과 오버로드를 확인하세요.` : `Review ${topModeName} resonance and overload against the top build.`,
      reason: ko ? '최적화 결과가 이 파츠를 최고 빌드에서 반복적으로 선택하고 있습니다.' : 'The optimizer is repeatedly selecting this part in the best build.',
      confidence: snapshotPart ? 'high' : 'medium',
    });
  }

  return recommendations.sort((left, right) => right.priority - left.priority);
}
