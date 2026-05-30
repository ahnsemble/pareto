import type { CalculationComparisonSummary } from './calculation-comparison';
import type { TechUpgradeRecommendation } from './tech-upgrade-recommendation-types';

export type TechUpgradeImpactRow = {
  id: string;
  item: string;
  current: string;
  recommended: string;
  baselineDamage: number;
  projectedDamage: number;
  delta: number;
  deltaPct: number;
  gainLabel: string;
  basis: string;
  confidence: TechUpgradeRecommendation['confidence'];
};

function trimNumber(value: number, digits: number): string {
  if (!Number.isFinite(value)) return 'n/a';
  const formatted = value.toLocaleString(undefined, { maximumFractionDigits: digits });
  return formatted.includes('.') ? formatted.replace(/\.?0+$/, '') : formatted;
}

function signedNumber(value: number, digits: number): string {
  if (!Number.isFinite(value)) return 'n/a';
  if (value === 0) return '0';
  return `${value > 0 ? '+' : '-'}${trimNumber(Math.abs(value), digits)}`;
}

function gainLabel(delta: number, deltaPct: number): string {
  return `${signedNumber(delta, 0)} / ${signedNumber(deltaPct, 3)}%`;
}

export function buildTechUpgradeImpactRows({
  comparison,
  locale,
  recommendations,
}: {
  recommendations: TechUpgradeRecommendation[];
  comparison?: CalculationComparisonSummary | null;
  locale?: string;
}): TechUpgradeImpactRow[] {
  if (!comparison || comparison.status !== 'ready') return [];
  if (comparison.delta <= 0) return [];
  const basis = locale === 'ko' ? '최상위 추천안 기준' : 'Top recommendation plan';

  return recommendations
    .filter((recommendation) => recommendation.beforeAfter)
    .map((recommendation) => ({
      id: recommendation.id,
      item: recommendation.title,
      current: recommendation.beforeAfter?.current ?? '',
      recommended: recommendation.beforeAfter?.recommended ?? '',
      baselineDamage: comparison.importedDamage,
      projectedDamage: comparison.tangtangDamage,
      delta: comparison.delta,
      deltaPct: comparison.deltaPct,
      gainLabel: gainLabel(comparison.delta, comparison.deltaPct),
      basis,
      confidence: recommendation.confidence,
    }));
}
