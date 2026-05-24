'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocale } from 'next-intl';
import { Link } from '../../i18n/navigation';
import { bootParetoStore, useParetoStore } from '../../app/lib/pareto-store/store';
import { selectPlayerState } from '../../app/lib/pareto-store/selectors';
import {
  DEFAULT_RESOURCE_WALLET_VALUES,
  type ResourceWalletValues,
} from '../../app/lib/pareto-store/resource-wallet';
import {
  buildProductImportFieldSummary,
  importProductProfileInput,
} from '../../app/lib/pareto-store/profile-import';
import {
  buildCalculationComparisonSummary,
  topBuildDamageFactor,
  type CalculationComparisonSummary,
} from '../../app/lib/pareto-store/calculation-comparison';
import type {
  ImportedCollectibleSnapshot,
  ImportedTechSnapshot,
  ProductImportCoverage,
  ProductImportFieldSummary,
} from '../../app/lib/pareto-store/profile-import-types';
import { buildTechUpgradeRecommendations } from '../../app/lib/pareto-store/tech-upgrade-recommendations';
import { getWorker } from '../../app/lib/wasm-client';
import {
  initWasm,
  relicCoreOptimize,
  twinbornAutoAssign,
  validateSioTechInventory,
  type RelicCoreOptimizerResult,
  type SioInventoryValidation,
  type SioTechInventoryInput,
  type TechOptimizerResult,
  type TwinbornAutoAssignResult,
} from '../../app/lib/wasm';
import {
  type BootState,
  buttonClass,
  checkboxClass,
  formatCompactScientific,
  formatNumber,
  headerClass,
  inputClass,
  labelClass,
  linkClass,
  panelClass,
  selectClass,
  shellClass,
} from './optimizerUi';
import { AccountContextPanel } from './tech/TechAccountContextPanel';
import { ProfileImportPanel, ResourceWalletPanel } from './tech/TechProductPanels';
import { TechUpgradeRecommendations } from './tech/TechUpgradeRecommendations';
import {
  getTechOptimizerCopy,
  localizeProductImportSummary,
  localizeTechInventoryMessage,
  normalizeTechOptimizerLocale,
} from './tech/techLocaleCopy';
import {
  DEFAULT_TECH_ACCOUNT_CONTEXT,
  buildSioLmContext,
  playerStateWithAccountContext,
  type TechAccountContextInput,
} from './tech/techAccountContext';
import { presentTechLoadoutRows, presentTechSkillName } from './tech/techResultPresenter';

type ResourceId = 'eternalCores' | 'voidCores' | 'chaosCores' | 'relicKeys' | 'gold';

const RESOURCE_FIELDS: Array<{ id: ResourceId; label: string; value: number; step: number }> = [
  { id: 'eternalCores', label: 'Eternal cores', value: 18, step: 1 },
  { id: 'voidCores', label: 'Void cores', value: 12, step: 1 },
  { id: 'chaosCores', label: 'Chaos cores', value: 8, step: 1 },
  { id: 'relicKeys', label: 'Relic keys', value: 10, step: 1 },
  { id: 'gold', label: 'Gold', value: 600000, step: 50000 },
];

const SIO_RARITY_FIELDS = ['Eternal', 'Legend4', 'Legend3', 'Legend2', 'Legend1', 'Legend', 'Epic3', 'Epic2', 'Epic1', 'Epic'] as const;
const SIO_RARITY_INPUTS: Array<{ id: (typeof SIO_RARITY_FIELDS)[number]; label: string }> = [
  { id: 'Eternal', label: 'Eternal' },
  { id: 'Legend4', label: 'Legend +4' },
  { id: 'Legend3', label: 'Legend +3' },
  { id: 'Legend2', label: 'Legend +2' },
  { id: 'Legend1', label: 'Legend +1' },
  { id: 'Legend', label: 'Legend' },
  { id: 'Epic3', label: 'Epic +3' },
  { id: 'Epic2', label: 'Epic +2' },
  { id: 'Epic1', label: 'Epic +1' },
  { id: 'Epic', label: 'Epic' },
];
const DEFAULT_RARITY_COUNTS: Record<(typeof SIO_RARITY_FIELDS)[number], number> = {
  Eternal: 0,
  Legend4: 0,
  Legend3: 0,
  Legend2: 0,
  Legend1: 0,
  Legend: 1,
  Epic3: 0,
  Epic2: 0,
  Epic1: 0,
  Epic: 6,
};
const SIO_MODE_CHOICES = [
  ['droneMode', 'Drone'],
  ['drillShotMode', 'Drill Shot'],
  ['soccerMode', 'Soccer'],
  ['boomerangMode', 'Boomerang'],
  ['rocketMode', 'Rocket'],
  ['molotovMode', 'Molotov'],
  ['durianMode', 'Durian'],
  ['lightningMode', 'Lightning'],
  ['laserMode', 'Laser'],
  ['guardianMode', 'Guardian'],
  ['brickMode', 'Brick'],
  ['forcefieldMode', 'Forcefield'],
] as const;
type SioModeId = (typeof SIO_MODE_CHOICES)[number][0];
type SkillStatus = 'auto' | 'locked' | 'disabled';
type RarityCounts = Record<(typeof SIO_RARITY_FIELDS)[number], number>;
type TechRunSnapshot = {
  accountContext: TechAccountContextInput;
  inventory: SioTechInventoryInput;
};
const DEFAULT_SKILL_STATUS = SIO_MODE_CHOICES.reduce(
  (status, [mode]) => {
    status[mode] = mode === 'rocketMode' || mode === 'guardianMode' ? 'disabled' : 'auto';
    return status;
  },
  {} as Record<SioModeId, SkillStatus>,
);
const DEFAULT_CANDIDATE_PRESELECT_TOP_K = 16;
const SPEED_MODE_OPTIONS = ['fast', 'normal', 'precise', 'precise+', 'full'] as const;
const LIMIT_OPTIONS = ['basic', 'advanced'] as const;

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
      {status === 'pending' ? 'Booting store...' : status === 'ok' ? '[TangtangStore] Boot OK' : status}
    </p>
  );
}

function currentPlayerState() {
  return selectPlayerState(useParetoStore.getState());
}

function nextSkillStatus(status: SkillStatus): SkillStatus {
  if (status === 'auto') return 'locked';
  if (status === 'locked') return 'disabled';
  return 'auto';
}

function skillLabelsByStatus(statuses: Record<SioModeId, SkillStatus>, target: SkillStatus): string[] {
  return SIO_MODE_CHOICES.filter(([mode]) => statuses[mode] === target).map(([, label]) => label);
}

function buildTechInventoryInput({
  rarityCounts,
  chips,
  skillSlots,
  overloadable,
  maxOverload,
  skillStatus,
  speedMode,
  limit,
  candidatePreselectTopK,
}: {
  rarityCounts: RarityCounts;
  chips: number;
  skillSlots: number;
  overloadable: boolean;
  maxOverload: number;
  skillStatus: Record<SioModeId, SkillStatus>;
  speedMode: string;
  limit: string;
  candidatePreselectTopK: number;
}): SioTechInventoryInput {
  return {
    rarityCounts: Object.fromEntries(
      SIO_RARITY_FIELDS.flatMap((rarity) => {
        const count = Math.max(0, Math.trunc(rarityCounts[rarity] ?? 0));
        return count > 0 ? [[rarity, count] as const] : [];
      }),
    ),
    chips: Math.max(0, Math.trunc(chips)),
    skillSlots: Math.max(0, Math.trunc(skillSlots)),
    overloadable,
    ...(overloadable ? { maxOverload: Math.max(0, Math.trunc(maxOverload)) } : {}),
    modes: SIO_MODE_CHOICES.map(([mode]) => mode),
    forcedSkills: skillLabelsByStatus(skillStatus, 'locked'),
    preferredSkills: [],
    disabledSkills: skillLabelsByStatus(skillStatus, 'disabled'),
    speedMode,
    limit,
    candidatePreselectTopK: Math.max(1, Math.trunc(candidatePreselectTopK)),
  };
}

function safeValidation(status: BootState, inventory: SioTechInventoryInput): SioInventoryValidation {
  if (status !== 'ok') return { valid: false, errors: ['wasm_pending'], warnings: [] };
  try {
    return validateSioTechInventory(inventory);
  } catch (error) {
    return {
      valid: false,
      errors: [error instanceof Error ? error.message : String(error)],
      warnings: [],
    };
  }
}

function inventoryMessage(value: string, locale: string = 'en'): string {
  return localizeTechInventoryMessage(value, locale);
}

function buildLoadoutRows(build: TechOptimizerResult['builds'][number] | undefined): Array<Record<string, unknown>> {
  const loadout = build?.config?.loadout;
  return Array.isArray(loadout) ? (loadout as Array<Record<string, unknown>>) : [];
}

function buildChipRemainder(build: TechOptimizerResult['builds'][number] | undefined): string {
  const value = buildChipRemainderValue(build);
  return typeof value === 'number' ? formatNumber(value, 0) : 'n/a';
}

function buildChipRemainderValue(build: TechOptimizerResult['builds'][number] | undefined): number | undefined {
  const candidate = build?.config?.sioCandidate as Record<string, unknown> | undefined;
  const value = candidate?.chipRemainder;
  return typeof value === 'number' ? value : undefined;
}

function formatSignedCompact(value: number): string {
  if (!Number.isFinite(value)) return 'n/a';
  if (value === 0) return '0';
  const sign = value > 0 ? '+' : '-';
  return `${sign}${formatNumber(Math.abs(value), 0)}`;
}

function formatSignedPercent(value: number): string {
  if (!Number.isFinite(value)) return 'n/a';
  if (value === 0) return '0%';
  const sign = value > 0 ? '+' : '-';
  return `${sign}${formatNumber(Math.abs(value), 3)}%`;
}

function formatComparisonDamage(value: number): string {
  return Number.isFinite(value) ? formatNumber(value, 0) : 'n/a';
}

function buildChipUsed(build: TechOptimizerResult['builds'][number] | undefined): string {
  const loadout = buildLoadoutRows(build);
  if (loadout.length === 0) return 'n/a';

  let used = 0;
  for (const row of loadout) {
    const detail = row.sio as Record<string, unknown> | undefined;
    const chip = detail?.chip;
    if (typeof chip !== 'number' || !Number.isFinite(chip)) return 'n/a';
    used += chip;
  }
  return formatNumber(used, 0);
}

function buildActiveSkills(build: TechOptimizerResult['builds'][number] | undefined, emptyLabel = 'none'): string {
  const candidate = build?.config?.sioCandidate as Record<string, unknown> | undefined;
  const skills = candidate?.activeSkills;
  if (!Array.isArray(skills) || skills.length === 0) return emptyLabel;
  return skills.map((skill) => presentTechSkillName(String(skill))).join(', ');
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
              <span className="text-[color:var(--color-primary)]">Tangtang</span>{' '}
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
            <h2 className={labelClass}>Efficient set</h2>
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
              <span className="text-[color:var(--color-primary)]">Tangtang</span>{' '}
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

export function TechPartsOptimizerSurface() {
  const locale = normalizeTechOptimizerLocale(useLocale());
  const copy = getTechOptimizerCopy(locale);
  const bootStatus = useV3OptimizerBoot();
  const storeState = useParetoStore();
  const playerState = useMemo(() => selectPlayerState(storeState), [storeState]);
  const [topK, setTopK] = useState(10);
  const beamWidth = 64;
  const maxExactNodes = 250000;
  const [accountContext, setAccountContext] = useState(DEFAULT_TECH_ACCOUNT_CONTEXT);
  const [profileImportText, setProfileImportText] = useState('');
  const [profileImportSummary, setProfileImportSummary] = useState('');
  const [profileImportCoverage, setProfileImportCoverage] = useState<ProductImportCoverage[]>([]);
  const [profileImportDetails, setProfileImportDetails] = useState<ProductImportFieldSummary[]>([]);
  const [profileImporting, setProfileImporting] = useState(false);
  const [importedTechSnapshot, setImportedTechSnapshot] = useState<ImportedTechSnapshot | null>(null);
  const [importedCollectibleSnapshot, setImportedCollectibleSnapshot] = useState<ImportedCollectibleSnapshot | null>(null);
  const [resourceWallet, setResourceWallet] = useState<ResourceWalletValues>(DEFAULT_RESOURCE_WALLET_VALUES);
  const [rarityCounts, setRarityCounts] = useState(DEFAULT_RARITY_COUNTS);
  const [chips, setChips] = useState(40);
  const [skillSlots, setSkillSlots] = useState(4);
  const [overloadable, setOverloadable] = useState(false);
  const [maxOverload, setMaxOverload] = useState(4);
  const [speedMode, setSpeedMode] = useState('normal');
  const [limit, setLimit] = useState('basic');
  const candidatePreselectTopK = DEFAULT_CANDIDATE_PRESELECT_TOP_K;
  const [skillStatus, setSkillStatus] = useState(DEFAULT_SKILL_STATUS);
  const [result, setResult] = useState<TechOptimizerResult | null>(null);
  const [importedRunSnapshot, setImportedRunSnapshot] = useState<TechRunSnapshot | null>(null);
  const [calculationComparison, setCalculationComparison] = useState<CalculationComparisonSummary | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const inventory = useMemo<SioTechInventoryInput>(
    () =>
      buildTechInventoryInput({
        rarityCounts,
        chips,
        skillSlots,
        overloadable,
        maxOverload,
        skillStatus,
        speedMode,
        limit,
        candidatePreselectTopK,
      }),
    [candidatePreselectTopK, chips, limit, maxOverload, overloadable, rarityCounts, skillSlots, skillStatus, speedMode],
  );
  const inventoryValidation = useMemo(() => safeValidation(bootStatus, inventory), [bootStatus, inventory]);
  const topBuild = result?.builds?.[0];
  const topLoadout = buildLoadoutRows(topBuild);
  const topPresentedLoadout = presentTechLoadoutRows(topLoadout);
  const activeSkills = buildActiveSkills(topBuild, copy.common.none);
  const chipUsed = buildChipUsed(topBuild);
  const chipRemainder = buildChipRemainder(topBuild);
  const upgradeRecommendations = useMemo(
    () =>
      buildTechUpgradeRecommendations({
        result,
        importedTechSnapshot,
        importedCollectibleSnapshot,
        accountContext,
        chipRemainder: buildChipRemainderValue(topBuild) ?? 0,
        locale,
      }),
    [accountContext, importedCollectibleSnapshot, importedTechSnapshot, locale, result, topBuild],
  );
  const canRun = bootStatus === 'ok' && inventoryValidation.valid && !running;
  const validationText = inventoryValidation.valid
    ? inventoryValidation.warnings.length > 0
      ? copy.inventory.validWithWarnings(inventoryValidation.warnings.map((message) => inventoryMessage(message, locale)).join(', '))
      : copy.inventory.valid
    : copy.inventory.blocked(inventoryValidation.errors.map((message) => inventoryMessage(message, locale)).join(', '));
  const playerStateForRun = useMemo(() => playerStateWithAccountContext(playerState, accountContext), [accountContext, playerState]);
  const sioLmContextForRun = useMemo(() => buildSioLmContext(accountContext), [accountContext]);
  const handleTechRun = async () => {
    setRunning(true);
    setRunError(null);
    try {
      const worker = await getWorker();
      const workerResult = await worker.optimizeTech({
        playerState: playerStateForRun,
        topK,
        beamWidth,
        maxExactNodes,
        sioTechInventory: inventory,
        sioLm: sioLmContextForRun,
      });
      setResult(workerResult);
      if (importedRunSnapshot) {
        const importedResult = await worker.optimizeTech({
          playerState: playerStateWithAccountContext(playerState, importedRunSnapshot.accountContext),
          topK,
          beamWidth,
          maxExactNodes,
          sioTechInventory: importedRunSnapshot.inventory,
          sioLm: buildSioLmContext(importedRunSnapshot.accountContext),
        });
        setCalculationComparison(buildCalculationComparisonSummary({
          importedDamage: topBuildDamageFactor(importedResult),
          tangtangDamage: topBuildDamageFactor(workerResult),
        }));
      } else {
        setCalculationComparison(null);
      }
    } catch (error) {
      setRunError(error instanceof Error ? error.message : String(error));
    } finally {
      setRunning(false);
    }
  };
  const handleProfileImport = async () => {
    setProfileImporting(true);
    try {
      const imported = await importProductProfileInput(profileImportText);
      if (!imported.ok) {
        setProfileImportCoverage([]);
        setProfileImportDetails([]);
        setImportedRunSnapshot(null);
        setCalculationComparison(null);
        setProfileImportSummary(localizeProductImportSummary('Profile import failed. Check the link or JSON and try again.', locale));
        return;
      }

      const optimizerSettings = imported.importedTechSnapshot?.optimizerSettings;
      const nextChips = imported.wallet.techResonanceChips ?? imported.tech.chips ?? chips;
      const nextSkillSlots = imported.tech.skillSlots ?? skillSlots;
      const nextRarityCounts = {
        ...rarityCounts,
        ...(imported.tech.rarityCounts ?? {}),
      } as RarityCounts;
      const nextAccountContext = {
        ...accountContext,
        ...Object.fromEntries(
          Object.entries(imported.account).filter(([, value]) => value !== undefined),
        ) as Partial<TechAccountContextInput>,
      };
      const nextResourceWallet = {
        ...resourceWallet,
        ...Object.fromEntries(
          Object.entries(imported.wallet).filter(([, value]) => value !== undefined),
        ) as Partial<ResourceWalletValues>,
      };
      const nextSpeedMode =
        optimizerSettings?.speedMode && (SPEED_MODE_OPTIONS as readonly string[]).includes(optimizerSettings.speedMode)
          ? optimizerSettings.speedMode
          : speedMode;
      const nextLimit =
        optimizerSettings?.limit && (LIMIT_OPTIONS as readonly string[]).includes(optimizerSettings.limit)
          ? optimizerSettings.limit
          : limit;
      const nextOverloadable = optimizerSettings?.overloadable ?? overloadable;

      setChips(nextChips);
      setSkillSlots(nextSkillSlots);
      setRarityCounts(nextRarityCounts);
      setAccountContext(nextAccountContext);
      setResourceWallet(nextResourceWallet);
      setSpeedMode(nextSpeedMode);
      setLimit(nextLimit);
      setOverloadable(nextOverloadable);
      setImportedTechSnapshot(imported.importedTechSnapshot ?? null);
      setImportedCollectibleSnapshot(imported.importedCollectibleSnapshot ?? null);
      setImportedRunSnapshot({
        accountContext: nextAccountContext,
        inventory: buildTechInventoryInput({
          rarityCounts: nextRarityCounts,
          chips: nextChips,
          skillSlots: nextSkillSlots,
          overloadable: nextOverloadable,
          maxOverload,
          skillStatus,
          speedMode: nextSpeedMode,
          limit: nextLimit,
          candidatePreselectTopK,
        }),
      });
      setCalculationComparison(null);
      setProfileImportCoverage(imported.coverage ?? []);
      setProfileImportDetails(buildProductImportFieldSummary(imported));
      setProfileImportSummary(localizeProductImportSummary(imported.summary, locale));
    } finally {
      setProfileImporting(false);
    }
  };
  const handleClearProfileImport = () => {
    setProfileImportText('');
    setProfileImportSummary('');
    setProfileImportCoverage([]);
    setProfileImportDetails([]);
    setImportedTechSnapshot(null);
    setImportedCollectibleSnapshot(null);
    setImportedRunSnapshot(null);
    setCalculationComparison(null);
  };

  return (
    <main className={shellClass} data-testid="tech-parts-optimizer">
      <header className={headerClass}>
        <div className="flex items-baseline justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">
              <span className="text-[color:var(--color-primary)]">Tangtang</span>{' '}
              <span className="text-[color:var(--color-text)]">/ {copy.titleSuffix}</span>
            </h1>
            <BootLine status={bootStatus} />
          </div>
          <Link href="/v3" className={linkClass} data-testid="v3-hub-link">
            /v3
          </Link>
        </div>
      </header>

      <section className="grid min-w-0 gap-4">
        <ProfileImportPanel
          value={profileImportText}
          onChange={setProfileImportText}
          onImport={handleProfileImport}
          onClear={handleClearProfileImport}
          onRun={handleTechRun}
          canRun={canRun}
          summary={profileImportSummary}
          coverage={profileImportCoverage}
          details={profileImportDetails}
          importing={profileImporting}
          running={running}
          locale={locale}
        />

        <AccountContextPanel
          playerState={playerStateForRun}
          account={accountContext}
          onChange={(field, value) =>
            setAccountContext((current) => ({
              ...current,
              [field]: Number.isFinite(value) ? value : 0,
            }))
          }
          onNamedChange={(field, value) =>
            setAccountContext((current) => ({
              ...current,
              [field]: value,
            }))
          }
          locale={locale}
        />

        <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(280px,0.95fr)_minmax(0,1.55fr)]">
          <div className="min-w-0 space-y-4">
            <ResourceWalletPanel
              values={{ ...resourceWallet, techResonanceChips: chips }}
              onChange={(id, value) => {
                if (id === 'techResonanceChips') {
                  setChips(value);
                  return;
                }
                setResourceWallet((current) => ({ ...current, [id]: value }));
              }}
              locale={locale}
            />

          <div className={panelClass} data-testid="tech-inventory-contract">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-[color:var(--color-text)]">{copy.inventory.title}</h2>
                <p className="mt-1 text-xs text-[color:var(--color-text-muted)]">{copy.inventory.subtitle}</p>
              </div>
              <span
                className={`font-mono text-xs ${inventoryValidation.valid ? 'text-[color:var(--color-accent)]' : 'text-[color:var(--color-danger)]'}`}
                data-testid="tech-inventory-validation"
              >
                {validationText}
              </span>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block text-sm text-[color:var(--color-text)]">
                <span className="text-xs text-[color:var(--color-text-muted)]">{copy.inventory.labels.chips}</span>
                <input
                  className={inputClass + ' mt-1'}
                  data-testid="tech-inventory-chips"
                  min={0}
                  max={999}
                  type="number"
                  value={chips}
                  onChange={(event) => setChips(Math.max(0, Number(event.target.value)))}
                />
              </label>
              <label className="block text-sm text-[color:var(--color-text)]">
                <span className="text-xs text-[color:var(--color-text-muted)]">{copy.inventory.labels.activeSkills}</span>
                <input
                  className={inputClass + ' mt-1'}
                  data-testid="tech-inventory-skill-slots"
                  min={1}
                  max={6}
                  type="number"
                  value={skillSlots}
                  onChange={(event) => setSkillSlots(Math.max(0, Number(event.target.value)))}
                />
              </label>
              <label className="block text-sm text-[color:var(--color-text)]">
                <span className="text-xs text-[color:var(--color-text-muted)]">{copy.inventory.labels.searchDepth}</span>
                <select className={selectClass + ' mt-1'} value={speedMode} onChange={(event) => setSpeedMode(event.target.value)}>
                  {SPEED_MODE_OPTIONS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm text-[color:var(--color-text)]">
                <span className="text-xs text-[color:var(--color-text-muted)]">{copy.inventory.labels.inputMode}</span>
                <select className={selectClass + ' mt-1'} value={limit} onChange={(event) => setLimit(event.target.value)}>
                  {LIMIT_OPTIONS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex min-h-[44px] items-center gap-3 text-sm text-[color:var(--color-text)]">
                <input
                  className={checkboxClass}
                  type="checkbox"
                  checked={overloadable}
                  onChange={(event) => setOverloadable(event.target.checked)}
                />
                <span>{copy.inventory.labels.overload}</span>
              </label>
              <label className="block text-sm text-[color:var(--color-text)]">
                <span className="text-xs text-[color:var(--color-text-muted)]">{copy.inventory.labels.overloadCap}</span>
                <input
                  className={inputClass + ' mt-1'}
                  data-testid="tech-inventory-max-overload"
                  min={0}
                  max={18}
                  type="number"
                  value={maxOverload}
                  disabled={!overloadable}
                  onChange={(event) => setMaxOverload(Math.max(0, Number(event.target.value)))}
                />
              </label>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
              {SIO_RARITY_INPUTS.map((rarity) => (
                <label key={rarity.id} className="block text-sm text-[color:var(--color-text)]">
                  <span className="text-xs text-[color:var(--color-text-muted)]">{rarity.label}</span>
                  <input
                    className={inputClass + ' mt-1'}
                    min={0}
                    type="number"
                    value={rarityCounts[rarity.id]}
                    onChange={(event) =>
                      setRarityCounts((current) => ({
                        ...current,
                        [rarity.id]: Math.max(0, Number(event.target.value)),
                      }))
                    }
                  />
                </label>
              ))}
            </div>
          </div>

          <div className={panelClass}>
            <h2 className={labelClass}>{copy.skill.title}</h2>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {SIO_MODE_CHOICES.map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  className={`min-h-[52px] rounded-md border px-3 py-2 text-left text-sm ${
                    skillStatus[mode] === 'disabled'
                      ? 'border-[color:var(--color-border)] bg-[color:var(--color-bg)] text-[color:var(--color-text-muted)]'
                      : skillStatus[mode] === 'locked'
                        ? 'border-[color:var(--color-primary)] bg-[color:var(--color-surface)] text-[color:var(--color-primary)]'
                        : 'border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-text)]'
                  }`}
                  data-testid={`tech-skill-status-${mode}`}
                  aria-label={`${label} ${copy.skill.status[skillStatus[mode]]}`}
                  onClick={() =>
                    setSkillStatus((current) => ({
                      ...current,
                      [mode]: nextSkillStatus(current[mode]),
                    }))
                  }
                >
                  <span className="block truncate">{label}</span>
                  <span className="mt-1 block font-mono text-[11px] uppercase">{copy.skill.status[skillStatus[mode]]}</span>
                </button>
              ))}
            </div>
          </div>

          <div className={panelClass}>
            <h2 className={labelClass}>{copy.search.title}</h2>
            <div className="mt-3 grid gap-3">
              <label className="block text-sm text-[color:var(--color-text)]">
                <span className="text-xs text-[color:var(--color-text-muted)]">{copy.search.topBuilds}</span>
                <input
                  className={inputClass + ' mt-1'}
                  data-testid="tech-optimizer-top-k"
                  min={1}
                  max={50}
                  type="number"
                  value={topK}
                  onChange={(event) => setTopK(Math.max(1, Math.min(50, Number(event.target.value))))}
                />
              </label>
            </div>
            <button
              type="button"
              className={buttonClass + ' mt-4 w-full'}
              data-testid="tech-optimizer-run"
              disabled={!canRun}
              onClick={handleTechRun}
            >
              {running ? copy.search.running : copy.search.run}
            </button>
            {runError ? (
              <p className="mt-2 font-mono text-xs text-[color:var(--color-danger)]" data-testid="tech-optimizer-error">
                {copy.search.failed}
              </p>
            ) : null}
          </div>
        </div>

        <div
          className={panelClass}
          data-testid="tech-optimizer-results"
          data-mode-used={result?.metrics.mode_used ?? 'idle'}
          data-scoring-model={result?.scope?.scoring_model ?? 'idle'}
          data-full-sio-equivalent={result?.scope?.full_sio_equivalent ? 'true' : 'false'}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className={labelClass}>{copy.results.title}</h2>
          </div>
          {result ? (
            <div className="mt-3 rounded-md border border-[color:var(--color-border)] p-3 text-sm text-[color:var(--color-text)]" data-testid="tech-optimizer-result-summary">
              <p className="font-semibold">{copy.results.topBuild}</p>
              <p className="mt-1 text-xs text-[color:var(--color-text-muted)]">
                {topPresentedLoadout[0]
                  ? `${topPresentedLoadout[0].partName} / ${topPresentedLoadout[0].modeName}`
                  : copy.common.noPartsSelected}
              </p>
              <p className="mt-2 font-mono text-xs">
                {copy.results.summaryLine(chipUsed, chipRemainder, activeSkills)}
              </p>
            </div>
          ) : (
            <div className="mt-3 rounded-md border border-dashed border-[color:var(--color-border)] p-3 text-sm text-[color:var(--color-text-muted)]" data-testid="tech-optimizer-empty-state">
              {copy.results.empty}
            </div>
          )}
          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-md border border-[color:var(--color-border)] p-3">
              <p className={labelClass}>{copy.results.firstAnswer}</p>
              <p className="mt-2 font-mono text-lg text-[color:var(--color-accent)]" data-testid="tech-optimizer-first-answer">
                {result ? `${formatNumber(result.metrics.first_answer_ms, 3)} ms` : '0 ms'}
              </p>
            </div>
            <div className="rounded-md border border-[color:var(--color-border)] p-3">
              <p className={labelClass}>{copy.results.visited}</p>
              <p className="mt-2 font-mono text-lg text-[color:var(--color-text)]" data-testid="tech-optimizer-visited">
                {result ? formatNumber(result.metrics.visited_nodes, 0) : '0'}
              </p>
            </div>
            <div className="rounded-md border border-[color:var(--color-border)] p-3">
              <p className={labelClass}>{copy.results.chipsUsed}</p>
              <p className="mt-2 font-mono text-lg text-[color:var(--color-text)]" data-testid="tech-optimizer-chip-used">
                {result ? chipUsed : copy.common.unavailable}
              </p>
            </div>
            <div className="rounded-md border border-[color:var(--color-border)] p-3">
              <p className={labelClass}>{copy.results.chipsLeft}</p>
              <p className="mt-2 font-mono text-lg text-[color:var(--color-text)]" data-testid="tech-optimizer-chip-remainder">
                {result ? chipRemainder : copy.common.unavailable}
              </p>
            </div>
          </div>
          <div className="mt-3 rounded-md border border-[color:var(--color-border)] p-3">
            <p className={labelClass}>{copy.results.activeSkills}</p>
            <p className="mt-2 break-words font-mono text-sm text-[color:var(--color-text)]" data-testid="tech-optimizer-active-skills">
              {result ? activeSkills : copy.common.none}
            </p>
          </div>
          {calculationComparison ? (
            <div className="mt-3 rounded-md border border-[color:var(--color-border)] p-3" data-testid="tech-calculation-comparison">
              <p className={labelClass}>{copy.results.comparison.title}</p>
              {calculationComparison.status === 'ready' ? (
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <div className="rounded-md border border-[color:var(--color-border)] p-3">
                    <p className={labelClass}>{copy.results.comparison.imported}</p>
                    <p className="mt-2 break-all font-mono text-xs text-[color:var(--color-text)]" data-testid="tech-calculation-comparison-imported">
                      {formatComparisonDamage(calculationComparison.importedDamage)}
                    </p>
                  </div>
                  <div className="rounded-md border border-[color:var(--color-border)] p-3">
                    <p className={labelClass}>{copy.results.comparison.tangtang}</p>
                    <p className="mt-2 break-all font-mono text-xs text-[color:var(--color-accent)]" data-testid="tech-calculation-comparison-tangtang">
                      {formatComparisonDamage(calculationComparison.tangtangDamage)}
                    </p>
                  </div>
                  <div className="rounded-md border border-[color:var(--color-border)] p-3">
                    <p className={labelClass}>{copy.results.comparison.delta}</p>
                    <p className="mt-2 font-mono text-sm text-[color:var(--color-text)]" data-testid="tech-calculation-comparison-delta">
                      {calculationComparison.changed
                        ? `${formatSignedCompact(calculationComparison.delta)} / ${formatSignedPercent(calculationComparison.deltaPct)}`
                        : copy.results.comparison.unchanged}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-xs text-[color:var(--color-text-muted)]">{copy.results.comparison.unavailable}</p>
              )}
            </div>
          ) : null}
          <TechUpgradeRecommendations recommendations={result ? upgradeRecommendations : []} locale={locale} />
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] font-mono text-xs">
              <thead className="text-left text-[color:var(--color-text-muted)]">
                <tr>
                  <th className="py-2">{copy.results.table.build}</th>
                  <th>{copy.results.table.score}</th>
                  <th>{copy.results.table.damage}</th>
                  <th>{copy.results.chipsUsed}</th>
                  <th>{copy.results.chipsLeft}</th>
                  <th>{copy.results.table.parts}</th>
                </tr>
              </thead>
              <tbody>
                {(result?.builds ?? []).map((build, index) => (
                  <tr
                    key={`${build.label}-${index}`}
                    className="border-t border-[color:var(--color-border)]/50"
                    data-testid="tech-optimizer-result-row"
                    data-raw-label={build.label}
                  >
                    <td className="max-w-[260px] truncate py-2 text-[color:var(--color-text)]">{copy.results.buildLabel(index)}</td>
                    <td>{formatCompactScientific(build.score)}</td>
                    <td>{formatCompactScientific(build.damageFactor)}</td>
                    <td>{buildChipUsed(build)}</td>
                    <td>{buildChipRemainder(build)}</td>
                    <td>{buildLoadoutRows(build).length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 grid gap-2">
            {topPresentedLoadout.map((row, index) => {
              return (
                <div
                  key={`${row.rawPartId}-${row.rawModeId}-${index}`}
                  className="grid gap-2 rounded-md border border-[color:var(--color-border)] p-3 font-mono text-xs sm:grid-cols-[1.2fr_1fr_0.9fr_0.7fr]"
                  data-testid="tech-optimizer-part-row"
                  data-part-id={row.rawPartId}
                  data-mode-id={row.rawModeId}
                >
                  <span className="truncate text-[color:var(--color-text)]">{row.partName}</span>
                  <span className="truncate">{row.modeName}</span>
                  <span>{copy.results.chipAllocation(formatNumber(row.chipAllocation, 0))}</span>
                  <span>{copy.results.overload(formatNumber(row.overload, 0))}</span>
                </div>
              );
            })}
          </div>
          </div>
        </div>
      </section>
    </main>
  );
}
