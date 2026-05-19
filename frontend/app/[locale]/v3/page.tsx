'use client';

// P4 V3 page — mounts 15 React components and boots store with 8 count check invariants.

import { useEffect, useState } from 'react';
import { Link } from '../../../i18n/navigation';
import { bootParetoStore, useParetoStore } from '../../lib/pareto-store/store';
import { initWasm } from '../../lib/wasm';
import {
  ModeSelectDropdown, OutputPanel, BaseInputsBox, ItemSelectGrids, WeaponUpgradeSlider,
  TechSelectArray, SkillChoices, OptimizationTable, HeroSelectModal, CollectiblesAccordion,
  TalentTurfMatrix, PetSelectRadio, XenoDetailsPanel, ReviveSettingsToggle, ResourceLockButton,
} from '../../../components/v3';
import { PlayerStateCoveragePanel } from '../../../components/v3/PlayerStateCoveragePanel';

export default function V3Page() {
  const [bootStatus, setBootStatus] = useState<'pending' | 'ok' | string>('pending');

  useEffect(() => {
    let mounted = true;
    initWasm()
      .then(() => {
        if (!mounted) return;
        bootParetoStore();
        setBootStatus('ok');
        // Expose store on window for smoke-test introspection (T7 S6)
        (window as unknown as { __useParetoStore?: typeof useParetoStore }).__useParetoStore = useParetoStore;
      })
      .catch((err) => {
        if (!mounted) return;
        const message = err instanceof Error ? err.message : String(err);
        setBootStatus(message);
        console.error(message);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <main className="mx-auto max-w-6xl space-y-4 p-6">
      <header className="border-b border-[color:var(--color-border)]/50 pb-2">
        <h1 className="text-2xl font-semibold">
          <span className="text-[color:var(--color-primary)]">Pareto</span>{' '}
          <span className="text-[color:var(--color-text)]">/ v3</span>
        </h1>
        <p className="text-xs text-[color:var(--color-text-muted)]">
          V3 4축 통합 calculator — 11 slice / 13 selector / 15 component / 4 debounced inputs / 68 i18n entries
        </p>
        <p
          className={`mt-1 text-xs font-mono ${bootStatus === 'ok' ? 'text-[color:var(--color-accent)]' : bootStatus === 'pending' ? 'text-[color:var(--color-text-muted)]' : 'text-[color:var(--color-danger)]'}`}
          data-testid="v3-boot-status"
        >
          {bootStatus === 'pending' ? 'Booting store…' : bootStatus === 'ok' ? '[ParetoStore] Boot OK — 8/8 invariants passed.' : bootStatus}
        </p>
        <nav className="mt-3 flex flex-wrap gap-2">
          <Link
            href="/v3/optimizer/relic-core"
            className="inline-flex min-h-[44px] items-center rounded-md border border-[color:var(--color-primary)] px-3 py-2 font-mono text-xs text-[color:var(--color-primary)] hover:bg-[color:var(--color-primary)]/10"
            data-testid="v3-nav-relic-core"
          >
            Relic Core
          </Link>
          <Link
            href="/v3/optimizer/twinborn-auto-assign"
            className="inline-flex min-h-[44px] items-center rounded-md border border-[color:var(--color-secondary)] px-3 py-2 font-mono text-xs text-[color:var(--color-secondary)] hover:bg-[color:var(--color-secondary)]/10"
            data-testid="v3-nav-twinborn-auto-assign"
          >
            Twinborn
          </Link>
        </nav>
      </header>

      {bootStatus === 'ok' && (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <div className="space-y-4">
            <ModeSelectDropdown />
            <BaseInputsBox />
            <HeroSelectModal />
            <ItemSelectGrids />
            <WeaponUpgradeSlider />
            <TechSelectArray />
            <PetSelectRadio />
            <XenoDetailsPanel />
            <ReviveSettingsToggle />
          </div>
          <div className="space-y-4">
            <OutputPanel />
            <PlayerStateCoveragePanel />
            <OptimizationTable />
            <SkillChoices />
            <CollectiblesAccordion />
            <TalentTurfMatrix />
            <ResourceLockButton resourceId="designs_owned" limit={100} />
          </div>
        </div>
      )}
    </main>
  );
}
