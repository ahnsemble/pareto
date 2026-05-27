'use client';

import { useMemo } from 'react';
import { useParetoStore } from '../../app/lib/pareto-store/store';
import {
  PLAYER_INPUT_CATEGORIES,
  PLAYER_INPUT_FIELD_SPECS,
} from '../../app/lib/pareto-store/playerState';

const cardClass = 'rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-elev)] p-4';
const sectionTitleClass = 'mb-2 text-xs uppercase tracking-wider text-[color:var(--color-text-muted)]';

export function PlayerStateCoveragePanel() {
  const combatMode = useParetoStore((state) => state.mode);
  const fieldCount = PLAYER_INPUT_FIELD_SPECS.length;
  const categoryRows = useMemo(
    () => PLAYER_INPUT_CATEGORIES.map((category) => ({
      category,
      fields: PLAYER_INPUT_FIELD_SPECS.filter((field) => field.category === category),
    })),
    [],
  );

  return (
    <section className={cardClass} data-testid="v3-profile-coverage-panel">
      <h3 className={sectionTitleClass}>Profile input coverage</h3>
      <div className="grid gap-2 text-xs sm:grid-cols-3">
        <p>
          Categories:{' '}
          <span className="font-mono text-[color:var(--color-accent)]" data-testid="v3-profile-category-count">
            {PLAYER_INPUT_CATEGORIES.length}
          </span>
        </p>
        <p>
          Fields:{' '}
          <span className="font-mono text-[color:var(--color-accent)]" data-testid="v3-profile-field-count">
            {fieldCount}
          </span>
        </p>
        <p>
          Mode:{' '}
          <span className="font-mono text-[color:var(--color-accent)]">
            {combatMode}
          </span>
        </p>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {categoryRows.map(({ category, fields }) => (
          <div
            key={category}
            className="rounded-md border border-[color:var(--color-border)] p-2"
            data-testid="v3-profile-category"
          >
            <p className="font-mono text-xs text-[color:var(--color-primary)]">
              {category} · {fields.length}
            </p>
            <ul className="mt-1 max-h-28 overflow-y-auto text-[11px] leading-5 text-[color:var(--color-text-muted)]">
              {fields.map((field) => (
                <li key={`${field.category}-${field.label}`}>
                  <span>{field.label}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
