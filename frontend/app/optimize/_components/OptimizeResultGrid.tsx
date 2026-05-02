'use client';

import type { BuildPoint } from '../../lib/wasm-worker';

interface Props {
  topBuilds: BuildPoint[];
  heroLabel: string;
}

export function OptimizeResultGrid({ topBuilds, heroLabel }: Props) {
  if (topBuilds.length === 0) {
    return (
      <p className="text-sm text-[color:var(--color-text-muted)]">
        No builds were produced for this configuration. Try a different hero.
      </p>
    );
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {topBuilds.map((build, idx) => (
        <article
          key={build.label}
          className="rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4 text-sm"
        >
          <header className="mb-3 flex items-baseline justify-between">
            <span className="rounded bg-[color:var(--color-primary)]/10 px-2 py-0.5 font-mono text-xs font-semibold text-[color:var(--color-primary)]">
              #{idx + 1}
            </span>
            <span className="font-mono text-xs text-[color:var(--color-text-muted)]">
              {heroLabel}
            </span>
          </header>
          <div className="mb-2">
            <div className="font-mono text-2xl font-semibold text-[color:var(--color-accent)]">
              {build.score.toFixed(2)}
            </div>
            <div className="text-xs text-[color:var(--color-text-muted)]">score</div>
          </div>
          <div className="mb-3 flex items-baseline gap-3">
            <div>
              <div className="font-mono text-base text-[color:var(--color-secondary)]">
                {build.damageFactor.toFixed(2)}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-[color:var(--color-text-muted)]">
                damage
              </div>
            </div>
            <div>
              <div className="font-mono text-base text-[color:var(--color-text)]">
                {build.upgradeCount}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-[color:var(--color-text-muted)]">
                upgrades
              </div>
            </div>
          </div>
          <details className="text-xs">
            <summary className="cursor-pointer px-1 py-2 text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)]">
              {build.selections.length} selections
            </summary>
            <ul className="mt-2 space-y-0.5 font-mono">
              {build.selections.map((sel) => (
                <li key={sel.slot} className="text-[color:var(--color-text-muted)]">
                  <span className="text-[color:var(--color-text)]">{sel.slot}</span>
                  <span className="mx-1">→</span>
                  <span
                    className={
                      sel.choice === 'baseline'
                        ? 'text-[color:var(--color-text-muted)]'
                        : 'text-[color:var(--color-accent)]'
                    }
                  >
                    {sel.choice}
                  </span>
                </li>
              ))}
            </ul>
          </details>
        </article>
      ))}
    </div>
  );
}
