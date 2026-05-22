import type { TechUpgradeRecommendation } from '../../../app/lib/pareto-store/tech-upgrade-recommendations';
import { labelClass } from '../optimizerUi';

export function TechUpgradeRecommendations({
  recommendations,
}: {
  recommendations: TechUpgradeRecommendation[];
}) {
  return (
    <div className="mt-4 rounded-md border border-[color:var(--color-border)] p-3" data-testid="tech-upgrade-recommendations">
      <p className={labelClass}>Next upgrades</p>
      {recommendations.length === 0 ? (
        <p className="mt-2 text-xs text-[color:var(--color-text-muted)]">
          Run the optimizer to see upgrade recommendations.
        </p>
      ) : (
        <ol className="mt-2 grid gap-2">
          {recommendations.map((item) => (
            <li key={item.id} className="rounded-md border border-[color:var(--color-border)]/60 p-2">
              <p className="text-sm font-semibold text-[color:var(--color-text)]">{item.title}</p>
              <p className="mt-1 text-xs text-[color:var(--color-text-muted)]">{item.action}</p>
              <p className="mt-1 text-xs text-[color:var(--color-text-muted)]">{item.reason}</p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
