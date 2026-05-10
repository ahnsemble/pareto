'use client';

import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { Link } from '../../../i18n/navigation';
import { COLLECTIBLES, HEROES, HeroOption } from './_components/heroes';
import { OptimizeInputForm } from './_components/OptimizeInputForm';
import { OptimizeResultGrid } from './_components/OptimizeResultGrid';
import {
  EquipmentSlotId,
  EquippedMap,
  EQUIPMENT_SLOTS,
  equipmentDelta,
} from './_components/equipment';
import { PETS, PET_STATE_IDS, PetStateId, petDelta } from './_components/pets';
import { getWorker } from '../../lib/wasm-client';
import type { OptimizeResult } from '../../lib/wasm-worker';
import type { TwoDeckOverlayMode } from './_components/TwoDeckOverlay';

const ParetoFrontierChart = dynamic(
  () =>
    import('./_components/ParetoFrontierChart').then((mod) => mod.ParetoFrontierChart),
  { ssr: false, loading: () => <ChartSkeletonFallback /> },
);

const TwoDeckOverlay = dynamic(
  () => import('./_components/TwoDeckOverlay').then((mod) => mod.TwoDeckOverlay),
  { ssr: false, loading: () => <ChartSkeletonFallback /> },
);

function ChartSkeletonFallback() {
  return (
    <div
      role="status"
      aria-label="Loading chart"
      className="h-[280px] sm:h-[360px] w-full animate-pulse rounded-md bg-[color:var(--color-surface)]"
    />
  );
}

function ChartSkeleton() {
  const t = useTranslations('optimize');
  return (
    <div
      role="status"
      aria-label={t('chartLoading')}
      className="h-[280px] sm:h-[360px] w-full animate-pulse rounded-md bg-[color:var(--color-surface)]"
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
const SHARE_QUERY_VERSION = '1';

type ShareCopyState = 'idle' | 'copied' | 'manual';

function parseOwnedParam(value: string | null): Set<number> {
  const ids = new Set<number>();
  if (!value) return ids;
  for (const token of value.split(',')) {
    const id = Number(token);
    if (Number.isInteger(id) && id >= 0 && id < COLLECTIBLES.length) {
      ids.add(id);
    }
  }
  return ids;
}

function serializeOwnedParam(ownedSet: Set<number>): string {
  return Array.from(ownedSet)
    .sort((a, b) => a - b)
    .join(',');
}

function parseEquippedParams(params: URLSearchParams): EquippedMap {
  const next: EquippedMap = {};
  for (const slot of EQUIPMENT_SLOTS) {
    const itemId = params.get(`eq_${slot.id}`);
    if (itemId && slot.options.some((option) => option.id === itemId)) {
      next[slot.id] = itemId;
    }
  }
  return next;
}

function applyEquippedParams(params: URLSearchParams, equipped: EquippedMap) {
  for (const slot of EQUIPMENT_SLOTS) {
    const itemId = equipped[slot.id];
    if (itemId) params.set(`eq_${slot.id}`, itemId);
  }
}

export default function OptimizePage() {
  const t = useTranslations('optimize');
  const tTwoDeck = useTranslations('twoDeck');
  const [selectedHero, setSelectedHero] = useState<string | null>(null);
  const [ownedSet, setOwnedSet] = useState<Set<number>>(new Set());
  const [equipped, setEquipped] = useState<EquippedMap>({});
  const [selectedPet, setSelectedPet] = useState<string | null>(null);
  const [petState, setPetState] = useState<PetStateId>('early');
  const [run, setRun] = useState<RunState>({ phase: 'initializing' });
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [deckASnapshot, setDeckASnapshot] = useState<{ result: OptimizeResult; heroLabel: string } | null>(null);
  const [deckBSnapshot, setDeckBSnapshot] = useState<{ result: OptimizeResult; heroLabel: string } | null>(null);
  const [overlayMode, setOverlayMode] = useState<TwoDeckOverlayMode>('pareto');
  const [shareUrl, setShareUrl] = useState('');
  const [shareCopyState, setShareCopyState] = useState<ShareCopyState>('idle');

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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('pf') !== SHARE_QUERY_VERSION && !params.has('hero')) return;

    const hero = params.get('hero');
    if (hero && HEROES.some((h) => h.id === hero)) {
      setSelectedHero(hero);
    }

    setOwnedSet(parseOwnedParam(params.get('owned')));
    setEquipped(parseEquippedParams(params));

    const pet = params.get('pet');
    if (pet && PETS.some((p) => p.id === pet)) {
      setSelectedPet(pet);
    }

    const requestedPetState = params.get('petState');
    if (
      requestedPetState &&
      PET_STATE_IDS.includes(requestedPetState as PetStateId)
    ) {
      setPetState(requestedPetState as PetStateId);
    }
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

  const handleEquipChange = useCallback((slotId: EquipmentSlotId, itemId: string) => {
    setEquipped((prev) => {
      const next = { ...prev };
      if (itemId) next[slotId] = itemId;
      else delete next[slotId];
      return next;
    });
  }, []);

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
        equipmentDelta: equipmentDelta(equipped),
        petDelta: petDelta(selectedPet ? { id: selectedPet, state: petState } : null),
      });
      setRun({ phase: 'success', result });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setRun({ phase: 'error', message });
    }
  }, [heroDetail, ownedSet, equipped, selectedPet, petState]);

  const buildShareUrl = useCallback(() => {
    const url = new URL(window.location.href);
    const params = new URLSearchParams();
    params.set('pf', SHARE_QUERY_VERSION);
    if (selectedHero) params.set('hero', selectedHero);
    const owned = serializeOwnedParam(ownedSet);
    if (owned) params.set('owned', owned);
    applyEquippedParams(params, equipped);
    if (selectedPet) params.set('pet', selectedPet);
    params.set('petState', petState);
    url.search = params.toString();
    url.hash = '';
    return url.toString();
  }, [selectedHero, ownedSet, equipped, selectedPet, petState]);

  const handleShare = useCallback(async () => {
    const nextShareUrl = buildShareUrl();
    setShareUrl(nextShareUrl);
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(nextShareUrl);
        setShareCopyState('copied');
        return;
      }
    } catch {
      // Fall through to the visible URL field when clipboard permission is denied.
    }
    setShareCopyState('manual');
  }, [buildShareUrl]);

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-6 py-10">
      <header className="sticky top-0 z-10 -mx-6 border-b border-[color:var(--color-border)]/50 bg-[color:var(--color-bg)] px-6 pb-4 pt-2 flex items-baseline justify-between">
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
            equipped={equipped}
            onEquipChange={handleEquipChange}
            selectedPet={selectedPet}
            onSelectPet={setSelectedPet}
            petState={petState}
            onPetStateChange={setPetState}
          />
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={handleOptimize}
              disabled={!canOptimize}
              aria-disabled={!canOptimize}
              aria-describedby={!canOptimize ? 'optimize-disabled-reason' : undefined}
              className="min-h-[44px] w-full sm:w-auto rounded-md bg-[color:var(--color-primary)] px-4 py-2.5 font-mono text-sm font-semibold text-[color:var(--color-bg)] transition hover:bg-[color:var(--color-primary-strong)] focus-visible:shadow-[var(--shadow-glow-primary)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {run.phase === 'computing' ? t('ctaComputing') : t('ctaRun')}
            </button>
            {!heroDetail && (
              <span
                id="optimize-disabled-reason"
                className="text-xs text-[color:var(--color-text-muted)]"
              >
                {t('ctaHeroFirst')}
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
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  data-testid="save-as-deck-a"
                  onClick={() =>
                    setDeckASnapshot({ result: run.result, heroLabel: heroDetail?.label ?? '—' })
                  }
                  className="min-h-[44px] rounded-md border border-[color:var(--color-primary)] px-4 py-2 font-mono text-xs text-[color:var(--color-primary)] hover:bg-[color:var(--color-primary)]/10"
                >
                  {tTwoDeck('saveAsDeckA')}
                </button>
                <button
                  type="button"
                  data-testid="save-as-deck-b"
                  onClick={() =>
                    setDeckBSnapshot({ result: run.result, heroLabel: heroDetail?.label ?? '—' })
                  }
                  className="min-h-[44px] rounded-md border border-[color:var(--color-secondary)] px-4 py-2 font-mono text-xs text-[color:var(--color-secondary)] hover:bg-[color:var(--color-secondary)]/10"
                >
                  {tTwoDeck('saveAsDeckB')}
                </button>
                <button
                  type="button"
                  data-testid="share-url-button"
                  onClick={handleShare}
                  className="min-h-[44px] rounded-md border border-[color:var(--color-accent)] px-4 py-2 font-mono text-xs text-[color:var(--color-accent)] hover:bg-[color:var(--color-accent)]/10"
                >
                  Copy share URL
                </button>
                {(deckASnapshot || deckBSnapshot) && (
                  <button
                    type="button"
                    data-testid="clear-deck-snapshots"
                    onClick={() => {
                      setDeckASnapshot(null);
                      setDeckBSnapshot(null);
                    }}
                    className="min-h-[44px] rounded-md border border-[color:var(--color-border)] px-4 py-2 font-mono text-xs text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)]"
                  >
                    {tTwoDeck('clearSnapshots')}
                  </button>
                )}
              </div>
              {shareUrl && (
                <div className="rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-3">
                  <label
                    htmlFor="share-url-output"
                    className="mb-2 block text-xs uppercase tracking-wider text-[color:var(--color-text-muted)]"
                  >
                    Share URL
                  </label>
                  <input
                    id="share-url-output"
                    data-testid="share-url-output"
                    readOnly
                    value={shareUrl}
                    onFocus={(event) => event.currentTarget.select()}
                    className="w-full rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 py-2 font-mono text-xs text-[color:var(--color-text)]"
                  />
                  <p
                    data-testid="share-url-status"
                    className="mt-2 text-xs text-[color:var(--color-text-muted)]"
                  >
                    {shareCopyState === 'copied'
                      ? 'Copied to clipboard.'
                      : 'Copy the URL manually.'}
                  </p>
                </div>
              )}
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

      {(deckASnapshot || deckBSnapshot) && (
        <section
          data-testid="two-deck-section"
          className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-elev)] p-5"
        >
          <header className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-sm uppercase tracking-wider text-[color:var(--color-text-muted)]">
              {tTwoDeck('section')}
            </h2>
            <p className="font-mono text-xs text-[color:var(--color-text-muted)]">
              A:{' '}
              <span className="text-[color:var(--color-primary)]">
                {deckASnapshot?.heroLabel ?? tTwoDeck('deckUnset')}
              </span>
              {' · '}
              B:{' '}
              <span className="text-[color:var(--color-secondary)]">
                {deckBSnapshot?.heroLabel ?? tTwoDeck('deckUnset')}
              </span>
            </p>
          </header>
          {deckASnapshot && deckBSnapshot ? (
            <TwoDeckOverlay
              deckA={deckASnapshot.result}
              deckB={deckBSnapshot.result}
              labelA={deckASnapshot.heroLabel}
              labelB={deckBSnapshot.heroLabel}
              mode={overlayMode}
              onModeChange={setOverlayMode}
            />
          ) : (
            <p
              data-testid="two-deck-overlay-pending"
              className="text-sm text-[color:var(--color-text-muted)]"
            >
              {deckASnapshot ? tTwoDeck('pendingB') : tTwoDeck('pendingA')}
            </p>
          )}
        </section>
      )}
    </main>
  );
}
