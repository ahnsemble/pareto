'use client';

import init, {
  decode_public_raw,
  make_synthetic_search_space,
  run_full_pipeline,
  get_base_stats,
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
  const raw = make_synthetic_search_space(slotCount, includeBaseline, tradeoff, topK);
  return plainify(raw) as SearchSpace;
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

export function runPipeline(config: PipelineConfig): PipelineResult {
  const raw = run_full_pipeline(config);
  return plainify(raw) as PipelineResult;
}

export function getBaseStats(): Record<string, number> {
  return plainify(get_base_stats()) as Record<string, number>;
}
