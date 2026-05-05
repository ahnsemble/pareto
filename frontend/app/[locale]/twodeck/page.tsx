'use client';

import dynamic from 'next/dynamic';
import { useCallback, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '../../../i18n/navigation';
import type {
  DiffPoint,
  FrontierPoint,
  TwoDeckMode,
} from '../../../components/charts/TwoDeckChart';

// Sprint G.6 A T3: dynamic import with ssr:false eliminates Recharts ResponsiveContainer
// width(-1)/height(-1) warnings emitted during SSR pre-render.
const TwoDeckChart = dynamic(
  () => import('../../../components/charts/TwoDeckChart').then((mod) => mod.TwoDeckChart),
  {
    ssr: false,
    loading: () => (
      <div
        role="status"
        aria-label="Loading chart"
        className="h-[280px] sm:h-[360px] w-full animate-pulse rounded-md bg-[color:var(--color-surface)]"
      />
    ),
  },
);

interface SimpleResult {
  label: string;
  score: number;
  damageFactor: number;
}

const SAMPLE_DECK_A: SimpleResult[] = [
  { label: 'A1', score: 1.0, damageFactor: 1.0 },
  { label: 'A2', score: 2.0, damageFactor: 0.5 },
  { label: 'A3', score: 0.5, damageFactor: 2.0 },
  { label: 'A4', score: 1.5, damageFactor: 1.5 },
];

const SAMPLE_DECK_B: SimpleResult[] = [
  { label: 'B1', score: 1.2, damageFactor: 1.1 },
  { label: 'B2', score: 2.5, damageFactor: 0.4 },
  { label: 'B3', score: 0.3, damageFactor: 2.4 },
  { label: 'B4', score: 1.8, damageFactor: 1.2 },
];

function dominates(left: SimpleResult, right: SimpleResult): boolean {
  const notWorse = left.score >= right.score && left.damageFactor >= right.damageFactor;
  const strictlyBetter = left.score > right.score || left.damageFactor > right.damageFactor;
  return notWorse && strictlyBetter;
}

function paretoFrontier(points: SimpleResult[]): FrontierPoint[] {
  const frontier: SimpleResult[] = [];
  for (const candidate of points) {
    if (frontier.some((p) => dominates(p, candidate))) continue;
    while (frontier.some((p) => dominates(candidate, p))) {
      const idx = frontier.findIndex((p) => dominates(candidate, p));
      frontier.splice(idx, 1);
    }
    frontier.push(candidate);
  }
  return frontier
    .slice()
    .sort((a, b) => b.score - a.score || b.damageFactor - a.damageFactor);
}

function pointsEqual(a: FrontierPoint, b: FrontierPoint): boolean {
  return a.label === b.label && a.score === b.score && a.damageFactor === b.damageFactor;
}

interface ParsedDecks {
  deckA: SimpleResult[];
  deckB: SimpleResult[];
  error: string | null;
}

function parseDeckJson(input: string, fallback: SimpleResult[]): SimpleResult[] | string {
  if (!input.trim()) return fallback;
  try {
    const parsed = JSON.parse(input);
    if (!Array.isArray(parsed)) return 'expected JSON array';
    for (const item of parsed) {
      if (
        typeof item !== 'object' ||
        item === null ||
        typeof item.label !== 'string' ||
        typeof item.score !== 'number' ||
        typeof item.damageFactor !== 'number'
      ) {
        return 'each item must have { label, score, damageFactor }';
      }
    }
    return parsed as SimpleResult[];
  } catch (e) {
    return e instanceof Error ? e.message : 'JSON parse error';
  }
}

export default function TwoDeckPage() {
  const tNav = useTranslations('nav');
  const tFrontier = useTranslations('frontier');
  const tAction = useTranslations('action');

  const [deckAJson, setDeckAJson] = useState(JSON.stringify(SAMPLE_DECK_A, null, 2));
  const [deckBJson, setDeckBJson] = useState(JSON.stringify(SAMPLE_DECK_B, null, 2));
  const [mode, setMode] = useState<TwoDeckMode>('pareto');

  const parsed: ParsedDecks = useMemo(() => {
    const a = parseDeckJson(deckAJson, SAMPLE_DECK_A);
    if (typeof a === 'string') return { deckA: SAMPLE_DECK_A, deckB: SAMPLE_DECK_B, error: `Deck A: ${a}` };
    const b = parseDeckJson(deckBJson, SAMPLE_DECK_B);
    if (typeof b === 'string') return { deckA: a, deckB: SAMPLE_DECK_B, error: `Deck B: ${b}` };
    return { deckA: a, deckB: b, error: null };
  }, [deckAJson, deckBJson]);

  const computed = useMemo(() => {
    const deckAFrontier = paretoFrontier(parsed.deckA);
    const deckBFrontier = paretoFrontier(parsed.deckB);
    const combined = paretoFrontier([...parsed.deckA, ...parsed.deckB]);
    const top5: [FrontierPoint[], FrontierPoint[]] = [
      deckAFrontier.slice(0, 5),
      deckBFrontier.slice(0, 5),
    ];
    const diff: DiffPoint[] = combined.map((point) => {
      const inA = deckAFrontier.some((p) => pointsEqual(p, point));
      const inB = deckBFrontier.some((p) => pointsEqual(p, point));
      const origin: DiffPoint['origin'] = inA && inB ? 'both' : inA ? 'only_a' : 'only_b';
      return { ...point, origin };
    });
    return { deckAFrontier, deckBFrontier, combined, top5, diff };
  }, [parsed.deckA, parsed.deckB]);

  const handleExport = useCallback(
    (format: 'json' | 'csv') => {
      const payload = {
        mode,
        deckA: computed.deckAFrontier,
        deckB: computed.deckBFrontier,
        modePareto: computed.combined,
        modeTop5: computed.top5,
        modeDiff: computed.diff,
      };
      let blob: Blob;
      let filename: string;
      if (format === 'json') {
        blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        filename = 'twodeck.json';
      } else {
        const rows = ['origin,label,score,damageFactor'];
        computed.diff.forEach((d) => {
          rows.push(`${d.origin},${d.label},${d.score},${d.damageFactor}`);
        });
        blob = new Blob([rows.join('\n')], { type: 'text/csv' });
        filename = 'twodeck.csv';
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    },
    [mode, computed],
  );

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-6 py-10">
      <header className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            <span className="text-[color:var(--color-primary)]">Pareto</span>{' '}
            <span className="text-[color:var(--color-text)]">/ {tNav('twodeck').toLowerCase()}</span>
          </h1>
          <p className="mt-1 text-sm text-[color:var(--color-text-muted)]">
            {tFrontier('comparison')} — {tFrontier('deckA')} vs {tFrontier('deckB')}
          </p>
        </div>
        <Link
          href="/"
          className="font-mono text-xs text-[color:var(--color-text-muted)] hover:text-[color:var(--color-primary)]"
        >
          ← /
        </Link>
      </header>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="deck-a-input" className="font-mono text-xs uppercase tracking-wider text-[color:var(--color-text-muted)]">
            {tFrontier('deckA')} (JSON)
          </label>
          <textarea
            id="deck-a-input"
            value={deckAJson}
            onChange={(e) => setDeckAJson(e.target.value)}
            rows={8}
            className="w-full rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-3 font-mono text-xs"
            data-testid="deck-a-input"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="deck-b-input" className="font-mono text-xs uppercase tracking-wider text-[color:var(--color-text-muted)]">
            {tFrontier('deckB')} (JSON)
          </label>
          <textarea
            id="deck-b-input"
            value={deckBJson}
            onChange={(e) => setDeckBJson(e.target.value)}
            rows={8}
            className="w-full rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-3 font-mono text-xs"
            data-testid="deck-b-input"
          />
        </div>
      </section>

      {parsed.error && (
        <p className="rounded border border-[color:var(--color-danger)]/40 bg-[color:var(--color-danger)]/10 p-3 font-mono text-xs text-[color:var(--color-danger)]">
          {parsed.error}
        </p>
      )}

      <section data-testid="twodeck-chart-section">
        <TwoDeckChart
          deckA={computed.deckAFrontier}
          deckB={computed.deckBFrontier}
          mode={mode}
          modePareto={computed.combined}
          modeTop5={computed.top5}
          modeDiff={computed.diff}
          onModeChange={setMode}
        />
      </section>

      <section className="flex gap-3">
        <button
          type="button"
          onClick={() => handleExport('json')}
          className="min-h-[44px] rounded-md border border-[color:var(--color-border)] px-4 py-2 font-mono text-xs hover:border-[color:var(--color-primary)]"
          data-testid="export-json"
        >
          {tAction('export')} JSON
        </button>
        <button
          type="button"
          onClick={() => handleExport('csv')}
          className="min-h-[44px] rounded-md border border-[color:var(--color-border)] px-4 py-2 font-mono text-xs hover:border-[color:var(--color-primary)]"
          data-testid="export-csv"
        >
          {tAction('export')} CSV
        </button>
      </section>
    </main>
  );
}
