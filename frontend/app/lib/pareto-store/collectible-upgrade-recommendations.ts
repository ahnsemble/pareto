import { CATALOG_ONLY_COLLECTIBLE_ITEM_IDS, COLLECTIBLE_ITEM_INDEX } from './schemas';
import type { ImportedCollectibleSnapshot } from './profile-import-types';
import type { TechRecommendationInput, TechUpgradeRecommendation } from './tech-upgrade-recommendation-types';

const FIRST_EVENT_ITEM_INDEX = COLLECTIBLE_ITEM_INDEX.findIndex((item) => item.id === 'event1');
const KNOWN_COLLECTIBLE_ITEM_COUNT = FIRST_EVENT_ITEM_INDEX >= 0 ? FIRST_EVENT_ITEM_INDEX : COLLECTIBLE_ITEM_INDEX.length;
const CATALOG_ONLY_COLLECTIBLE_ITEM_ID_SET = new Set<string>(CATALOG_ONLY_COLLECTIBLE_ITEM_IDS);

function collectibleName(itemIndex: number): string {
  return COLLECTIBLE_ITEM_INDEX[itemIndex]?.display_name_en ?? `Event ${itemIndex - KNOWN_COLLECTIBLE_ITEM_COUNT + 1}`;
}

function collectibleId(itemIndex: number): string {
  return COLLECTIBLE_ITEM_INDEX[itemIndex]?.id ?? `event${itemIndex - KNOWN_COLLECTIBLE_ITEM_COUNT + 1}`;
}

function isSourceBackedCollectibleItem(itemIndex: number): boolean {
  const id = COLLECTIBLE_ITEM_INDEX[itemIndex]?.id;
  return Boolean(id) && itemIndex < KNOWN_COLLECTIBLE_ITEM_COUNT && !CATALOG_ONLY_COLLECTIBLE_ITEM_ID_SET.has(id);
}

function selectCollectibleCandidate(
  snapshot: ImportedCollectibleSnapshot | null | undefined,
  targetCollectibleId?: string,
) {
  const items = (snapshot?.items ?? []).filter((item) => isSourceBackedCollectibleItem(item.itemIndex));
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

function buildCollectibleCandidateReasonDetails({
  accountContext,
  candidate,
  fromCustomSet,
  ko,
  name,
}: {
  accountContext: Pick<NonNullable<TechRecommendationInput['accountContext']>, 'targetCollectibleId'> | undefined;
  candidate: NonNullable<ReturnType<typeof selectCollectibleCandidate>>;
  fromCustomSet: boolean;
  ko: boolean;
  name: string;
}): string[] {
  const stars = candidate.stars;
  if (ko) {
    return [
      fromCustomSet
        ? `${name}은 가져온 프로필의 활성 커스텀 수집품 세트에 포함되어 있습니다.`
        : `${name}은 가져온 프로필에서 다음으로 점검할 낮은 별 수집품입니다.`,
      stars !== undefined ? `현재 별: ${stars}성.` : '가져온 프로필에서 현재 별 수가 확인되지 않았습니다.',
      accountContext?.targetCollectibleId
        ? '계정 컨텍스트에서 선택한 목표 수집품과 일치합니다.'
        : '가져온 수집품 목록 안에서 바로 행동 가능한 항목을 우선했습니다.',
    ];
  }

  return [
    fromCustomSet
      ? `${name} is part of an active custom collection set in the imported profile.`
      : `${name} is the next low-star collection item to review from the imported profile.`,
    stars !== undefined ? `Current stars: ${stars}.` : 'The imported profile did not include a current star count.',
    accountContext?.targetCollectibleId
      ? 'It matches the target collectible selected in account context.'
      : 'The recommendation prioritizes an immediately actionable collection item from the import.',
  ];
}

export function buildCollectibleUpgradeRecommendation({
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
      reasonDetails: buildCollectibleCandidateReasonDetails({ accountContext, candidate, fromCustomSet, ko, name }),
      expectedGainLabel: stars !== undefined ? (ko ? `현재 ${stars}성` : `${stars} stars`) : undefined,
      beforeAfter: {
        current: stars !== undefined ? (ko ? `${name} ${stars}성` : `${name} ${stars} stars`) : name,
        recommended: ko ? `${name} 우선 강화` : `${name} priority upgrade`,
      },
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
      reasonDetails: ko
        ? [`현재 세트 진행도: ${Math.trunc(collectionSets)}/38.`, `${remaining}세트가 남아 있어 개별 별작보다 세트 완성이 먼저입니다.`]
        : [`Current set progress: ${Math.trunc(collectionSets)}/38.`, `${remaining} sets remain, so set completion comes before individual star chasing.`],
      expectedGainLabel: ko ? `${remaining}세트 남음` : `${remaining} sets left`,
      beforeAfter: {
        current: ko ? `${Math.trunc(collectionSets)}/38 세트` : `${Math.trunc(collectionSets)}/38 sets`,
        recommended: ko ? '비어 있는 세트 우선 완성' : 'Complete missing sets first',
      },
      confidence: 'medium',
    };
  }

  return undefined;
}
