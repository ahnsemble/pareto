/// <reference lib="webworker" />

import * as Comlink from 'comlink';
import {
  initWasm,
  getSearchSpace,
  runPipeline,
  SearchChoice,
  SearchSlot,
  SearchSpace,
} from './wasm';

export interface OptimizeInput {
  slotCount: number;
  includeBaseline: boolean;
  tradeoff: boolean;
  topK: number;
  ownedCollectibles: number;
  equipmentDelta?: Record<string, number>;
  petDelta?: Record<string, number>;
}

export interface BuildPoint {
  label: string;
  score: number;
  damageFactor: number;
  upgradeCount: number;
  selections: { slot: string; choice: string }[];
}

export interface OptimizeResult {
  topBuilds: BuildPoint[];
  paretoFrontier: BuildPoint[];
  allPoints: BuildPoint[];
  searchSpaceSize: number;
  enumeratedCount: number;
  pipelineSummary: { score: number; damageFactor: number };
  durationMs: number;
}

const MAX_COMBOS = 50_000;

function isUpgradeChoice(choice: SearchChoice): boolean {
  return choice.name !== 'baseline';
}

function enumerateCombos(space: SearchSpace, cap: number): BuildPoint[] {
  const points: BuildPoint[] = [];
  const slots = space.slots;
  const total = slots.reduce(
    (acc, slot) => acc * Math.max(slot.choices.length, 1),
    1,
  );
  const limit = Math.min(total, cap);

  function dfs(
    index: number,
    score: number,
    damage: number,
    upgrades: number,
    chosen: { slot: string; choice: string }[],
  ) {
    if (points.length >= limit) return;
    if (index === slots.length) {
      const label = chosen.map((c) => `${c.slot}=${c.choice}`).join('|');
      points.push({
        label,
        score,
        damageFactor: damage,
        upgradeCount: upgrades,
        selections: [...chosen],
      });
      return;
    }
    const slot: SearchSlot = slots[index];
    const choices = slot.choices.length > 0 ? slot.choices : [];
    for (const choice of choices) {
      chosen.push({ slot: slot.name, choice: choice.name });
      dfs(
        index + 1,
        score + choice.score_delta,
        damage + choice.damage_delta,
        upgrades + (isUpgradeChoice(choice) ? 1 : 0),
        chosen,
      );
      chosen.pop();
      if (points.length >= limit) return;
    }
  }

  dfs(0, 0, 0, 0, []);
  return points;
}

function computeParetoFrontier(points: BuildPoint[]): BuildPoint[] {
  const frontier: BuildPoint[] = [];
  for (const candidate of points) {
    const dominated = frontier.some(
      (existing) =>
        existing.damageFactor >= candidate.damageFactor &&
        existing.upgradeCount >= candidate.upgradeCount &&
        (existing.damageFactor > candidate.damageFactor ||
          existing.upgradeCount > candidate.upgradeCount),
    );
    if (dominated) continue;
    for (let i = frontier.length - 1; i >= 0; i--) {
      const existing = frontier[i];
      if (
        candidate.damageFactor >= existing.damageFactor &&
        candidate.upgradeCount >= existing.upgradeCount &&
        (candidate.damageFactor > existing.damageFactor ||
          candidate.upgradeCount > existing.upgradeCount)
      ) {
        frontier.splice(i, 1);
      }
    }
    frontier.push(candidate);
  }
  frontier.sort((a, b) => b.damageFactor - a.damageFactor);
  return frontier;
}

const workerApi = {
  async init(): Promise<boolean> {
    await initWasm();
    return true;
  },

  async optimize(input: OptimizeInput): Promise<OptimizeResult> {
    const start = performance.now();
    await initWasm();

    const space = getSearchSpace(
      Math.max(1, input.slotCount),
      input.includeBaseline,
      input.tradeoff,
      Math.max(1, input.topK),
    );

    const total = space.slots.reduce(
      (acc, slot) => acc * Math.max(slot.choices.length, 1),
      1,
    );
    const allPoints = enumerateCombos(space, MAX_COMBOS);

    const ownedBoost = 1 + Math.min(input.ownedCollectibles, 64) * 0.005;
    const sumDelta = (delta?: Record<string, number>) =>
      delta ? Object.values(delta).reduce((a, b) => a + b, 0) : 0;
    const equipBoost = 1 + sumDelta(input.equipmentDelta);
    const petBoost = 1 + sumDelta(input.petDelta);
    for (const point of allPoints) {
      point.score *= ownedBoost * equipBoost;
      point.damageFactor *= ownedBoost * petBoost;
    }

    const sortedByScore = [...allPoints].sort((a, b) => b.score - a.score);
    const topBuilds = sortedByScore.slice(0, Math.max(1, input.topK));
    const paretoFrontier = computeParetoFrontier(allPoints);

    let pipelineSummary = {
      score: topBuilds[0]?.score ?? 0,
      damageFactor: topBuilds[0]?.damageFactor ?? 0,
    };
    try {
      const pipeline = runPipeline({});
      const score = typeof pipeline.score === 'number' ? pipeline.score : 0;
      const damageFactor =
        typeof pipeline.damageFactor === 'number' ? pipeline.damageFactor : 0;
      if (score !== 0 || damageFactor !== 0) {
        pipelineSummary = { score, damageFactor };
      }
    } catch {
      // run_full_pipeline expects an expanded game config; fall back to top build aggregates.
    }

    return {
      topBuilds,
      paretoFrontier,
      allPoints,
      searchSpaceSize: total,
      enumeratedCount: allPoints.length,
      pipelineSummary,
      durationMs: performance.now() - start,
    };
  },
};

export type WasmWorkerApi = typeof workerApi;

Comlink.expose(workerApi);
