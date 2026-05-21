'use client';

import type { TechPartConfigMap } from '../../../app/lib/pareto-store/tech/types';
import type { TechPartSchema } from '../../../app/lib/pareto-store/types';
import { TechHexagonCard } from './TechHexagonCard';

interface TechPartsGridProps {
  title: string;
  testId: string;
  entries: TechPartSchema[];
  configs: TechPartConfigMap;
  onOpenConfig?: (id: string) => void;
}

export function TechPartsGrid({ title, testId, entries, configs, onOpenConfig }: TechPartsGridProps) {
  return (
    <div data-testid={testId}>
      <h4 className="mb-2 text-[11px] uppercase tracking-wide text-[color:var(--color-text-muted)]">{title}</h4>
      <div className="grid grid-cols-4 gap-x-3 gap-y-4 sm:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8">
        {entries.map((entry) => {
          const config = configs[entry.id as keyof TechPartConfigMap];
          const detail = config
            ? `${config.mode ?? 'no mode'} · ${config.resonance}`
            : entry.category === 'modeVariant'
              ? entry.base_skill_id ?? ''
              : '';
          return (
            <TechHexagonCard
              key={entry.id}
              id={entry.id}
              label={entry.display_name_en}
              detail={detail}
              active={config?.equipped ?? false}
              locked={entry.id === 'ammoThruster' || entry.id === 'heFuel'}
              onClick={config && onOpenConfig ? () => onOpenConfig(entry.id) : undefined}
            />
          );
        })}
      </div>
    </div>
  );
}
