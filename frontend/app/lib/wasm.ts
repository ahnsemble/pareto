'use client';

import init, { decode_public_raw } from 'tttg_forge_wasm';

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
