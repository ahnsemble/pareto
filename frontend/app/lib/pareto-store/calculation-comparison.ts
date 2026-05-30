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

export type CalculationComparisonInputChangeSummary = {
  accountContextChanges: number;
  inventoryChanges: number;
  changed: boolean;
};

export type CalculationComparisonExplanation = {
  headline: string;
  details: string[];
  tone: 'higher' | 'lower' | 'same' | 'unavailable';
};

type DamageResult = {
  builds?: Array<{
    damageFactor?: number;
  }>;
};

function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function comparableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(comparableValue);
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, comparableValue(value[key])]),
  );
}

function changedFieldCount(before: unknown, after: unknown): number {
  if (!isRecord(before) && !isRecord(after)) return 0;
  const beforeRecord = isRecord(before) ? before : {};
  const afterRecord = isRecord(after) ? after : {};
  const keys = new Set([...Object.keys(beforeRecord), ...Object.keys(afterRecord)]);
  let changed = 0;
  for (const key of keys) {
    if (JSON.stringify(comparableValue(beforeRecord[key])) !== JSON.stringify(comparableValue(afterRecord[key]))) {
      changed += 1;
    }
  }
  return changed;
}

function formatPct(value: number): string {
  if (!Number.isFinite(value)) return 'n/a';
  return Math.abs(value).toFixed(3).replace(/\.?0+$/, '');
}

function fieldCountLabel(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function topBuildDamageFactor(result: DamageResult | null | undefined): number | null {
  return finiteNumber(result?.builds?.[0]?.damageFactor);
}

export function buildCalculationComparisonInputChangeSummary({
  importedAccountContext,
  currentAccountContext,
  importedInventory,
  currentInventory,
}: {
  importedAccountContext?: Record<string, unknown> | null;
  currentAccountContext?: Record<string, unknown> | null;
  importedInventory?: Record<string, unknown> | null;
  currentInventory?: Record<string, unknown> | null;
}): CalculationComparisonInputChangeSummary {
  const accountContextChanges = changedFieldCount(importedAccountContext, currentAccountContext);
  const inventoryChanges = changedFieldCount(importedInventory, currentInventory);
  return {
    accountContextChanges,
    inventoryChanges,
    changed: accountContextChanges > 0 || inventoryChanges > 0,
  };
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

export function buildCalculationComparisonExplanation({
  inputChanges = { accountContextChanges: 0, inventoryChanges: 0, changed: false },
  locale,
  summary,
}: {
  summary: CalculationComparisonSummary;
  inputChanges?: CalculationComparisonInputChangeSummary;
  locale?: string;
}): CalculationComparisonExplanation {
  const ko = locale === 'ko';
  if (summary.status !== 'ready') {
    return {
      headline: ko ? '비교 설명을 만들 수 없습니다.' : 'Comparison explanation is unavailable.',
      details: [
        ko
          ? '가져온 기준값과 현재 계산값이 모두 있을 때 차이를 설명할 수 있습니다.'
          : 'Run an imported baseline and the current calculation to explain the difference.',
      ],
      tone: 'unavailable',
    };
  }

  const tone: CalculationComparisonExplanation['tone'] = !summary.changed ? 'same' : summary.delta > 0 ? 'higher' : 'lower';
  const pct = formatPct(summary.deltaPct);
  const headline = ko
    ? tone === 'same'
      ? 'tanggall 계산과 가져온 기준값이 같습니다.'
      : tone === 'higher'
        ? `tanggall 계산이 더 높습니다 (${pct}%).`
        : `tanggall 계산이 더 낮습니다 (${pct}%).`
    : tone === 'same'
      ? 'tanggall calculation matches the imported baseline.'
      : tone === 'higher'
        ? `tanggall calculation is higher (${pct}%).`
        : `tanggall calculation is lower (${pct}%).`;

  const details = ko
    ? ['가져온 기준값은 붙여넣은 프로필을 다시 계산한 값이고, tanggall 계산은 현재 화면 입력값을 사용합니다.']
    : ['The imported baseline is the pasted profile run; tanggall calculation uses the current editable inputs on screen.'];

  if (inputChanges.accountContextChanges > 0) {
    details.push(
      ko
        ? `계정 컨텍스트 ${inputChanges.accountContextChanges}개 항목이 변경되었습니다.`
        : `Account context changed in ${fieldCountLabel(inputChanges.accountContextChanges, 'field', 'fields')}.`,
    );
  }
  if (inputChanges.inventoryChanges > 0) {
    details.push(
      ko
        ? `테크 입력값 ${inputChanges.inventoryChanges}개 항목이 변경되었습니다.`
        : `Tech inputs changed in ${fieldCountLabel(inputChanges.inventoryChanges, 'field', 'fields')}.`,
    );
  }
  if (!inputChanges.changed) {
    details.push(
      ko
        ? '현재 입력값 차이가 감지되지 않았다면, 차이는 상위 빌드 선택이나 계산 반올림에서 온 것입니다.'
        : 'When editable inputs match, any remaining delta comes from top-build selection or rounding.',
    );
  } else if (tone === 'lower') {
    details.push(
      ko
        ? '가져온 프로필 대비 업그레이드 판단을 하려면 현재 입력값을 가져온 프로필과 맞춘 뒤 다시 계산하세요.'
        : 'Align the current inputs with the imported profile before treating this as an upgrade delta.',
    );
  }

  return { headline, details, tone };
}
