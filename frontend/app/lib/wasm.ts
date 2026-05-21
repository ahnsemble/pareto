'use client';

import init, {
  beam_search_run_js,
  branch_bound_run_js,
  calculate_v3_final_damage,
  compute_tech_modifier_js,
  decode_public_raw,
  get_tech_parts_full_js,
  pareto_frontier_compute_js,
  relic_core_optimize_js,
  sio_export_to_player_state_patch_js,
  tech_optimizer_run_js,
  twinborn_auto_assign_js,
  validate_sio_tech_inventory_js,
  validate_tech_part_config_js,
} from 'tttg_forge_wasm';

let initPromise: Promise<void> | null = null;

export async function initWasm(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      // Worker context (production build) gets a path-only URL string from Turbopack
      // ("/_next/static/media/...wasm") that fetch() can't resolve without a base.
      // Patch self.fetch during init to absolutize relative paths against self.location.origin.
      const origin =
        typeof self !== 'undefined' && self.location?.origin
          ? self.location.origin
          : typeof window !== 'undefined'
            ? window.location.origin
            : null;
      const target = (typeof self !== 'undefined' ? self : globalThis) as typeof globalThis;
      const origFetch = target.fetch.bind(target);
      const needsPatch = origin !== null;
      if (needsPatch) {
        target.fetch = ((input: RequestInfo | URL, ri?: RequestInit) => {
          let url: RequestInfo | URL = input;
          if (typeof input === 'string' && input.startsWith('/')) {
            url = new URL(input, origin);
          } else if (input instanceof URL) {
            const s = input.toString();
            if (s.startsWith('/') || !s.includes('://')) {
              url = new URL(s, origin);
            }
          }
          return origFetch(url, ri);
        }) as typeof fetch;
      }
      try {
        await init();
      } finally {
        if (needsPatch) target.fetch = origFetch;
      }
    })();
  }
  return initPromise;
}

export function plainify(value: unknown): unknown {
  if (value instanceof Map) {
    const obj: Record<string, unknown> = {};
    for (const [k, v] of value) obj[String(k)] = plainify(v);
    return obj;
  }
  if (Array.isArray(value)) return value.map(plainify);
  if (value && typeof value === 'object') {
    const obj: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as object)) obj[k] = plainify(v);
    return obj;
  }
  return value;
}

export async function decodeRawUrl(raw: string): Promise<unknown> {
  await initWasm();
  return plainify(decode_public_raw(raw));
}

export function calculateV3FinalDamage(playerState: unknown): unknown {
  return plainify(calculate_v3_final_damage(playerState));
}

export interface OptimizerBuild {
  label: string;
  score: number;
  damageFactor: number;
  build: Record<string, unknown>;
}

export interface BranchBoundResult {
  algorithm: 'branch_bound';
  topK: number;
  searchSpaceSize: number;
  builds: OptimizerBuild[];
  metrics: {
    visited_nodes: number;
    pruned_nodes: number;
    leaf_nodes: number;
    pruning_rate?: number;
  };
}

export interface BeamSearchResult {
  algorithm: 'beam_search';
  beamWidth: number;
  topK: number;
  searchSpaceSize: number;
  builds: OptimizerBuild[];
}

export interface ParetoFrontierResult {
  algorithm: 'pareto_frontier';
  objectives: string[];
  indexes: number[];
  frontier: OptimizerBuild[];
}

export interface RelicCoreOptimizerResult {
  algorithm: 'relic_core';
  constraintsSupportedCount: number;
  topK: number;
  searchSpaceSize: number;
  builds: OptimizerBuild[];
  paretoSet: OptimizerBuild[];
  metrics: {
    visited_nodes: number;
    pruned_nodes: number;
    leaf_nodes: number;
  };
  latencyMs: number;
}

export interface TwinbornAssignment {
  techId: string;
  chips: number;
  manualChips: number;
  autoDamageGain: number;
}

export interface TwinbornAutoAssignResult {
  algorithm: 'twinborn_solver';
  iterationCap: number;
  iterations: number;
  availableChips: number;
  assignments: TwinbornAssignment[];
  solverBuilds: OptimizerBuild[];
}

export interface TechPartsCatalog {
  twinbornParts: Array<{ id: string; name: string }>;
  activeSkills: Array<{ id: string; name: string }>;
  modeVariants: Array<{ id: string; name: string }>;
  rarities: string[];
  techModifierMatrix: Array<{
    baseTech: string;
    target: string;
    coefficient: number;
    returnsLevel: boolean;
  }>;
  techModifierTargets: number;
}

export interface TechOptimizerResult {
  algorithm: 'tech_optimizer';
  error?: string;
  exact: boolean;
  reason?: string | null;
  topK: number;
  inventoryValidation?: SioInventoryValidation;
  quality: {
    guarantee: string;
    best_score: number;
    upper_bound_score: number;
    score_gap_percent: number;
  };
  scope: {
    optimizer_schema: string;
    problem_scope: string;
    scoring_model: string;
    full_sio_equivalent: boolean;
    enumerated_candidate_nodes: number;
    estimated_full_joint_nodes: number;
    estimated_schema_multiplier: number;
    covered_dimensions: string[];
    schema_dimensions: string[];
    limitations: string[];
  };
  builds: Array<{
    label: string;
    score: number;
    damageFactor: number;
    config: Record<string, unknown>;
  }>;
  metrics: {
    first_answer_ms: number;
    latency_ms: number;
    visited_nodes: number;
    pruned_nodes: number;
    frontier_size: number;
    dominance_cache_hits: number;
    mode_used: string;
  };
}

export interface SioTechInventoryInput {
  rarityCounts: Record<string, number>;
  chips: number;
  skillSlots: number;
  overloadable: boolean;
  maxOverload?: number;
  modes: string[];
  forcedSkills: string[];
  preferredSkills: string[];
  disabledSkills: string[];
  speedMode: string;
  limit: string;
  candidatePreselectTopK?: number;
}

export interface SioInventoryValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function branchBoundRun(searchSpace: unknown): BranchBoundResult {
  return plainify(branch_bound_run_js(searchSpace)) as BranchBoundResult;
}

export function beamSearchRun(searchSpace: unknown, beamWidth: number): BeamSearchResult {
  return plainify(beam_search_run_js(searchSpace, beamWidth)) as BeamSearchResult;
}

export function paretoFrontierCompute(
  candidates: unknown,
  objectives: string[],
): ParetoFrontierResult {
  return plainify(pareto_frontier_compute_js(candidates, objectives)) as ParetoFrontierResult;
}

export function relicCoreOptimize(
  playerState: unknown,
  constraints: Record<string, number>,
): RelicCoreOptimizerResult {
  return plainify(relic_core_optimize_js(playerState, constraints)) as RelicCoreOptimizerResult;
}

export function twinbornAutoAssign(
  playerState: unknown,
  chipPool: Record<string, number>,
): TwinbornAutoAssignResult {
  return plainify(twinborn_auto_assign_js(playerState, chipPool)) as TwinbornAutoAssignResult;
}

export function getTechPartsCatalog(): TechPartsCatalog {
  return plainify(get_tech_parts_full_js()) as TechPartsCatalog;
}

export function computeTechModifier(
  baseTech: string,
  target: string,
  twinbornLevel: number,
): number {
  const value = plainify(compute_tech_modifier_js(baseTech, target, twinbornLevel));
  return typeof value === 'number' && Number.isFinite(value) ? value : 1.0;
}

export function validateTechPartConfig(config: unknown): { valid: boolean; errors: string[] } {
  return plainify(validate_tech_part_config_js(config)) as { valid: boolean; errors: string[] };
}

export function validateSioTechInventory(config: unknown): SioInventoryValidation {
  return plainify(validate_sio_tech_inventory_js(config)) as SioInventoryValidation;
}

export function techOptimizerRun(
  playerState: unknown,
  options: Record<string, unknown>,
): TechOptimizerResult {
  const started =
    typeof performance !== 'undefined' && typeof performance.now === 'function'
      ? performance.now()
      : Date.now();
  const result = plainify(tech_optimizer_run_js(playerState, options)) as TechOptimizerResult;
  const ended =
    typeof performance !== 'undefined' && typeof performance.now === 'function'
      ? performance.now()
      : Date.now();
  const latencyMs = Math.max(0, ended - started);
  if (result.metrics) {
    result.metrics.latency_ms = latencyMs;
    result.metrics.first_answer_ms = result.metrics.first_answer_ms || latencyMs;
  }
  return result;
}

export function sioExportToPlayerStatePatch(sioExport: unknown): unknown {
  return plainify(sio_export_to_player_state_patch_js(sioExport));
}

export interface SearchChoice {
  name: string;
  score_delta: number;
  damage_delta: number;
}

export interface SearchSlot {
  name: string;
  choices: SearchChoice[];
}

export interface SearchSpace {
  slots: SearchSlot[];
  top_k: number;
}

export function getSearchSpace(
  slotCount: number,
  includeBaseline: boolean,
  tradeoff: boolean,
  topK: number,
): SearchSpace {
  const slots: SearchSlot[] = [];
  const normalizedSlotCount = Math.max(0, Math.trunc(slotCount));
  for (let index = 0; index < normalizedSlotCount; index += 1) {
    const step = index + 1;
    let choices: SearchChoice[];
    if (tradeoff) {
      choices = [
        {
          name: 'precision',
          score_delta: 12.0 + step,
          damage_delta: 3.0 + step * 0.1,
        },
        {
          name: 'overload',
          score_delta: 5.0 + step * 0.2,
          damage_delta: 15.0 + step,
        },
      ];
    } else if (includeBaseline) {
      choices = [
        {
          name: 'baseline',
          score_delta: 0.0,
          damage_delta: 0.0,
        },
        {
          name: 'upgrade',
          score_delta: 10.0 + step,
          damage_delta: 1.0 + step * 0.1,
        },
      ];
    } else {
      choices = [
        {
          name: 'upgrade',
          score_delta: 10.0 + step,
          damage_delta: 1.0 + step * 0.1,
        },
      ];
    }
    slots.push({
      name: `slot_${String(index).padStart(2, '0')}`,
      choices,
    });
  }
  return { slots, top_k: Math.max(0, Math.trunc(topK)) };
}

export interface PipelineConfig {
  slots?: SearchSlot[];
  [key: string]: unknown;
}

export interface PipelineResult {
  stats: Record<string, unknown>;
  score: number;
  damageFactor: number;
}

function numericStat(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0.0;
}

function coerceStats(value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const stats: Record<string, number> = {};
  for (const [key, stat] of Object.entries(value)) {
    stats[key] = numericStat(stat);
  }
  return stats;
}

function mergeStatParts(parts: unknown): Record<string, number> {
  if (!Array.isArray(parts)) return {};
  const merged: Record<string, number> = {};
  for (const part of parts) {
    if (!part || typeof part !== 'object' || Array.isArray(part)) continue;
    for (const [key, stat] of Object.entries(part)) {
      merged[key] = (merged[key] ?? 0.0) + numericStat(stat);
    }
  }
  return merged;
}

export function runPipeline(config: PipelineConfig): PipelineResult {
  const stats = Array.isArray(config.statParts)
    ? mergeStatParts(config.statParts)
    : coerceStats(config.stats);
  return {
    stats,
    score: stats.score ?? 0.0,
    damageFactor: stats.damageFactor ?? 0.0,
  };
}
