'use client';

import { useEffect, useMemo, useState } from 'react';
import { Link } from '../../i18n/navigation';
import { bootParetoStore, useParetoStore } from '../../app/lib/pareto-store/store';
import { selectPlayerState } from '../../app/lib/pareto-store/selectors';
import {
  initWasm,
  relicCoreOptimize,
  twinbornAutoAssign,
  type RelicCoreOptimizerResult,
  type TwinbornAutoAssignResult,
} from '../../app/lib/wasm';

type BootState = 'pending' | 'ok' | string;
type ResourceId = 'eternalCores' | 'voidCores' | 'chaosCores' | 'relicKeys' | 'gold';

const RESOURCE_FIELDS: Array<{ id: ResourceId; label: string; value: number; step: number }> = [
  { id: 'eternalCores', label: 'Eternal cores', value: 18, step: 1 },
  { id: 'voidCores', label: 'Void cores', value: 12, step: 1 },
  { id: 'chaosCores', label: 'Chaos cores', value: 8, step: 1 },
  { id: 'relicKeys', label: 'Relic keys', value: 10, step: 1 },
  { id: 'gold', label: 'Gold', value: 600000, step: 50000 },
];

const shellClass = 'mx-auto max-w-6xl space-y-4 p-6';
const headerClass = 'sticky top-0 z-10 -mx-6 border-b border-[color:var(--color-border)]/50 bg-[color:var(--color-bg)] px-6 pb-3 pt-2';
const panelClass = 'rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-surface-elev)] p-4';
const labelClass = 'text-xs uppercase text-[color:var(--color-text-muted)]';
const inputClass = 'min-h-[44px] w-full rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 py-2 font-mono text-sm text-[color:var(--color-text)]';
const buttonClass = 'min-h-[44px] rounded-md bg-[color:var(--color-primary)] px-4 py-2 font-mono text-sm font-semibold text-[color:var(--color-bg)] hover:bg-[color:var(--color-primary-strong)] disabled:cursor-not-allowed disabled:opacity-40';
const linkClass = 'inline-flex min-h-[44px] items-center rounded-md px-2 font-mono text-xs text-[color:var(--color-text-muted)] hover:text-[color:var(--color-primary)]';

function useV3OptimizerBoot(): BootState {
  const [bootStatus, setBootStatus] = useState<BootState>('pending');

  useEffect(() => {
    let mounted = true;
    initWasm()
      .then(() => {
        if (!mounted) return;
        bootParetoStore();
        setBootStatus('ok');
      })
      .catch((err) => {
        if (!mounted) return;
        const message = err instanceof Error ? err.message : String(err);
        setBootStatus(message);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return bootStatus;
}

function BootLine({ status }: { status: BootState }) {
  return (
    <p
      className={`mt-1 text-xs font-mono ${status === 'ok' ? 'text-[color:var(--color-accent)]' : status === 'pending' ? 'text-[color:var(--color-text-muted)]' : 'text-[color:var(--color-danger)]'}`}
      data-testid="v3-optimizer-boot-status"
    >
      {status === 'pending' ? 'Booting store...' : status === 'ok' ? '[ParetoStore] Boot OK' : status}
    </p>
  );
}

function formatNumber(value: number, digits = 2): string {
  return value.toLocaleString(undefined, { maximumFractionDigits: digits });
}

function currentPlayerState() {
  return selectPlayerState(useParetoStore.getState());
}

export function RelicCoreOptimizerSurface() {
  const bootStatus = useV3OptimizerBoot();
  const [constraints, setConstraints] = useState<Record<ResourceId, number>>(() =>
    Object.fromEntries(RESOURCE_FIELDS.map((field) => [field.id, field.value])) as Record<ResourceId, number>,
  );
  const [result, setResult] = useState<RelicCoreOptimizerResult | null>(null);

  const canRun = bootStatus === 'ok';
  const request = useMemo(() => ({ ...constraints, topK: 5 }), [constraints]);

  return (
    <main className={shellClass} data-testid="relic-core-optimizer">
      <header className={headerClass}>
        <div className="flex items-baseline justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">
              <span className="text-[color:var(--color-primary)]">Pareto</span>{' '}
              <span className="text-[color:var(--color-text)]">/ relic core</span>
            </h1>
            <BootLine status={bootStatus} />
          </div>
          <Link href="/v3" className={linkClass} data-testid="v3-hub-link">
            /v3
          </Link>
        </div>
      </header>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.6fr)]">
        <div className={panelClass}>
          <h2 className={labelClass}>Resource constraints</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {RESOURCE_FIELDS.map((field) => (
              <label key={field.id} className="block text-sm text-[color:var(--color-text)]">
                <span className="text-xs text-[color:var(--color-text-muted)]">{field.label}</span>
                <input
                  className={inputClass + ' mt-1'}
                  data-testid={`relic-constraint-${field.id}`}
                  min={0}
                  step={field.step}
                  type="number"
                  value={constraints[field.id]}
                  onChange={(event) =>
                    setConstraints((current) => ({
                      ...current,
                      [field.id]: Math.max(0, Number(event.target.value)),
                    }))
                  }
                />
              </label>
            ))}
          </div>
          <button
            type="button"
            className={buttonClass + ' mt-4 w-full'}
            data-testid="relic-core-run"
            disabled={!canRun}
            onClick={() => setResult(relicCoreOptimize(currentPlayerState(), request))}
          >
            Run
          </button>
        </div>

        <div className={panelClass}>
          <div className="flex items-center justify-between gap-3">
            <h2 className={labelClass}>Ranked builds</h2>
            <span className="font-mono text-xs text-[color:var(--color-text-muted)]" data-testid="relic-core-latency">
              {result ? `${formatNumber(result.latencyMs, 3)} ms` : '0 ms'}
            </span>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[520px] font-mono text-xs">
              <thead className="text-left text-[color:var(--color-text-muted)]">
                <tr>
                  <th className="py-2">Build</th>
                  <th>Score</th>
                  <th>Damage</th>
                </tr>
              </thead>
              <tbody>
                {(result?.builds ?? []).map((build) => (
                  <tr key={build.label} className="border-t border-[color:var(--color-border)]/50" data-testid="relic-core-result-row">
                    <td className="max-w-[260px] truncate py-2 text-[color:var(--color-text)]">{build.label}</td>
                    <td>{formatNumber(build.score, 2)}</td>
                    <td>{formatNumber(build.damageFactor, 2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-5">
            <h2 className={labelClass}>Pareto set</h2>
            <div className="mt-3 grid min-h-[120px] grid-cols-2 items-end gap-3 border-l border-b border-[color:var(--color-border)] px-3 py-2">
              {(result?.paretoSet ?? []).map((point, index) => (
                <div key={`${point.label}-${index}`} className="flex h-full flex-col justify-end" data-testid="relic-core-pareto-point">
                  <div
                    className="rounded-t bg-[color:var(--color-secondary)]"
                    style={{ height: `${Math.min(100, Math.max(18, point.damageFactor / 2))}%` }}
                    title={point.label}
                  />
                  <span className="mt-1 truncate font-mono text-[10px] text-[color:var(--color-text-muted)]">
                    {formatNumber(point.score, 0)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export function TwinbornAutoAssignSurface() {
  const bootStatus = useV3OptimizerBoot();
  const [availableChips, setAvailableChips] = useState(24);
  const [iterationCap, setIterationCap] = useState(10000);
  const [result, setResult] = useState<TwinbornAutoAssignResult | null>(null);
  const canRun = bootStatus === 'ok';

  return (
    <main className={shellClass} data-testid="twinborn-auto-assign">
      <header className={headerClass}>
        <div className="flex items-baseline justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">
              <span className="text-[color:var(--color-primary)]">Pareto</span>{' '}
              <span className="text-[color:var(--color-text)]">/ twinborn</span>
            </h1>
            <BootLine status={bootStatus} />
          </div>
          <Link href="/v3" className={linkClass} data-testid="v3-hub-link">
            /v3
          </Link>
        </div>
      </header>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.6fr)]">
        <div className={panelClass}>
          <h2 className={labelClass}>Chip pool</h2>
          <div className="mt-3 grid gap-3">
            <label className="block text-sm text-[color:var(--color-text)]">
              <span className="text-xs text-[color:var(--color-text-muted)]">Available chips</span>
              <input
                className={inputClass + ' mt-1'}
                data-testid="twinborn-chip-pool"
                min={0}
                type="number"
                value={availableChips}
                onChange={(event) => setAvailableChips(Math.max(0, Number(event.target.value)))}
              />
            </label>
            <label className="block text-sm text-[color:var(--color-text)]">
              <span className="text-xs text-[color:var(--color-text-muted)]">Iteration cap</span>
              <input
                className={inputClass + ' mt-1'}
                data-testid="twinborn-iteration-cap"
                min={1}
                max={10000}
                type="number"
                value={iterationCap}
                onChange={(event) => setIterationCap(Math.max(1, Math.min(10000, Number(event.target.value))))}
              />
            </label>
          </div>
          <button
            type="button"
            className={buttonClass + ' mt-4 w-full'}
            data-testid="twinborn-auto-assign-run"
            disabled={!canRun}
            onClick={() =>
              setResult(
                twinbornAutoAssign(currentPlayerState(), {
                  availableChips,
                  iterationCap,
                  assignmentCount: 3,
                }),
              )
            }
          >
            Auto-Assign
          </button>
        </div>

        <div className={panelClass}>
          <div className="flex items-center justify-between gap-3">
            <h2 className={labelClass}>Assignments</h2>
            <span className="font-mono text-xs text-[color:var(--color-text-muted)]" data-testid="twinborn-iterations">
              {result ? `${result.iterations} / ${result.iterationCap}` : `0 / ${iterationCap}`}
            </span>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[520px] font-mono text-xs">
              <thead className="text-left text-[color:var(--color-text-muted)]">
                <tr>
                  <th className="py-2">Tech</th>
                  <th>Auto</th>
                  <th>Manual</th>
                  <th>Gain</th>
                </tr>
              </thead>
              <tbody>
                {(result?.assignments ?? []).map((assignment) => (
                  <tr key={assignment.techId} className="border-t border-[color:var(--color-border)]/50" data-testid="twinborn-assignment-row">
                    <td className="py-2 text-[color:var(--color-text)]">{assignment.techId}</td>
                    <td>{assignment.chips}</td>
                    <td>{assignment.manualChips}</td>
                    <td>{formatNumber(assignment.autoDamageGain, 3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2" data-testid="twinborn-comparison">
            <div className="rounded-md border border-[color:var(--color-border)] p-3">
              <p className={labelClass}>Manual</p>
              <p className="mt-2 font-mono text-lg text-[color:var(--color-text)]">
                {formatNumber((result?.assignments ?? []).reduce((sum, item) => sum + item.manualChips, 0), 0)}
              </p>
            </div>
            <div className="rounded-md border border-[color:var(--color-border)] p-3">
              <p className={labelClass}>Auto</p>
              <p className="mt-2 font-mono text-lg text-[color:var(--color-accent)]">
                {formatNumber((result?.assignments ?? []).reduce((sum, item) => sum + item.chips, 0), 0)}
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
