'use client';

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

import type { BuildPoint } from '../../lib/wasm-worker';

interface Props {
  allPoints: BuildPoint[];
  paretoFrontier: BuildPoint[];
  topBuilds: BuildPoint[];
}

interface ChartPoint {
  damage: number;
  upgrades: number;
  score: number;
  label: string;
  isFrontier: boolean;
  isTop: boolean;
  rank: number | null;
}

function buildChartData(
  allPoints: BuildPoint[],
  paretoFrontier: BuildPoint[],
  topBuilds: BuildPoint[],
): ChartPoint[] {
  const frontierLabels = new Set(paretoFrontier.map((p) => p.label));
  const topRank = new Map(topBuilds.map((p, i) => [p.label, i + 1]));
  return allPoints.map((p) => ({
    damage: Number(p.damageFactor.toFixed(3)),
    upgrades: p.upgradeCount,
    score: Number(p.score.toFixed(3)),
    label: p.label,
    isFrontier: frontierLabels.has(p.label),
    isTop: topRank.has(p.label),
    rank: topRank.get(p.label) ?? null,
  }));
}

function colorFor(point: ChartPoint): string {
  if (point.isTop) return 'var(--color-accent)';
  if (point.isFrontier) return 'var(--color-primary)';
  return 'var(--color-text-muted)';
}

function radiusFor(point: ChartPoint): number {
  if (point.isTop) return 9;
  if (point.isFrontier) return 6;
  return 3;
}

interface TooltipPayloadEntry {
  payload: ChartPoint;
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayloadEntry[] }) {
  if (!active || !payload || payload.length === 0) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded border border-[color:var(--color-border)] bg-[color:var(--color-surface-elev)] p-2 font-mono text-xs">
      {p.rank !== null && (
        <div className="mb-1 font-semibold text-[color:var(--color-accent)]">
          Top #{p.rank}
        </div>
      )}
      <div>damage: <span className="text-[color:var(--color-secondary)]">{p.damage}</span></div>
      <div>upgrades: <span className="text-[color:var(--color-text)]">{p.upgrades}</span></div>
      <div>score: <span className="text-[color:var(--color-accent)]">{p.score}</span></div>
      {p.isFrontier && (
        <div className="mt-1 text-[color:var(--color-primary)]">on Pareto frontier</div>
      )}
    </div>
  );
}

export function ParetoFrontierChart({ allPoints, paretoFrontier, topBuilds }: Props) {
  if (allPoints.length === 0) {
    return (
      <div
        role="img"
        aria-labelledby="pareto-chart-empty"
        className="flex h-[360px] w-full items-center justify-center rounded-md border border-dashed border-[color:var(--color-border)] p-10 text-center text-sm text-[color:var(--color-text-muted)]"
      >
        <span id="pareto-chart-empty">
          Run optimization to populate the Pareto frontier chart.
        </span>
      </div>
    );
  }
  const data = buildChartData(allPoints, paretoFrontier, topBuilds);
  const summaryText = `Pareto Frontier Chart — ${allPoints.length} builds, ${paretoFrontier.length} on frontier, top ${topBuilds.length}`;
  return (
    <div
      role="img"
      aria-labelledby="pareto-chart-title"
      className="h-[360px] w-full"
    >
      <h3 id="pareto-chart-title" className="sr-only">
        {summaryText}
      </h3>
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 16, right: 16, bottom: 32, left: 32 }}>
          <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
          <XAxis
            type="number"
            dataKey="damage"
            name="Damage Factor"
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
            name="Upgrades"
            tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
            allowDecimals={false}
            label={{
              value: 'upgrade count',
              angle: -90,
              position: 'insideLeft',
              offset: 0,
              fill: 'var(--color-text-muted)',
              fontSize: 11,
            }}
          />
          <Tooltip cursor={{ stroke: 'var(--color-border)' }} content={<ChartTooltip />} />
          <Scatter data={data} isAnimationActive={false}>
            {data.map((point) => (
              <Cell
                key={point.label}
                fill={colorFor(point)}
                fillOpacity={point.isFrontier || point.isTop ? 0.95 : 0.35}
                r={radiusFor(point)}
              />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
