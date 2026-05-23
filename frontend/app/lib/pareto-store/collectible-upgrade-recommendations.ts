import { COLLECTIBLE_ITEM_INDEX } from './schemas';
import type { ImportedCollectibleSnapshot } from './profile-import-types';
import type { TechRecommendationInput, TechUpgradeRecommendation } from './tech-upgrade-recommendation-types';

const FIRST_EVENT_ITEM_INDEX = COLLECTIBLE_ITEM_INDEX.findIndex((item) => item.id === 'event1');
const KNOWN_COLLECTIBLE_ITEM_COUNT = FIRST_EVENT_ITEM_INDEX >= 0 ? FIRST_EVENT_ITEM_INDEX : COLLECTIBLE_ITEM_INDEX.length;

function collectibleName(itemIndex: number): string {
  return COLLECTIBLE_ITEM_INDEX[itemIndex]?.display_name_en ?? `Event ${itemIndex - KNOWN_COLLECTIBLE_ITEM_COUNT + 1}`;
}

function collectibleId(itemIndex: number): string {
  return COLLECTIBLE_ITEM_INDEX[itemIndex]?.id ?? `event${itemIndex - KNOWN_COLLECTIBLE_ITEM_COUNT + 1}`;
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
