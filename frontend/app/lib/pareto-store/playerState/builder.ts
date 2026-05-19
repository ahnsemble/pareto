import { SIO_INPUT_FIELD_SPECS } from './constants';
import { DEFAULT_SIO_PLAYER_STATE } from './defaults';
import type { DeepPartial, PlayerState } from '../types';

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function mergeDeep<T>(base: T, patch: DeepPartial<T> | undefined): T {
  if (patch === undefined) return base;
  if (Array.isArray(base) || Array.isArray(patch)) return patch as T;
  if (!isPlainRecord(base) || !isPlainRecord(patch)) return patch as T;

  const result: Record<string, unknown> = { ...base };
  const patchRecord = patch as Record<string, unknown>;

  for (const key of Object.keys(patchRecord)) {
    const nextValue = patchRecord[key];
    if (nextValue === undefined) continue;

    const currentValue = result[key];
    if (isPlainRecord(currentValue) && isPlainRecord(nextValue)) {
      result[key] = mergeDeep(currentValue, nextValue);
    } else {
      result[key] = nextValue;
    }
  }

  return result as T;
}

export function createPlayerState(partial: DeepPartial<PlayerState> = {}): PlayerState {
  return mergeDeep(DEFAULT_SIO_PLAYER_STATE, partial);
}

export function countSioInputFields(_state: PlayerState): number {
  return SIO_INPUT_FIELD_SPECS.length;
}
