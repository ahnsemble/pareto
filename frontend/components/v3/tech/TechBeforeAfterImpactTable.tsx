import type { TechUpgradeImpactRow } from '../../../app/lib/pareto-store/tech-upgrade-impact';
import { formatNumber, labelClass } from '../optimizerUi';
import { getTechOptimizerCopy } from './techLocaleCopy';

export function TechBeforeAfterImpactTable({
  locale,
  rows,
}: {
  rows: TechUpgradeImpactRow[];
  locale?: string;
}) {
  const copy = getTechOptimizerCopy(locale);

  return (
    <div className="min-w-0 rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-surface-elev)] p-4" data-testid="tech-before-after-impact">
      <p className={labelClass}>{copy.impact.title}</p>
      {rows.length === 0 ? (
        <p className="mt-3 rounded-md border border-dashed border-[color:var(--color-border)] p-3 text-xs text-[color:var(--color-text-muted)]">
          {copy.impact.empty}
        </p>
      ) : (
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-xs">
          <thead className="text-[color:var(--color-text-muted)]">
            <tr>
              <th className="py-2">{copy.impact.item}</th>
              <th>{copy.impact.current}</th>
              <th>{copy.impact.recommended}</th>
              <th>{copy.impact.beforeDamage}</th>
              <th>{copy.impact.afterDamage}</th>
              <th>{copy.impact.expectedGain}</th>
              <th>{copy.impact.basis}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-[color:var(--color-border)]/50">
                <td className="max-w-[220px] py-2 font-semibold text-[color:var(--color-text)]">{row.item}</td>
                <td className="text-[color:var(--color-text-muted)]">{row.current}</td>
                <td className="text-[color:var(--color-text)]">{row.recommended}</td>
                <td className="font-mono text-[color:var(--color-text-muted)]">{formatNumber(row.baselineDamage, 0)}</td>
                <td className="font-mono text-[color:var(--color-accent)]">{formatNumber(row.projectedDamage, 0)}</td>
                <td className="font-mono text-[color:var(--color-text)]">{row.gainLabel}</td>
                <td className="text-[color:var(--color-text-muted)]">{row.basis}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
}
