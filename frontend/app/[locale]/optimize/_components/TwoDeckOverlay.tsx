'use client';

import type { OptimizeResult } from '../../../lib/wasm-worker';

export type TwoDeckOverlayMode = 'pareto' | 'top5' | 'diff';

export interface TwoDeckOverlayProps {
  deckA: OptimizeResult;
  deckB: OptimizeResult;
  mode: TwoDeckOverlayMode;
  labelA?: string;
  labelB?: string;
}

export function TwoDeckOverlay({
  deckA,
  deckB,
  mode,
  labelA = 'Deck A',
  labelB = 'Deck B',
}: TwoDeckOverlayProps) {
  return (
    <div
      className="rounded-md border border-dashed border-[color:var(--color-border)] p-4 text-xs text-[color:var(--color-text-muted)]"
      data-testid="two-deck-overlay-placeholder"
    >
      <div className="mb-2 font-mono uppercase tracking-wider">
        TwoDeckOverlay placeholder ({mode})
      </div>
      <div>
        {labelA}: {deckA.topBuilds.length} top / {deckA.paretoFrontier.length} frontier
      </div>
      <div>
        {labelB}: {deckB.topBuilds.length} top / {deckB.paretoFrontier.length} frontier
      </div>
      <div className="mt-2">
        Phase 4 Session 4 will implement the full overlay (Zustand cross-component state +
        recharts dual-series Scatter).
      </div>
    </div>
  );
}
