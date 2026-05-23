import type { ImportedCollectibleSnapshot, ImportedTechSnapshot } from './profile-import';

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
  importedCollectibleSnapshot?: ImportedCollectibleSnapshot | null;
  accountContext?: {
    collectionSets?: number;
    collectionStars?: number;
    customCollectionSets?: number;
    targetCollectibleId?: string;
  };
  chipRemainder?: number;
  locale?: string;
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

const COLLECTIBLE_ITEM_LABELS = [
  'Atomic Mech', 'Time Essence Bottle', 'Life Hourglass', 'Dimension Foil', 'Super Circuit Board', 'Comms Conch',
  'Memory Editor', 'Temporal Rewinder', 'Spatial Rewinder', 'Holodream Fluid', 'Dragon Tooth', 'Hyper Neuron',
  'Cyber Totem', 'Dreamscape Puzzle', 'Gene Splicer', 'Instellar Transition Matrix Design', 'High-Lat Energy Cube',
  'Mental Sync Helm', 'Dice of Destiny', 'Hydraulic Flipper', 'Klein Bottle', 'Wildfire Furnace', 'Wormhole Detector',
  'Mini Dyson Sphere', 'Star-Rail Passenger Card', 'Shuttle Capsule', 'Neurochip', 'Anti-Gravity Device',
  'Portable Mech Case', 'Dark Matter Construct', 'Timeline Cube', 'Omni-Symbiote', 'Plasma Sword', 'Geocore Orb',
  'Aquacore Orb', 'Pyrocore Orb', 'Aerocore Orb', 'Nuclear Battery', 'Old Medical Book', "Savior's Memento",
  'Tablet of Epics', 'Primordial War Drum', 'Flaming Plume', 'Astral Dewdrop', 'Antiparticle Gourd',
  'Micro Artificial Sun', 'Nano-Mimetic Mask', 'Clone Mirror', 'Cosmic Compass', 'Infinity Score',
  'Angelic Tear Crystal', 'Otherworld Key', 'Human Genome Mapping', 'Book of Ancient Wisdom', 'Starcore Diamond',
  'Immortal Lucky Coin', "Unicorn's Horn", 'Void Bloom', 'Eye of True Vision', 'Mystical Halo', 'Lucky Charm',
  "Prophet's Tarot", 'Golden Cutlery', 'Safehouse Map', "Scientific Luminary's Journal", 'Golden Horn',
  'Elemental Ring', 'Superhuman Pill', 'Aquarius Starlight', 'Pisces Starlight', 'Aries Starlight',
  'Taurus Starlight', 'Gemini Starlight', 'Cancer Starlight', 'Leo Starlight', 'Virgo Starlight',
  'Libra Starlight', 'Scorpio Starlight', 'Sagittarius Starlight', 'Capricorn Starlight',
] as const;

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

function idFromName(value: string): string {
  const cleaned = value.replace(/[^a-zA-Z0-9]+/g, ' ').trim();
  const words = cleaned.split(/\s+/).filter(Boolean);
  return words
    .map((word, index) => (index === 0 ? word.charAt(0).toLowerCase() + word.slice(1) : word.charAt(0).toUpperCase() + word.slice(1)))
    .join('');
}

function collectibleName(itemIndex: number): string {
  return COLLECTIBLE_ITEM_LABELS[itemIndex] ?? `Event ${itemIndex - COLLECTIBLE_ITEM_LABELS.length + 1}`;
}

function collectibleId(itemIndex: number): string {
  return COLLECTIBLE_ITEM_LABELS[itemIndex] ? idFromName(COLLECTIBLE_ITEM_LABELS[itemIndex]) : `event${itemIndex - COLLECTIBLE_ITEM_LABELS.length + 1}`;
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

function selectCollectibleCandidate(
  snapshot: ImportedCollectibleSnapshot | null | undefined,
  targetCollectibleId?: string,
) {
  const items = snapshot?.items ?? [];
  if (items.length === 0) return undefined;
  const target = targetCollectibleId
    ? items.find((item) => collectibleId(item.itemIndex) === targetCollectibleId)
    : undefined;
  if (target) return target;

  const scored = [...items].sort((left, right) => {
    const leftCustom = left.customSetLevel ?? -1;
    const rightCustom = right.customSetLevel ?? -1;
    if (leftCustom !== rightCustom) return rightCustom - leftCustom;
    const leftStars = left.stars ?? Number.POSITIVE_INFINITY;
    const rightStars = right.stars ?? Number.POSITIVE_INFINITY;
    if (leftStars !== rightStars) return leftStars - rightStars;
    return left.itemIndex - right.itemIndex;
  });
  return scored[0];
}

function buildCollectionRecommendation({
  accountContext,
  importedCollectibleSnapshot,
  locale,
}: Pick<TechRecommendationInput, 'accountContext' | 'importedCollectibleSnapshot' | 'locale'>): TechUpgradeRecommendation | undefined {
  const ko = locale === 'ko';
  const candidate = selectCollectibleCandidate(importedCollectibleSnapshot, accountContext?.targetCollectibleId);
  if (candidate) {
    const name = collectibleName(candidate.itemIndex);
    const stars = candidate.stars;
    const fromCustomSet = (candidate.customSetLevel ?? 0) > 0;
    return {
      id: 'collection-item',
      priority: fromCustomSet || accountContext?.targetCollectibleId ? 75 : 60,
      title: ko ? `수집품 강화: ${name}` : `Upgrade ${name} collection`,
      action: ko
        ? `${name}${stars !== undefined ? ` ${stars}성` : ''}을 먼저 올리고, 활성 커스텀 수집품 세트 재료보다 낮은 우선순위로 분산하지 마세요.`
        : `Raise ${name}${stars !== undefined ? ` from ${stars} stars` : ''} before spreading designs across lower-priority collection items.`,
      reason: ko
        ? fromCustomSet
          ? '가져온 프로필의 활성 커스텀 수집품 세트에 들어간 항목 중 가장 낮은 별 구간입니다.'
          : '가져온 프로필의 수집품 현황에서 다음으로 점검할 낮은 별 항목입니다.'
        : fromCustomSet
          ? 'This is the lowest-star item inside an active custom collection set from the imported profile.'
          : 'The imported profile shows this as the next low-star collection item to review.',
      expectedGainLabel: stars !== undefined ? (ko ? `현재 ${stars}성` : `${stars} stars`) : undefined,
      confidence: fromCustomSet || accountContext?.targetCollectibleId ? 'high' : 'medium',
    };
  }

  const collectionSets = accountContext?.collectionSets;
  if (typeof collectionSets === 'number' && Number.isFinite(collectionSets) && collectionSets < 38) {
    const remaining = Math.max(0, 38 - Math.trunc(collectionSets));
    return {
      id: 'collection-progress',
      priority: 55,
      title: ko ? '수집품 세트 완성' : 'Complete collection sets',
      action: ko ? '별작 전에 아직 비어 있는 수집품 세트부터 채우세요.' : 'Fill missing collection sets before star-chasing individual items.',
      reason: ko ? '세트 진행도는 계정 컨텍스트에 직접 반영되는 광역 성장값입니다.' : 'Set progress feeds the account context as a broad growth input.',
      expectedGainLabel: ko ? `${remaining}세트 남음` : `${remaining} sets left`,
      confidence: 'medium',
    };
  }

  return undefined;
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

  const collectionRecommendation = buildCollectionRecommendation({ accountContext, importedCollectibleSnapshot, locale });
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
