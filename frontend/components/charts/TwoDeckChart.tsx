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

export type TwoDeckMode = 'pareto' | 'top5' | 'diff';

export interface FrontierPoint {
  label: string;
  score: number;
  damageFactor: number;
}

export interface DiffPoint extends FrontierPoint {
  origin: 'only_a' | 'only_b' | 'both';
}

export interface TwoDeckChartProps {
  deckA: FrontierPoint[];
  deckB: FrontierPoint[];
  mode: TwoDeckMode;
  modePareto: FrontierPoint[];
  modeTop5: [FrontierPoint[], FrontierPoint[]];
  modeDiff: DiffPoint[];
  onModeChange: (mode: TwoDeckMode) => void;
}

const COLOR_DECK_A = '#8b5cf6';
const COLOR_DECK_B = '#06b6d4';

interface ScatterRow {
  damage: number;
  score: number;
  label: string;
  origin?: 'only_a' | 'only_b' | 'both';
}

function asRows(points: FrontierPoint[]): ScatterRow[] {
  return points.map((p) => ({
    damage: Number(p.damageFactor.toFixed(3)),
    score: Number(p.score.toFixed(3)),
    label: p.label,
  }));
}

function diffRows(points: DiffPoint[], origin: 'only_a' | 'only_b' | 'both'): ScatterRow[] {
  return points
    .filter((d) => d.origin === origin)
    .map((d) => ({
      damage: Number(d.damageFactor.toFixed(3)),
      score: Number(d.score.toFixed(3)),
      label: d.label,
      origin: d.origin,
    }));
}

interface TooltipEntry {
  payload: ScatterRow & { __series?: 'A' | 'B' | 'diff' };
}

function ChartTooltip({
  active,
  payload,
  labels,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  labels: { score: string; deckA: string; deckB: string; tradeOff: string };
}) {
  if (!active || !payload || payload.length === 0) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded border border-[color:var(--color-border)] bg-[color:var(--color-surface-elev)] p-2 font-mono text-xs">
      <div className="mb-1 font-semibold">{p.label}</div>
      <div>{labels.tradeOff}: <span className="text-[color:var(--color-secondary)]">{p.damage}</span></div>
      <div>{labels.score}: <span className="text-[color:var(--color-accent)]">{p.score}</span></div>
      {p.origin && (
        <div className="mt-1 text-[color:var(--color-text-muted)]">
          {p.origin === 'only_a' ? labels.deckA : p.origin === 'only_b' ? labels.deckB : 'A ∩ B'}
        </div>
      )}
    </div>
  );
}

export function TwoDeckChart({
  deckA,
  deckB,
  mode,
  modePareto,
  modeTop5,
  modeDiff,
  onModeChange,
}: TwoDeckChartProps) {
  const tFrontier = useTranslations('frontier');
  const tCard = useTranslations('card');

  const labels = {
    score: tCard('stat'),
    deckA: tFrontier('deckA'),
    deckB: tFrontier('deckB'),
    tradeOff: tFrontier('tradeOff'),
  };

  const { seriesA, seriesB, seriesBoth } = useMemo(() => {
    if (mode === 'pareto') {
      return {
        seriesA: asRows(deckA),
        seriesB: asRows(deckB),
        seriesBoth: asRows(modePareto),
      };
    }
    if (mode === 'top5') {
      return {
        seriesA: asRows(modeTop5[0]),
        seriesB: asRows(modeTop5[1]),
        seriesBoth: [] as ScatterRow[],
      };
    }
    return {
      seriesA: diffRows(modeDiff, 'only_a'),
      seriesB: diffRows(modeDiff, 'only_b'),
      seriesBoth: diffRows(modeDiff, 'both'),
    };
  }, [mode, deckA, deckB, modePareto, modeTop5, modeDiff]);

  const isEmpty = seriesA.length === 0 && seriesB.length === 0 && seriesBoth.length === 0;

  return (
    <div className="space-y-4">
      <div role="tablist" aria-label="chart mode" className="flex gap-2 font-mono text-xs">
        {(['pareto', 'top5', 'diff'] as const).map((m) => {
          const isActive = mode === m;
          const labelMap = {
            pareto: tFrontier('paretoFrontier'),
            top5: tFrontier('top5'),
            diff: tFrontier('diffHighlight'),
          };
          return (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onModeChange(m)}
              data-mode={m}
              data-active={isActive}
              className={`min-h-[36px] rounded-md border px-3 py-1.5 transition ${
                isActive
                  ? 'border-[color:var(--color-primary)] bg-[color:var(--color-primary)]/10 text-[color:var(--color-primary)]'
                  : 'border-[color:var(--color-border)] text-[color:var(--color-text-muted)] hover:border-[color:var(--color-text-muted)]'
              }`}
            >
              {labelMap[m]}
            </button>
          );
        })}
      </div>

      {isEmpty ? (
        <div
          role="img"
          aria-labelledby="twodeck-chart-empty"
          className="flex h-[360px] w-full items-center justify-center rounded-md border border-dashed border-[color:var(--color-border)] p-10 text-center text-sm text-[color:var(--color-text-muted)]"
        >
          <span id="twodeck-chart-empty">{tFrontier('comparison')}</span>
        </div>
      ) : (
        <div role="img" aria-labelledby="twodeck-chart-title" className="h-[360px] w-full">
          <h3 id="twodeck-chart-title" className="sr-only">
            {`${tFrontier('paretoFrontier')} — ${tFrontier('deckA')} ${seriesA.length} / ${tFrontier('deckB')} ${seriesB.length}`}
          </h3>
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 16, right: 16, bottom: 32, left: 32 }}>
              <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
              <XAxis
                type="number"
                dataKey="damage"
                tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
                label={{
                  value: tFrontier('tradeOff'),
                  position: 'insideBottom',
                  offset: -10,
                  fill: 'var(--color-text-muted)',
                  fontSize: 11,
                }}
              />
              <YAxis
                type="number"
                dataKey="score"
                tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
                label={{
                  value: tFrontier('score'),
                  angle: -90,
                  position: 'insideLeft',
                  offset: 0,
                  fill: 'var(--color-text-muted)',
                  fontSize: 11,
                }}
              />
              <Tooltip cursor={{ stroke: 'var(--color-border)' }} content={<ChartTooltip labels={labels} />} />
              <Scatter name={tFrontier('deckA')} data={seriesA} isAnimationActive={false} fill={COLOR_DECK_A}>
                {seriesA.map((row, i) => (
                  <Cell key={`a-${i}-${row.label}`} fill={COLOR_DECK_A} r={6} />
                ))}
              </Scatter>
              <Scatter name={tFrontier('deckB')} data={seriesB} isAnimationActive={false} fill={COLOR_DECK_B}>
                {seriesB.map((row, i) => (
                  <Cell key={`b-${i}-${row.label}`} fill={COLOR_DECK_B} r={6} />
                ))}
              </Scatter>
              {seriesBoth.length > 0 && (
                <Scatter name="A∩B" data={seriesBoth} isAnimationActive={false} fill="var(--color-accent)">
                  {seriesBoth.map((row, i) => (
                    <Cell key={`ab-${i}-${row.label}`} fill="var(--color-accent)" r={9} />
                  ))}
                </Scatter>
              )}
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
