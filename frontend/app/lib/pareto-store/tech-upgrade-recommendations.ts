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
  const rawDetail = row.app;
  const detail = isRecord(rawDetail) ? rawDetail : {};
  const chip = detail.chip ?? row.chip;
  return typeof chip === 'number' && Number.isFinite(chip) ? chip : 0;
}

function readOverload(row: Record<string, unknown>): number {
  const rawDetail = row.app;
  const detail = isRecord(rawDetail) ? rawDetail : {};
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

function buildOverloadReasonDetails({
  currentOverload,
  ko,
  topChip,
  topModeName,
  topOverload,
}: {
  currentOverload: number;
  ko: boolean;
  topChip: number;
  topModeName: string;
  topOverload: number;
}): string[] {
  const gap = Math.max(0, topOverload - currentOverload);
  if (ko) {
    return [
      `최상위 빌드는 ${topModeName} 오버로드 ${topOverload}를 사용합니다.`,
      `가져온 프로필은 현재 오버로드 ${currentOverload}라서 ${gap}단계 차이가 있습니다.`,
      topChip > 0 ? `같은 슬롯에 ${topChip}칩도 배정되어 있어 강화 우선순위가 겹칩니다.` : '이 슬롯은 현재 최상위 빌드의 오버로드 차이를 먼저 줄이는 후보입니다.',
    ];
  }

  return [
    `Top build uses overload ${topOverload} on ${topModeName}.`,
    `Imported profile is overload ${currentOverload}, leaving ${gap} level${gap === 1 ? '' : 's'} to close.`,
    topChip > 0 ? `The same slot also carries ${topChip} chips in the top build.` : 'This targets the clearest overload gap in the current best build.',
  ];
}

function buildChipReasonDetails({
  chipRemainder,
  ko,
  snapshotMatched,
  topChip,
  topModeName,
  topPartName,
}: {
  chipRemainder: number;
  ko: boolean;
  snapshotMatched: boolean;
  topChip: number;
  topModeName: string;
  topPartName: string;
}): string[] {
  if (ko) {
    return [
      `최상위 빌드는 ${topModeName}에 ${topChip}칩을 배정합니다.`,
      `${chipRemainder}칩 사용 가능해서 낮은 우선순위 파츠보다 먼저 투입할 수 있습니다.`,
      snapshotMatched
        ? `가져온 프로필에서 ${topPartName} / ${topModeName}가 확인되어 현재 장착 상태와 연결됩니다.`
        : '가져온 프로필에서 동일 파츠를 확인하지 못해 신뢰도는 중간입니다.',
    ];
  }

  return [
    `Top build assigns ${topChip} chips to ${topModeName}.`,
    `${chipRemainder} chips available, so this can be acted on before lower-priority parts.`,
    snapshotMatched
      ? `Imported profile confirms ${topPartName} / ${topModeName}, tying the recommendation to your current loadout.`
      : 'No matching imported part was found, so confidence stays medium.',
  ];
}

function buildReviewReasonDetails({
  ko,
  snapshotMatched,
  topChip,
  topModeName,
  topPartName,
}: {
  ko: boolean;
  snapshotMatched: boolean;
  topChip: number;
  topModeName: string;
  topPartName: string;
}): string[] {
  if (ko) {
    return [
      `최상위 빌드가 ${topPartName}의 ${topModeName}를 선택했습니다.`,
      topChip > 0 ? `이 슬롯은 최상위 빌드에서 ${topChip}칩을 사용합니다.` : '현재 입력에서는 즉시 쓸 남은 칩 차이가 크지 않습니다.',
      snapshotMatched ? '가져온 프로필과 매칭되어 현재 공명/오버로드 상태를 점검할 수 있습니다.' : '가져온 프로필 매칭이 없어 지출 전 현재 장착 상태를 먼저 확인하세요.',
    ];
  }

  return [
    `Top build selects ${topModeName} on ${topPartName}.`,
    topChip > 0 ? `This slot uses ${topChip} chips in the top build.` : 'The current inputs do not show a larger immediate chip gap.',
    snapshotMatched ? 'Imported profile has a matching part, so compare current resonance and overload before spending.' : 'No matching imported part was available, so treat this as a review target before spending.',
  ];
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
    const currentOverload = snapshotPart.overload ?? 0;
    recommendations.push({
      id: 'top-overload',
      priority: 100,
      title: ko ? `오버로드 강화: ${topPartName}` : `Upgrade ${topPartName} overload`,
      action: ko
        ? `${topModeName} 오버로드를 ${currentOverload}에서 ${topOverload} 쪽으로 올리세요.`
        : `Raise ${topModeName} overload from ${currentOverload} toward ${topOverload}.`,
      reason: ko ? '가장 빠른 빌드가 이 슬롯에 가장 큰 강화 압력을 쓰고 있습니다.' : 'The fastest build is spending its strongest upgrade pressure there.',
      reasonDetails: buildOverloadReasonDetails({ currentOverload, ko, topChip, topModeName, topOverload }),
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
      reasonDetails: buildChipReasonDetails({ chipRemainder, ko, snapshotMatched: Boolean(snapshotPart), topChip, topModeName, topPartName }),
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
      reasonDetails: buildReviewReasonDetails({ ko, snapshotMatched: Boolean(snapshotPart), topChip, topModeName, topPartName }),
      confidence: snapshotPart ? 'high' : 'medium',
    });
  }

  return recommendations.sort((left, right) => right.priority - left.priority);
}
