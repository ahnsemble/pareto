'use client';

import { useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Link } from '../../../i18n/navigation';
import { useParetoStore } from '../../../app/lib/pareto-store/store';
import { selectTechParts } from '../../../app/lib/pareto-store/selectors';
import { isTwinbornCategory, type TwinbornCategory } from '../../../app/lib/pareto-store/tech/types';
import { TechPartConfigModal } from './TechPartConfigModal';
import { TechPartsGrid } from './TechPartsGrid';

const panelClass = 'rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-elev)] p-4';

export function TechPartsPanel() {
  const { parts, configs } = useParetoStore(useShallow(selectTechParts));
  const setTechPartEquipped = useParetoStore((state) => state.setTechPartEquipped);
  const setTechPartMode = useParetoStore((state) => state.setTechPartMode);
  const setTechPartResonance = useParetoStore((state) => state.setTechPartResonance);
  const setTechPartOverload = useParetoStore((state) => state.setTechPartOverload);
  const setTechPartSupportParts = useParetoStore((state) => state.setTechPartSupportParts);
  const [selectedId, setSelectedId] = useState<TwinbornCategory | null>(null);
  const [tracking, setTracking] = useState(false);

  const twinborn = useMemo(() => parts.filter((part) => part.category === 'twinborn'), [parts]);
  const activeSkills = useMemo(() => parts.filter((part) => part.category === 'activeSkill'), [parts]);
  const modeVariants = useMemo(() => parts.filter((part) => part.category === 'modeVariant'), [parts]);
  const selectedPart = selectedId ? twinborn.find((part) => part.id === selectedId) ?? null : null;
  const selectedConfig = selectedId ? configs[selectedId] : null;

  return (
    <section className={panelClass} data-testid="v3-tech-parts-panel">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-xs uppercase tracking-wider text-[color:var(--color-text-muted)]">Tech parts Configuration</h3>
          <p className="text-xs text-[color:var(--color-text-muted)]">
            Twinborn {twinborn.length} · Active Skills {activeSkills.length} · Modes {modeVariants.length}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/v3/optimizer/tech-parts"
            className="inline-flex min-h-[32px] items-center rounded-sm bg-[color:var(--color-primary)] px-3 font-mono text-xs font-semibold text-[color:var(--color-bg)]"
            data-testid="tech-parts-optimize-action"
          >
            Optimize
          </Link>
          <button
            type="button"
            className={`min-h-[32px] rounded-sm border px-3 font-mono text-xs ${
              tracking
                ? 'border-[color:var(--color-accent)] bg-[color:var(--color-accent)]/15 text-[color:var(--color-accent)]'
                : 'border-[color:var(--color-border)] text-[color:var(--color-text-muted)]'
            }`}
            data-testid="tech-parts-track-action"
            onClick={() => setTracking((current) => !current)}
          >
            Track
          </button>
        </div>
      </div>

      <div className="space-y-5">
        <TechPartsGrid
          title="Twinborn parts"
          testId="tech-twinborn-grid"
          entries={twinborn}
          configs={configs}
          onOpenConfig={(id) => {
            if (isTwinbornCategory(id)) setSelectedId(id);
          }}
        />
        <TechPartsGrid title="Active Skills" testId="tech-active-skills-grid" entries={activeSkills} configs={configs} />
        <TechPartsGrid title="Mode variants" testId="tech-mode-variants-grid" entries={modeVariants} configs={configs} />
      </div>

      <TechPartConfigModal
        part={selectedPart}
        config={selectedConfig}
        onClose={() => setSelectedId(null)}
        onEquip={setTechPartEquipped}
        onMode={setTechPartMode}
        onResonance={setTechPartResonance}
        onOverload={setTechPartOverload}
        onSupportParts={setTechPartSupportParts}
      />
    </section>
  );
}
