export type CalculationComparisonSummary =
  | {
      status: 'ready';
      importedDamage: number;
      tangtangDamage: number;
      delta: number;
      deltaPct: number;
      changed: boolean;
    }
  | {
      status: 'unavailable';
      reason: 'missing-baseline' | 'missing-current';
    };

type DamageResult = {
  builds?: Array<{
    damageFactor?: number;
  }>;
};

function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function topBuildDamageFactor(result: DamageResult | null | undefined): number | null {
  return finiteNumber(result?.builds?.[0]?.damageFactor);
}

export function buildCalculationComparisonSummary({
  importedDamage,
  tangtangDamage,
}: {
  importedDamage: number | null | undefined;
  tangtangDamage: number | null | undefined;
}): CalculationComparisonSummary {
  const baseline = finiteNumber(importedDamage);
  if (baseline === null || baseline === 0) return { status: 'unavailable', reason: 'missing-baseline' };
  const current = finiteNumber(tangtangDamage);
  if (current === null) return { status: 'unavailable', reason: 'missing-current' };

  const delta = current - baseline;
  const deltaPct = (delta / Math.abs(baseline)) * 100;
  return {
    status: 'ready',
    importedDamage: baseline,
    tangtangDamage: current,
    delta,
    deltaPct,
    changed: Math.abs(delta) > 0,
  };
}
