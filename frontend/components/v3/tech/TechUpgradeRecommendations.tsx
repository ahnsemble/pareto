import type { TechUpgradeRecommendation } from '../../../app/lib/pareto-store/tech-upgrade-recommendation-types';
import { labelClass } from '../optimizerUi';
import { getTechOptimizerCopy } from './techLocaleCopy';

export function TechUpgradeRecommendations({
  recommendations,
  locale,
}: {
  recommendations: TechUpgradeRecommendation[];
  locale?: string;
}) {
  const copy = getTechOptimizerCopy(locale);

  return (
    <div className="mt-4 rounded-md border border-[color:var(--color-border)] p-3" data-testid="tech-upgrade-recommendations">
      <p className={labelClass}>{copy.recommendations.title}</p>
      {recommendations.length === 0 ? (
        <p className="mt-2 text-xs text-[color:var(--color-text-muted)]">
          {copy.recommendations.empty}
        </p>
      ) : (
        <ol className="mt-2 grid gap-2">
          {recommendations.map((item) => (
            <li key={item.id} className="rounded-md border border-[color:var(--color-border)]/60 p-2">
              <p className="text-sm font-semibold text-[color:var(--color-text)]">{item.title}</p>
              <p className="mt-1 text-xs text-[color:var(--color-text-muted)]">{item.action}</p>
              <p className="mt-1 text-xs text-[color:var(--color-text-muted)]">{item.reason}</p>
              <p className="mt-2 font-mono text-[11px] uppercase text-[color:var(--color-text-muted)]">
                {copy.recommendations.confidence}: {copy.recommendations.confidenceLevels[item.confidence]}
                {item.expectedGainLabel ? ` / ${item.expectedGainLabel}` : ''}
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
