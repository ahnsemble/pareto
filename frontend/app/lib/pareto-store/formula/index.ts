import { calculateV3FinalDamage } from '../../wasm';
import type { DamageResult, PlayerState } from '../types';

export function calculateFinalDamage(input: PlayerState): DamageResult {
  return calculateV3FinalDamage(input) as DamageResult;
}
