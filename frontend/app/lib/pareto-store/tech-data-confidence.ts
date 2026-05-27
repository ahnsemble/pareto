import type { ProductImportCoverage } from './profile-import-types';

export type TechDataConfidenceLevel = 'high' | 'medium' | 'low';

export type TechDataConfidenceSummary = {
  level: TechDataConfidenceLevel;
  importedCount: number;
  reviewCount: number;
  missingCount: number;
  details: string[];
};

export function buildTechDataConfidenceSummary({
  coverage,
  hasCollectibleSnapshot = false,
  hasImportedRunSnapshot = false,
  hasTechSnapshot = false,
  locale,
}: {
  coverage: ProductImportCoverage[];
  hasCollectibleSnapshot?: boolean;
  hasImportedRunSnapshot?: boolean;
  hasTechSnapshot?: boolean;
  locale?: string;
}): TechDataConfidenceSummary {
  const ko = locale === 'ko';
  const importedCount = coverage.filter((item) => item.status === 'imported').length;
  const reviewCount = coverage.filter((item) => item.status === 'needsReview').length;
  const missingCount = coverage.filter((item) => item.status === 'missing').length;
  const level: TechDataConfidenceLevel = importedCount === 0
    ? 'low'
    : hasImportedRunSnapshot && reviewCount === 0 && missingCount === 0 && importedCount >= 3
      ? 'high'
      : 'medium';

  if (importedCount === 0) {
    return {
      level,
      importedCount,
      reviewCount,
      missingCount,
      details: [
        ko
          ? '아직 가져온 프로필이 없어 현재 신뢰도는 수동 입력값 기준입니다.'
          : 'No imported profile yet; confidence is based on manual inputs.',
      ],
    };
  }

  const details = ko
    ? [`${importedCount}개 확인, ${reviewCount}개 확인 필요, ${missingCount}개 누락.`]
    : [`${importedCount} confirmed, ${reviewCount} need review, ${missingCount} missing.`];

  if (hasImportedRunSnapshot) {
    details.push(ko ? '계산 기준값을 사용할 수 있습니다.' : 'Imported calculation baseline is available.');
  }
  if (hasTechSnapshot || hasCollectibleSnapshot) {
    details.push(ko ? '테크 또는 수집품 스냅샷이 추천 근거에 연결됩니다.' : 'Tech or collection snapshots are linked to recommendation evidence.');
  }
  if (reviewCount > 0 || missingCount > 0) {
    details.push(ko ? '확인 필요 표시된 항목은 계산 전에 직접 확인하세요.' : 'Review marked fields before trusting the recommendation order.');
  }

  return { level, importedCount, reviewCount, missingCount, details };
}
