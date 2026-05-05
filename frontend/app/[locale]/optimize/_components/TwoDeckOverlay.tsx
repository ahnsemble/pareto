'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { BuildPoint, OptimizeResult } from '../../../lib/wasm-worker';
import { OptimizeResultGrid } from './OptimizeResultGrid';

export type TwoDeckOverlayMode = 'pareto' | 'top5' | 'diff';

export interface TwoDeckOverlayProps {
  deckA: OptimizeResult;
  deckB: OptimizeResult;
  mode: TwoDeckOverlayMode;
  labelA?: string;
  labelB?: string;
  onModeChange?: (mode: TwoDeckOverlayMode) => void;
}

const COLOR_DECK_A = 'var(--color-primary)';
const COLOR_DECK_B = 'var(--color-secondary)';

const MODE_KEYS: { key: TwoDeckOverlayMode; i18nKey: 'modePareto' | 'modeTop5' | 'modeDiff' }[] = [
  { key: 'pareto', i18nKey: 'modePareto' },
  { key: 'top5', i18nKey: 'modeTop5' },
  { key: 'diff', i18nKey: 'modeDiff' },
];

interface ScatterRow {
  damage: number;
  upgrades: number;
  score: number;
  label: string;
  origin?: 'only_a' | 'only_b' | 'both';
}

function pointsToRows(points: BuildPoint[]): ScatterRow[] {
  return points.map((p) => ({
    damage: Number(p.damageFactor.toFixed(3)),
    upgrades: p.upgradeCount,
    score: Number(p.score.toFixed(3)),
    label: p.label,
  }));
}

interface DiffBuckets {
  onlyA: BuildPoint[];
  onlyB: BuildPoint[];
  shared: BuildPoint[];
}

function computeDiff(deckA: OptimizeResult, deckB: OptimizeResult): DiffBuckets {
  const labelsA = new Set(deckA.topBuilds.map((b) => b.label));
  const labelsB = new Set(deckB.topBuilds.map((b) => b.label));
  const onlyA = deckA.topBuilds.filter((b) => !labelsB.has(b.label));
  const onlyB = deckB.topBuilds.filter((b) => !labelsA.has(b.label));
  const shared = deckA.topBuilds.filter((b) => labelsB.has(b.label));
  return { onlyA, onlyB, shared };
}

interface TooltipPayloadEntry {
  payload: ScatterRow;
  name?: string;
}

function ChartTooltip({
  active,
  payload,
  labelA,
  labelB,
}: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  labelA: string;
  labelB: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const p = payload[0].payload;
  const seriesName = payload[0].name ?? '';
  return (
    <div className="rounded border border-[color:var(--color-border)] bg-[color:var(--color-surface-elev)] p-2 font-mono text-xs">
      <div className="mb-1 font-semibold">{p.label}</div>
      <div>
        damage: <span className="text-[color:var(--color-secondary)]">{p.damage}</span>
      </div>
      <div>
        upgrades: <span className="text-[color:var(--color-text)]">{p.upgrades}</span>
      </div>
      <div>
        score: <span className="text-[color:var(--color-accent)]">{p.score}</span>
      </div>
      {seriesName && (
        <div className="mt-1 text-[color:var(--color-text-muted)]">
          {seriesName === labelA ? labelA : seriesName === labelB ? labelB : seriesName}
        </div>
      )}
    </div>
  );
}

function FrontierOverlayChart({
  deckA,
  deckB,
  labelA,
  labelB,
  emptyLabel,
  titleLabel,
}: {
  deckA: OptimizeResult;
  deckB: OptimizeResult;
  labelA: string;
  labelB: string;
  emptyLabel: string;
  titleLabel: string;
}) {
  const rowsA = useMemo(() => pointsToRows(deckA.paretoFrontier), [deckA.paretoFrontier]);
  const rowsB = useMemo(() => pointsToRows(deckB.paretoFrontier), [deckB.paretoFrontier]);
  const isEmpty = rowsA.length === 0 && rowsB.length === 0;

  if (isEmpty) {
    return (
      <div
        role="img"
        aria-labelledby="two-deck-overlay-empty"
        className="flex h-[280px] sm:h-[360px] w-full items-center justify-center rounded-md border border-dashed border-[color:var(--color-border)] p-10 text-center text-sm text-[color:var(--color-text-muted)]"
      >
        <span id="two-deck-overlay-empty">{emptyLabel}</span>
      </div>
    );
  }
  return (
    <div
      role="img"
      aria-labelledby="two-deck-overlay-chart-title"
      className="h-[280px] sm:h-[360px] w-full"
    >
      <h3 id="two-deck-overlay-chart-title" className="sr-only">
        {`${titleLabel} — ${labelA} ${rowsA.length} / ${labelB} ${rowsB.length}`}
      </h3>
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 16, right: 16, bottom: 32, left: 32 }}>
          <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
          <XAxis
            type="number"
            dataKey="damage"
            name="damage"
            tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
            label={{
              value: 'damage factor',
              position: 'insideBottom',
              offset: -10,
              fill: 'var(--color-text-muted)',
              fontSize: 11,
            }}
          />
          <YAxis
            type="number"
            dataKey="upgrades"
            name="upgrades"
            allowDecimals={false}
            tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
            label={{
              value: 'upgrade count',
              angle: -90,
              position: 'insideLeft',
              offset: 0,
              fill: 'var(--color-text-muted)',
              fontSize: 11,
            }}
          />
          <Tooltip
            cursor={{ stroke: 'var(--color-border)' }}
            content={<ChartTooltip labelA={labelA} labelB={labelB} />}
          />
          <Scatter
            name={labelA}
            data={rowsA}
            isAnimationActive={false}
            fill={COLOR_DECK_A}
          >
            {rowsA.map((row, i) => (
              <Cell key={`a-${i}-${row.label}`} fill={COLOR_DECK_A} r={6} fillOpacity={0.95} />
            ))}
          </Scatter>
          <Scatter
            name={labelB}
            data={rowsB}
            isAnimationActive={false}
            fill={COLOR_DECK_B}
          >
            {rowsB.map((row, i) => (
              <Cell key={`b-${i}-${row.label}`} fill={COLOR_DECK_B} r={6} fillOpacity={0.85} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

function DiffCard({
  build,
  variant,
}: {
  build: BuildPoint;
  variant: 'only_a' | 'only_b' | 'shared';
}) {
  const styles =
    variant === 'only_a'
      ? 'border-[color:var(--color-primary)] bg-[color:var(--color-primary)]/5'
      : variant === 'only_b'
        ? 'border-[color:var(--color-secondary)] bg-[color:var(--color-secondary)]/5'
        : 'border-[color:var(--color-border)] bg-[color:var(--color-surface)]';
  return (
    <article
      data-variant={variant}
      data-testid={`two-deck-diff-card-${variant}`}
      className={`rounded-lg border p-4 text-sm ${styles}`}
    >
      <div className="mb-2 font-mono text-xs text-[color:var(--color-text-muted)]">
        {build.label}
      </div>
      <div className="flex items-baseline gap-3 font-mono text-xs">
        <div>
          <div className="text-base text-[color:var(--color-accent)]">{build.score.toFixed(2)}</div>
          <div className="text-[10px] uppercase tracking-wider text-[color:var(--color-text-muted)]">
            score
          </div>
        </div>
        <div>
          <div className="text-base text-[color:var(--color-secondary)]">
            {build.damageFactor.toFixed(2)}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-[color:var(--color-text-muted)]">
            damage
          </div>
        </div>
        <div>
          <div className="text-base text-[color:var(--color-text)]">{build.upgradeCount}</div>
          <div className="text-[10px] uppercase tracking-wider text-[color:var(--color-text-muted)]">
            upgrades
          </div>
        </div>
      </div>
    </article>
  );
}

export function TwoDeckOverlay({
  deckA,
  deckB,
  mode,
  labelA,
  labelB,
  onModeChange,
}: TwoDeckOverlayProps) {
  const t = useTranslations('twoDeck');
  const tFrontier = useTranslations('frontier');
  const resolvedLabelA = labelA ?? tFrontier('deckA');
  const resolvedLabelB = labelB ?? tFrontier('deckB');
  const diff = useMemo(() => computeDiff(deckA, deckB), [deckA, deckB]);

  return (
    <div className="space-y-4" data-testid="two-deck-overlay">
      <div role="tablist" aria-label={t('modeAriaLabel')} className="flex items-center gap-1 rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-0.5 font-mono text-xs">
        {MODE_KEYS.map((m) => {
          const active = mode === m.key;
          return (
            <button
              key={m.key}
              type="button"
              role="tab"
              aria-selected={active}
              data-mode={m.key}
              data-active={active}
              data-testid={`two-deck-mode-${m.key}`}
              onClick={() => onModeChange?.(m.key)}
              className={
                active
                  ? 'min-h-[44px] rounded bg-[color:var(--color-primary)]/15 px-3 py-1.5 text-[color:var(--color-primary)]'
                  : 'min-h-[44px] rounded px-3 py-1.5 text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)]'
              }
            >
              {t(m.i18nKey)}
            </button>
          );
        })}
      </div>

      {mode === 'pareto' && (
        <FrontierOverlayChart
          deckA={deckA}
          deckB={deckB}
          labelA={resolvedLabelA}
          labelB={resolvedLabelB}
          emptyLabel={t('emptyData')}
          titleLabel={tFrontier('paretoFrontier')}
        />
      )}

      {mode === 'top5' && (
        <div className="grid gap-6 lg:grid-cols-2" data-testid="two-deck-top5">
          <div>
            <h3 className="mb-3 font-mono text-xs uppercase tracking-wider text-[color:var(--color-primary)]">
              {resolvedLabelA}
            </h3>
            <OptimizeResultGrid topBuilds={deckA.topBuilds} heroLabel={resolvedLabelA} />
          </div>
          <div>
            <h3 className="mb-3 font-mono text-xs uppercase tracking-wider text-[color:var(--color-secondary)]">
              {resolvedLabelB}
            </h3>
            <OptimizeResultGrid topBuilds={deckB.topBuilds} heroLabel={resolvedLabelB} />
          </div>
        </div>
      )}

      {mode === 'diff' && (
        <div className="space-y-4" data-testid="two-deck-diff">
          <div
            className="flex flex-wrap items-center gap-3 font-mono text-xs"
            data-testid="two-deck-diff-summary"
          >
            <span className="text-[color:var(--color-primary)]">
              {resolvedLabelA} {t('uniqueLabel')} {diff.onlyA.length}
            </span>
            <span className="text-[color:var(--color-text-muted)]">·</span>
            <span className="text-[color:var(--color-secondary)]">
              {resolvedLabelB} {t('uniqueLabel')} {diff.onlyB.length}
            </span>
            <span className="text-[color:var(--color-text-muted)]">·</span>
            <span className="text-[color:var(--color-text-muted)]">{t('sharedLabel')} {diff.shared.length}</span>
          </div>
          {diff.onlyA.length === 0 && diff.onlyB.length === 0 && diff.shared.length === 0 ? (
            <p className="text-sm text-[color:var(--color-text-muted)]">
              {t('emptyBuilds')}
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {diff.onlyA.map((b) => (
                <DiffCard key={`a-${b.label}`} build={b} variant="only_a" />
              ))}
              {diff.onlyB.map((b) => (
                <DiffCard key={`b-${b.label}`} build={b} variant="only_b" />
              ))}
              {diff.shared.map((b) => (
                <DiffCard key={`s-${b.label}`} build={b} variant="shared" />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
