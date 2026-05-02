'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { Link } from '../../../i18n/navigation';
import { COLLECTIBLES, HEROES, HeroOption } from './_components/heroes';
import { OptimizeInputForm } from './_components/OptimizeInputForm';
import { OptimizeResultGrid } from './_components/OptimizeResultGrid';
import { getWorker } from '../../lib/wasm-client';
import type { OptimizeResult } from '../../lib/wasm-worker';

const ParetoFrontierChart = dynamic(
  () =>
    import('./_components/ParetoFrontierChart').then((mod) => mod.ParetoFrontierChart),
  { ssr: false, loading: () => <ChartSkeleton /> },
);

function ChartSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading chart"
      className="h-[360px] w-full animate-pulse rounded-md bg-[color:var(--color-surface)]"
    />
  );
}

type RunState =
  | { phase: 'idle' }
  | { phase: 'initializing' }
  | { phase: 'ready' }
  | { phase: 'computing'; startedAt: number }
  | { phase: 'success'; result: OptimizeResult }
  | { phase: 'error'; message: string };

const TOP_K = 5;

export default function OptimizePage() {
  const [selectedHero, setSelectedHero] = useState<string | null>(null);
  const [ownedSet, setOwnedSet] = useState<Set<number>>(new Set());
  const [run, setRun] = useState<RunState>({ phase: 'initializing' });
  const [showSkeleton, setShowSkeleton] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const skeletonTimer = setTimeout(() => {
      if (!cancelled && run.phase === 'initializing') setShowSkeleton(true);
    }, 200);
    (async () => {
      try {
        await getWorker();
        if (!cancelled) {
          setRun({ phase: 'ready' });
          setShowSkeleton(false);
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : String(err);
          setRun({ phase: 'error', message });
        }
      }
    })();
    return () => {
      cancelled = true;
      clearTimeout(skeletonTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const heroDetail: HeroOption | undefined = useMemo(
    () => HEROES.find((h) => h.id === selectedHero),
    [selectedHero],
  );

  const canOptimize =
    heroDetail !== undefined &&
    (run.phase === 'ready' || run.phase === 'success' || run.phase === 'error');

  const handleToggleCollectible = useCallback((id: number) => {
    setOwnedSet((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleClearCollectibles = useCallback(() => setOwnedSet(new Set()), []);
  const handleSelectAllCollectibles = useCallback(
    () => setOwnedSet(new Set(COLLECTIBLES.map((c) => c.id))),
    [],
  );

  const handleOptimize = useCallback(async () => {
    if (!heroDetail) return;
    const startedAt = performance.now();
    setRun({ phase: 'computing', startedAt });
    try {
      const worker = await getWorker();
      const result = await worker.optimize({
        slotCount: heroDetail.slotCount,
        includeBaseline: heroDetail.includeBaseline,
        tradeoff: heroDetail.tradeoff,
        topK: TOP_K,
        ownedCollectibles: ownedSet.size,
      });
      setRun({ phase: 'success', result });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setRun({ phase: 'error', message });
    }
  }, [heroDetail, ownedSet]);

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-6 py-10">
      <header className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            <span className="text-[color:var(--color-primary)]">Pareto</span>{' '}
            <span className="text-[color:var(--color-text)]">/ optimize</span>
          </h1>
          <p className="mt-1 text-sm text-[color:var(--color-text-muted)]">
            Pick a hero, mark owned collectibles, then run the WASM optimizer in a Web
            Worker. Results plot the Pareto frontier of damage vs. upgrade count.
          </p>
        </div>
        <Link
          href="/"
          className="font-mono text-xs text-[color:var(--color-text-muted)] hover:text-[color:var(--color-primary)]"
        >
          ← /
        </Link>
      </header>

      <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <div className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-elev)] p-5">
          <OptimizeInputForm
            selectedHero={selectedHero}
            onSelectHero={setSelectedHero}
            ownedSet={ownedSet}
            onToggleCollectible={handleToggleCollectible}
            onClearCollectibles={handleClearCollectibles}
            onSelectAllCollectibles={handleSelectAllCollectibles}
          />
          <div className="mt-6 flex items-center gap-3">
            <button
              type="button"
              onClick={handleOptimize}
              disabled={!canOptimize}
              aria-disabled={!canOptimize}
              aria-describedby={!canOptimize ? 'optimize-disabled-reason' : undefined}
              className="min-h-[44px] rounded-md bg-[color:var(--color-primary)] px-4 py-2.5 font-mono text-sm font-semibold text-[color:var(--color-bg)] transition hover:bg-[color:var(--color-primary-strong)] focus-visible:shadow-[var(--shadow-glow-primary)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {run.phase === 'computing' ? 'Optimizing…' : 'Optimize'}
            </button>
            {!heroDetail && (
              <span
                id="optimize-disabled-reason"
                className="text-xs text-[color:var(--color-text-muted)]"
              >
                Select a hero first.
              </span>
            )}
            {run.phase === 'initializing' && (
              <span className="text-xs text-[color:var(--color-text-muted)]">
                Initializing WASM worker…
              </span>
            )}
            {run.phase === 'success' && (
              <span className="font-mono text-xs text-[color:var(--color-text-muted)]">
                {run.result.enumeratedCount} / {run.result.searchSpaceSize} combos in{' '}
                {run.result.durationMs.toFixed(1)}ms
              </span>
            )}
          </div>
          {run.phase === 'initializing' && showSkeleton && (
            <p className="mt-3 text-xs text-[color:var(--color-text-muted)]">
              Loading optimizer…
            </p>
          )}
          {run.phase === 'error' && (
            <p className="mt-3 rounded border border-[color:var(--color-danger)]/40 bg-[color:var(--color-danger)]/10 p-3 text-xs text-[color:var(--color-danger)]">
              Optimization failed: {run.message}
            </p>
          )}
        </div>

        <div className="space-y-6">
          {run.phase === 'success' ? (
            <>
              <div>
                <h2 className="mb-3 text-sm uppercase tracking-wider text-[color:var(--color-text-muted)]">
                  Pareto frontier
                </h2>
                <ParetoFrontierChart
                  allPoints={run.result.allPoints}
                  paretoFrontier={run.result.paretoFrontier}
                  topBuilds={run.result.topBuilds}
                />
                <p className="mt-2 font-mono text-xs text-[color:var(--color-text-muted)]">
                  pipeline summary — score{' '}
                  <span className="text-[color:var(--color-accent)]">
                    {run.result.pipelineSummary.score.toFixed(3)}
                  </span>{' '}
                  / damage{' '}
                  <span className="text-[color:var(--color-secondary)]">
                    {run.result.pipelineSummary.damageFactor.toFixed(3)}
                  </span>{' '}
                  · frontier {run.result.paretoFrontier.length} pts
                </p>
              </div>
              <div>
                <h2 className="mb-3 text-sm uppercase tracking-wider text-[color:var(--color-text-muted)]">
                  Top {TOP_K} builds
                </h2>
                <OptimizeResultGrid
                  topBuilds={run.result.topBuilds}
                  heroLabel={heroDetail?.label ?? '—'}
                />
              </div>
            </>
          ) : run.phase === 'computing' ? (
            <ChartSkeleton />
          ) : (
            <div className="rounded-xl border border-dashed border-[color:var(--color-border)] p-10 text-center text-sm text-[color:var(--color-text-muted)]">
              Configure inputs on the left and press <span className="font-mono">Optimize</span>{' '}
              to see the Pareto frontier and top builds.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
