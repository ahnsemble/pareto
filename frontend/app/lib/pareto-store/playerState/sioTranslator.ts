import { createPlayerState } from './builder';
import type { DeepPartial, PlayerState } from '../types';

const PROFILE_ROOTS = ['playerState', 'player_state', 'profile', 'state', 'export'] as const;
const CATEGORY_ROOTS = ['damage', 'build', 'hero', 'equipment', 'tech', 'pet', 'collectible', 'lme', 'ecosystem'] as const;
const EQUIPMENT_SLOTS = ['weapon', 'armor', 'necklace', 'belt', 'gloves', 'boots'] as const;

type PatchRecord = Record<string, unknown>;

function isRecord(value: unknown): value is PatchRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readPath(source: unknown, key: string): unknown {
  if (!isRecord(source)) return undefined;
  if (key in source) return source[key];

  let current: unknown = source;
  for (const part of key.split('.')) {
    if (!isRecord(current) || !(part in current)) return undefined;
    current = current[part];
  }
  return current;
}

function readCandidate(source: unknown, candidates: readonly string[]): unknown {
  for (const candidate of candidates) {
    const value = readPath(source, candidate);
    if (value !== undefined) return value;
  }

  for (const root of PROFILE_ROOTS) {
    const nested = readPath(source, root);
    for (const candidate of candidates) {
      const value = readPath(nested, candidate);
      if (value !== undefined) return value;
    }
  }

  return undefined;
}

function setPath(target: PatchRecord, path: readonly string[], value: unknown): void {
  const [head, ...tail] = path;
  if (!head) return;
  if (tail.length === 0) {
    target[head] = value;
    return;
  }

  const current = target[head];
  if (!isRecord(current)) {
    target[head] = {};
  }
  setPath(target[head] as PatchRecord, tail, value);
}

function coerceNumber(value: unknown): number | undefined {
  const number = typeof value === 'number'
    ? value
    : typeof value === 'string'
      ? Number(value.replace(/,/g, ''))
      : NaN;
  return Number.isFinite(number) ? number : undefined;
}

function coerceBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().toLowerCase();
  if (['true', 'yes', '1', 'on'].includes(normalized)) return true;
  if (['false', 'no', '0', 'off'].includes(normalized)) return false;
  return undefined;
}

function coerceString(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return undefined;
}

function normalizeId(value: string): string {
  const normalized = value.trim().toLowerCase().replace(/[ -]+/g, '_');
  const aliases: Record<string, string> = {
    master_yang: 'masterYang',
    clucker: 'crucker',
    twin_lance: 'twinLance',
    evervoid_armor: 'evervoidArmor',
    judgment_necklace: 'judgmentNecklace',
    stardust_sash: 'stardustSash',
    moonscar_bracer: 'moonscarBracer',
    glacial_warboots: 'glacialWarboots',
  };
  return aliases[normalized] ?? normalized;
}

function normalizeMode(value: string): PlayerState['damage']['combat_mode'] {
  const normalized = normalizeId(value);
  if (normalized === 'ee' || normalized === 'endless_echo') return 'ee';
  if (normalized === 'generic' || normalized === 'generic_calculator' || normalized === 'multiplier') return 'generic_calculator';
  return 'lme';
}

function normalizeEnemy(value: string): PlayerState['damage']['enemy_type'] {
  const normalized = normalizeId(value);
  if (normalized === 'boss') return 'boss';
  if (normalized === 'elite') return 'elite';
  return 'normal';
}

function normalizePhase(value: string): PlayerState['lme']['battle_phase'] {
  const normalized = normalizeId(value);
  if (normalized === 'phase_1' || normalized === 'boss_phase_1') return 'phase_1';
  if (normalized === 'phase_2' || normalized === 'boss_phase_2') return 'phase_2';
  if (normalized === 'expedition' || normalized === 'expedition_phase') return 'expedition';
  return 'battle';
}

function setNumber(patch: PatchRecord, path: readonly string[], source: unknown, candidates: readonly string[]): void {
  const value = coerceNumber(readCandidate(source, candidates));
  if (value !== undefined) setPath(patch, path, value);
}

function setBoolean(patch: PatchRecord, path: readonly string[], source: unknown, candidates: readonly string[]): void {
  const value = coerceBoolean(readCandidate(source, candidates));
  if (value !== undefined) setPath(patch, path, value);
}

function setString(
  patch: PatchRecord,
  path: readonly string[],
  source: unknown,
  candidates: readonly string[],
  normalize: (value: string) => string = (value) => value,
): void {
  const value = coerceString(readCandidate(source, candidates));
  if (value !== undefined) setPath(patch, path, normalize(value));
}

export function translateSioExportToPlayerStatePatch(source: unknown): DeepPartial<PlayerState> {
  const patch: PatchRecord = {};

  for (const category of CATEGORY_ROOTS) {
    const value = readCandidate(source, [category]);
    if (isRecord(value)) patch[category] = { ...value };
  }

  setString(patch, ['damage', 'combat_mode'], source, ['damage.combat_mode', 'calc_mode', 'calcMode', 'mode'], normalizeMode);
  setString(patch, ['damage', 'enemy_type'], source, ['damage.enemy_type', 'enemy', 'enemy_type', 'target_type'], normalizeEnemy);
  setNumber(patch, ['damage', 'base_attack'], source, ['damage.base_attack', 'base_atk', 'baseAttack', 'base_attack']);
  setNumber(patch, ['damage', 'final_attack'], source, ['damage.final_attack', 'final_atk', 'finalAttack', 'final_attack']);
  setNumber(patch, ['damage', 'crit_rate_percent'], source, ['damage.crit_rate_percent', 'crit_rate', 'critRate', 'crit_rate_percent']);
  setNumber(patch, ['damage', 'crit_damage_percent'], source, ['damage.crit_damage_percent', 'crit_damage', 'critDamage', 'crit_damage_percent']);
  setNumber(patch, ['damage', 'damage_percent'], source, ['damage.damage_percent', 'damage', 'damage_percent']);
  setNumber(patch, ['damage', 'skill_damage_percent'], source, ['damage.skill_damage_percent', 'skill_damage', 'skillDamage']);
  setNumber(patch, ['damage', 'boss_damage_percent'], source, ['damage.boss_damage_percent', 'boss_damage', 'bossDamage']);
  setNumber(patch, ['damage', 'elite_damage_percent'], source, ['damage.elite_damage_percent', 'elite_damage', 'eliteDamage']);
  setNumber(patch, ['damage', 'vulnerability_percent'], source, ['damage.vulnerability_percent', 'vulnerability', 'vulnerability_percent']);

  setNumber(patch, ['build', 'relic_cores_owned'], source, ['build.relic_cores_owned', 'relic_cores', 'relicCores', 'relic_cores_owned']);
  setNumber(patch, ['build', 'chaos_cores_owned'], source, ['build.chaos_cores_owned', 'chaos_cores', 'chaosCores', 'chaos_cores_owned']);

  setString(patch, ['hero', 'selected_hero_id'], source, ['hero.selected_hero_id', 'hero', 'hero_id', 'selectedHero'], normalizeId);
  setNumber(patch, ['hero', 'selected_hero_level'], source, ['hero.selected_hero_level', 'hero_level', 'heroLevel']);
  setNumber(patch, ['hero', 'selected_hero_star'], source, ['hero.selected_hero_star', 'hero_star', 'heroStar']);
  setNumber(patch, ['hero', 'selected_hero_awakening'], source, ['hero.selected_hero_awakening', 'hero_awakening', 'heroAwakening']);

  for (const slot of EQUIPMENT_SLOTS) {
    setNumber(patch, ['equipment', slot, 'astral_forge_eaf_level'], source, [`equipment.${slot}.astral_forge_eaf_level`, `${slot}_eaf`]);
    setNumber(patch, ['equipment', slot, 'astral_forge_vaf_level'], source, [`equipment.${slot}.astral_forge_vaf_level`, `${slot}_vaf`]);
    setNumber(patch, ['equipment', slot, 'chaos_fusion_level'], source, [`equipment.${slot}.chaos_fusion_level`, `${slot}_cf`]);
    setNumber(patch, ['equipment', slot, 'xeno_transmute_level'], source, [`equipment.${slot}.xeno_transmute_level`, `${slot}_xeno`]);
  }

  setNumber(patch, ['tech', 'resonance_level'], source, ['tech.resonance_level', 'tech_resonance', 'resonance_level']);
  setNumber(patch, ['tech', 'chips_available'], source, ['tech.chips_available', 'chips_available', 'availableChips']);
  setBoolean(patch, ['tech', 'twinborn_enabled'], source, ['tech.twinborn_enabled', 'twinborn', 'twinborn_enabled']);

  setString(patch, ['pet', 'deployed_pet_id'], source, ['pet.deployed_pet_id', 'pet', 'pet_id', 'deployed_pet'], normalizeId);
  setBoolean(patch, ['pet', 'deployed_is_xeno'], source, ['pet.deployed_is_xeno', 'pet_xeno', 'deployed_is_xeno']);
  setNumber(patch, ['pet', 'resonance_atk'], source, ['pet.resonance_atk', 'pet_resonance_atk', 'resonance_atk']);

  setNumber(patch, ['collectible', 'edition_progress'], source, ['collectible.edition_progress', 'edition', 'edition_progress']);
  setNumber(patch, ['collectible', 'advanced_collector_heart_level'], source, ['collectible.advanced_collector_heart_level', 'advanced_heart', 'advanced_collector_heart_level']);

  setString(patch, ['lme', 'battle_phase'], source, ['lme.battle_phase', 'battle_phase', 'phase'], normalizePhase);
  setNumber(patch, ['lme', 'player_medals'], source, ['lme.player_medals', 'player_medals']);
  setNumber(patch, ['lme', 'opponent_medals'], source, ['lme.opponent_medals', 'opponent_medals']);

  setString(patch, ['ecosystem', 'share_code'], source, ['ecosystem.share_code', 'share_code', 'shareCode']);
  setString(patch, ['ecosystem', 'import_url'], source, ['ecosystem.import_url', 'import_url', 'importUrl']);
  setString(patch, ['ecosystem', 'source_build_name'], source, ['ecosystem.source_build_name', 'source_build_name', 'buildName']);

  return patch as DeepPartial<PlayerState>;
}

export function createPlayerStateFromSioExport(source: unknown): PlayerState {
  return createPlayerState(translateSioExportToPlayerStatePatch(source));
}
