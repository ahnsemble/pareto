// P2 01 / 02 / 03 / 04 / 06 / 07 typed contracts — single barrel
// Direct line-cite: see 00_cc_self_check_with_baseline_evidence.md Baseline Evidence Citation Map

// ───────────────────────────── P2 01 SS Equipment (lines 31-104) ─────────────────────────────
export type SSGradeSlot = 'weapon' | 'armor' | 'necklace' | 'belt' | 'gloves' | 'boots';
export type AstralForgeLevel = 0 | 1 | 2 | 3 | 4 | 5;
export type XenoTransmuteLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;
export type EnhancementSystem = 'chaos_fusion' | 'xeno_transmute' | 'astral_forge_only';
export type EffectBranch = 'eaf' | 'vaf' | 'chaos_fusion' | 'xeno_transmute';

export interface AstralForgeEffect {
  branch: Extract<EffectBranch, 'eaf' | 'vaf'>;
  level: AstralForgeLevel;
  effect_id: string;
  stat_channel: string;
  effect_text: string;
  source_citation: string;
}

export interface XenoStageEffect {
  level: XenoTransmuteLevel;
  effect_id: string;
  stat_channel: string;
  condition_key: string | null;
  effect_text: string;
  source_citation: string;
}

export interface IsolatedXenoPendingSlot {
  target_id: 'judgment_necklace_future_xeno' | 'twin_lance_xeno_effect_table';
  xeno_transmute_level: XenoTransmuteLevel;
  xeno_transmute_stage_effects: XenoStageEffect[];
  runtime_input_enabled: boolean;
  ui_empty_state_key: 'ui_label.future_update';
}

export interface SSGradeEquipmentBase {
  id: string;
  display_name_en: string;
  display_name_ko: string;
  slot: SSGradeSlot;
  base_level: number;
  astral_forge_eaf_level: AstralForgeLevel;
  astral_forge_vaf_level: AstralForgeLevel;
  cores_allocated_eternal: number;
  cores_allocated_void: number;
  enhancement_system: EnhancementSystem;
  astral_forge_effects: AstralForgeEffect[];
  system_status: 'active' | 'pending_gt' | 'future_extension';
  source_citations: string[];
}

export type SSItemId =
  | 'twinLance' | 'eternalSuit' | 'evervoidArmor'
  | 'judgmentNecklace' | 'voidwakerEmblem'
  | 'twistingBelt' | 'stardustSash'
  | 'moonscarBracer' | 'voidwakerHandguards'
  | 'glacialWarboots' | 'voidwakerTreads';

export interface SSEquipmentState extends SSGradeEquipmentBase {
  id: SSItemId;
  enhancement_system: EnhancementSystem;
  chaos_fusion_level?: number;
  xeno_transmute_level?: XenoTransmuteLevel;
  xeno_transmute_stage_effects?: XenoStageEffect[];
  future_xeno_transmute?: IsolatedXenoPendingSlot;
}

// Alias for P2 04 contract compatibility
export type SSGradeEquipmentState = SSEquipmentState;

// ───────────────────────────── P2 02 Heroes (lines 22-50) ─────────────────────────────
export type HeroId =
  | 'common' | 'king' | 'masterYang' | 'metalia' | 'joey' | 'taloxa' | 'venato' | 'worm'
  | 'april' | 'splinter' | 'raphael' | 'donatello' | 'tsukuyomi' | 'wesson' | 'catnips';

export type ModifierCondition =
  | 'hp_missing_ratio' | 'target_lacerated' | 'kill_count' | 'target_is_boss_or_elite'
  | 'target_weakened' | 'crit_rate' | 'stance_active' | 'skill_active_window' | 'none';

export interface StarEffect {
  star: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  effect_id: string;
  condition: ModifierCondition;
  stat_channel: string;
  description: string;
  source_citation: string;
}
export interface AwakeningEffect {
  awakening: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  effect_id: string;
  condition: ModifierCondition;
  stat_channel: string;
  description: string;
  source_citation: string;
}
export interface SynergyModifier {
  id: string;
  condition: ModifierCondition;
  operation: 'additive_percent' | 'multiplicative_factor' | 'uptime_weighted_factor' | 'state_gate';
  stat_channel: string;
  source_citation: string;
}
export interface GlobalPassive {
  level: 40 | 80;
  stat_channel: string;
  description: string;
  applies_account_wide: boolean;
  source_citation: string;
}
export interface TeamworkPassive {
  slot_index: 1 | 2 | 3 | 4;
  passive_id: string;
  source_citation: string;
}
export interface HeroSchema {
  id: HeroId;
  display_name_en: string;
  display_name_ko: string;
  tier: 'S' | 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D+' | 'D';
  role: 'main_dps' | 'conditional_dps' | 'buffer' | 'survival' | 'global_passive_holder';
  star_effects: StarEffect[];
  awakening_effects: AwakeningEffect[];
  synergy_modifier: SynergyModifier[];
  global_passive_lv40: GlobalPassive | null;
  global_passive_lv80: GlobalPassive | null;
  teamwork_passives: TeamworkPassive[];
  note?: string;
  source_citations: string[];
}

// ───────────────────────────── P2 03 Weapons / Tech / Pets / Collectibles / LME ─────────────────────────────
export type WeaponRarityGroup = 'ss' | 's_grade' | 'normal';
export type EvolutionGrade = 'excellent' | 'epic' | 'legend' | 'eternal' | 'chaos' | 'ss';
export type TechSlot = 'attack_1' | 'attack_2' | 'attack_3' | 'defense_1' | 'defense_2' | 'defense_3';
export type PetSlot = 'deployed' | 'assist_1' | 'assist_2';
export type LmePhase = 'boss_phase_1' | 'boss_phase_2' | 'battle_phase' | 'expedition_phase';

export interface WeaponSchema {
  id: string;
  display_name_en: string;
  display_name_ko: string;
  rarity_group: WeaponRarityGroup;
  evolution_grade: EvolutionGrade;
  astral_forge_eaf_level: AstralForgeLevel;
  astral_forge_vaf_level: AstralForgeLevel;
  eaf_effects: AstralForgeEffect[];
  vaf_effects: AstralForgeEffect[];
  source_citations: string[];
}

export interface TechPartSchema {
  id: string;
  display_name_en: string;
  display_name_ko: string;
  category?: 'twinborn' | 'activeSkill' | 'modeVariant';
  base_skill_id?: string;
  equipped_slot: TechSlot | null;
  evolution_grade: EvolutionGrade;
  is_twinborn: boolean;
  twinborn_components: string[];
  resonance_chip_allocated: number;
  stat_channels: string[];
  source_citations: string[];
}

export interface TechModifierMatrix {
  [baseTechId: string]: Record<string, number>;
}

export interface AssistSkill {
  id: string;
  stat_channel: string;
  blocked_by_filter: boolean;
}

export interface PetSchema {
  id: string;
  display_name_en: string;
  display_name_ko: string;
  slot: PetSlot | null;
  is_xeno: boolean;
  resonance_chance: number;
  resonance_atk: number;
  assist_filter: AssistSkill[];
  source_citations: string[];
}

export interface MountSchema {
  id: string;
  display_name_en: string;
  display_name_ko: string;
  source_citations: string[];
}

export interface EvoTreeSkillSchema {
  id: string;
  display_name_en: string;
  display_name_ko: string;
  enabled_by_default: boolean;
  source_citations: string[];
}

export interface CollectibleItemSchema {
  id: string;
  display_name_en: string;
  display_name_ko: string;
  source_citations: string[];
}

export interface CollectibleSetSchema {
  id: string;
  display_name_en: string;
  display_name_ko: string;
  collectible_count: 3 | 4;
  item_ids: string[];
  gold_stars: number;
  red_stars: number;
  source_citations: string[];
}

export type CollectibleEditionSchema = CollectibleSetSchema;

export interface CollectibleCatalogSchema {
  items: CollectibleItemSchema[];
  sets: CollectibleSetSchema[];
  event_slots: CollectibleItemSchema[];
}

export interface SioStatSchema {
  index: number;
  key: string;
  uptime_based: boolean;
}

export interface XenoTriggerRow {
  level: 1 | 6 | 10;
  trigger: string;
  cooldown_seconds: number;
}

export type XenoTriggerMatrix = Record<'weapon' | 'armor' | 'necklace', XenoTriggerRow[]>;

export interface LmeTurfNode {
  node_id: string;
  q: number;
  r: number;
  tile_color: 'red' | 'black' | 'yellow';
  phase_weight: Record<LmePhase, number>;
  stat_channel: string;
  enabled: boolean;
  source_citation: string;
}
export interface LmeTurfMatrix {
  matrix_id: 'lme_hex_turf_v3';
  nodes: LmeTurfNode[];
  boss_phase_1_weight: number;
  boss_phase_2_weight: number;
  battle_phase_weight: number;
  expedition_phase_weight: number;
}

// ───────────────────────────── P2 04 Formula contract (lines 22-38) ─────────────────────────────
export type CalculatorMode = 'lme' | 'ee' | 'generic_calculator';
export type SioInputCategory = 'damage' | 'build' | 'hero' | 'equipment' | 'tech' | 'pet' | 'collectible' | 'lme' | 'ecosystem';
export type SioInputType = 'number' | 'select' | 'checkbox' | 'text' | 'radio';
export type SioFieldDefaultValue = string | number | boolean | null;

export interface SioInputFieldSpec {
  category: SioInputCategory;
  key: string;
  label: string;
  input_type: SioInputType;
  range: readonly [number, number] | null;
  default_value: SioFieldDefaultValue;
  source_citation: string;
}

export type DeepPartial<T> =
  T extends readonly (infer U)[]
    ? readonly DeepPartial<U>[]
    : T extends (infer U)[]
      ? DeepPartial<U>[]
      : T extends object
        ? { [K in keyof T]?: DeepPartial<T[K]> }
        : T;

export type SioCombatMode = CalculatorMode;
export type SioEnemyType = 'normal' | 'elite' | 'boss';
export type SioBattlePhase = 'phase_1' | 'phase_2' | 'battle' | 'expedition';
export type SioEquipmentRarity = 'none' | 'excellent' | 'epic' | 'legend' | 'eternal' | 'chaos' | 'ss';
export type SioLocale = 'en' | 'ko';

export interface DamageInputState {
  combat_mode: SioCombatMode;
  enemy_type: SioEnemyType;
  base_attack: number;
  final_attack: number;
  crit_rate_percent: number;
  crit_damage_percent: number;
  damage_percent: number;
  damage_when_100_up_percent: number;
  skill_damage_percent: number;
  boss_damage_percent: number;
  elite_damage_percent: number;
  vulnerability_percent: number;
  ee_skill_buff_level: number;
  ee_tailshot_buff_stacks: number;
  ee_tailshot_enabled: boolean;
}

export interface BuildOptimizerInputState {
  relic_cores_owned: number;
  chaos_cores_owned: number;
  max_weapon_af: AstralForgeLevel;
  max_armor_af: AstralForgeLevel;
  max_necklace_af: AstralForgeLevel;
  max_belt_af: AstralForgeLevel;
  max_gloves_af: AstralForgeLevel;
  max_boots_af: AstralForgeLevel;
  lock_weapon: boolean;
  lock_armor: boolean;
  lock_necklace: boolean;
  lock_belt: boolean;
  lock_gloves: boolean;
  lock_boots: boolean;
}

export interface HeroInputState {
  selected_hero_id: HeroId;
  selected_hero_level: number;
  selected_hero_star: number;
  selected_hero_awakening: number;
  teamwork_slots_unlocked: number;
  global_passive_lv40_enabled: boolean;
  global_passive_lv80_enabled: boolean;
  hero_shards_spent: number;
  awakening_cores_spent: number;
  passive_crit_rate_percent: number;
}

export interface EquipmentSlotInputState {
  item_id: string;
  rarity: SioEquipmentRarity;
  item_level: number;
  enhancement_level: number;
  astral_forge_eaf_level: AstralForgeLevel;
  astral_forge_vaf_level: AstralForgeLevel;
  chaos_fusion_level: number;
  xeno_transmute_level: XenoTransmuteLevel;
  designs_owned: number;
}

export interface EquipmentInputState {
  weapon: EquipmentSlotInputState;
  armor: EquipmentSlotInputState;
  necklace: EquipmentSlotInputState;
  belt: EquipmentSlotInputState;
  gloves: EquipmentSlotInputState;
  boots: EquipmentSlotInputState;
}

export interface TechPartsInputState {
  selected_attack_parts: readonly string[];
  selected_defense_parts: readonly string[];
  resonance_level: number;
  resonance_atk_percent: number;
  chips_available: number;
  twinborn_enabled: boolean;
  twinborn_main_part_id: string;
  twinborn_support_part_id: string;
  drone_chip_percent: number;
  forcefield_chip_percent: number;
  soccer_chip_percent: number;
  durian_chip_percent: number;
  auto_assign_mode: SioCombatMode;
}

export interface PetInputState {
  deployed_pet_id: string;
  deployed_is_xeno: boolean;
  awakening_level: number;
  resonance_chance: number;
  resonance_atk: number;
  assist_pet_1_id: string;
  assist_pet_2_id: string;
  assist_skill_filter_enabled: boolean;
  xeno_preview_enabled: boolean;
}

export interface CollectibleInputState {
  edition_progress: number;
  red_star_total: number;
  yellow_star_total: number;
  custom_collection_slots: number;
  advanced_collector_heart_level: number;
  aim_indicator_enabled: boolean;
  target_collectible_id: string;
  equipment_skill_buff_enabled: boolean;
}

export interface LmeInputState {
  battle_phase: SioBattlePhase;
  player_medals: number;
  opponent_medals: number;
  medal_delta_buff_enabled: boolean;
  turf_nodes_enabled: number;
  attack_turf_percent: number;
  hp_turf_percent: number;
  basic_talent_nodes: number;
  clan_bonus_percent: number;
}

export interface EcosystemInputState {
  share_code: string;
  import_url: string;
  locale: SioLocale;
  autosave_enabled: boolean;
  source_build_name: string;
}

export interface ConditionalCombatState {
  hp_missing_ratio: number;
  target_is_boss: boolean;
  target_is_elite: boolean;
  target_lacerated: boolean;
  target_weakened: boolean;
  kill_count: number;
  shield_active: boolean;
  skill_active_window: boolean;
}

export interface XenoModifier {
  source_id: 'twin_lance_xeno_effect_table' | 'judgment_necklace_future_xeno';
  active_effects: XenoStageEffect[];
  stat_channel_delta: Partial<Record<string, number>>;
}

export interface PlayerState {
  base_attack: number;
  selected_hero: HeroSchema;
  ss_equipment: SSGradeEquipmentState[];
  weapons: WeaponSchema[];
  tech_parts: TechPartSchema[];
  pets: PetSchema[];
  collectibles: CollectibleEditionSchema[];
  lme_turf: LmeTurfMatrix;
  mode: CalculatorMode;
  conditional_state: ConditionalCombatState;
  xeno_transmute_modifier: XenoModifier | null;
  damage: DamageInputState;
  build: BuildOptimizerInputState;
  hero: HeroInputState;
  equipment: EquipmentInputState;
  tech: TechPartsInputState;
  pet: PetInputState;
  collectible: CollectibleInputState;
  lme: LmeInputState;
  ecosystem: EcosystemInputState;
}

export interface SioLiveFixtureCase {
  id: string;
  label: string;
  state: DeepPartial<PlayerState>;
  expected_categories: readonly SioInputCategory[];
}

export interface DamageResult {
  final_damage: number;
  damage_multiplier: number;
  channel_breakdown: Record<string, number>;
  applied_conditionals: string[];
  isolated_pending_xeno_specs_skipped: string[];
}

export interface DamageAccumulator {
  current_damage: number;
  current_multiplier: number;
  channel_breakdown: Record<string, number>;
  applied_conditionals: string[];
  isolated_pending_xeno_specs_skipped: string[];
}

// ───────────────────────────── P2 06 Isolated areas (lines 20-27) ─────────────────────────────
export type IsolatedXenoTarget = 'judgment_necklace_future_xeno' | 'twin_lance_xeno_effect_table';

export interface RuntimeXenoEffectInput {
  target_id: IsolatedXenoTarget;
  source_kind: 'woosung_game_gt' | 'followup_sprint' | 'post_release_fetch';
  entered_by: string;
  entered_at_iso: string;
  effects: XenoStageEffect[];
  evidence_refs: string[];
}

export interface IsolatedAreaPendingSpec {
  target_id: IsolatedXenoTarget;
  active_in_formula: boolean;
  xeno_transmute_level: XenoTransmuteLevel;
  xeno_transmute_stage_effects: XenoStageEffect[];
  runtime_input_enabled: boolean;
  ui_empty_state_key: 'ui_label.future_update';
}

// ───────────────────────────── P3 04 Conditional effect module ─────────────────────────────
export interface ConditionalEffectModule {
  id: string;
  reads: Array<keyof ConditionalCombatState>;
  writes_stat_channel: string;
  required_hero_id: HeroId | null;
  apply: (input: DamageAccumulator, state: ConditionalCombatState) => DamageAccumulator;
  source_citation: string;
}

// ───────────────────────────── P2 07 Component Props (lines 50-65) ─────────────────────────────
export interface ModeSelectDropdownProps {
  value: CalculatorMode;
  onChange(value: CalculatorMode): void;
  availableModes: CalculatorMode[];
}
export interface OutputPanelProps {
  result: DamageResult;
  viewMode: 'damage_multiplier' | 'raw_damage';
  onViewModeChange(value: 'damage_multiplier' | 'raw_damage'): void;
}
export interface BaseInputsBoxProps {
  baseAttack: number;
  finalAttack: number | null;
  designsOwned: number;
  onChange(field: 'base_attack' | 'designs_owned', value: number): void;
}
export interface ItemSelectGridsProps {
  items: SSGradeEquipmentState[];
  selectedIds: string[];
  onSelect(slot: SSGradeSlot, id: string): void;
}
export interface WeaponUpgradeSliderProps {
  weapon: WeaponSchema;
  eafLevel: number;
  vafLevel: number;
  coresAvailable: number;
  onDebouncedChange(branch: 'eaf' | 'vaf', level: AstralForgeLevel): void;
}
export interface TechSelectArrayProps {
  techParts: TechPartSchema[];
  slots: TechSlot[];
  onToggleTwinborn(id: string, enabled: boolean): void;
}
export interface SkillChoicesProps {
  maxSlots: number;
  selectedSkillIds: string[];
  onChange(ids: string[]): void;
}
export interface OptimizationTableProps {
  rows: Array<Record<string, string | number>>;
  lockedResourceIds: string[];
  onLock(id: string): void;
}
export interface HeroSelectModalProps {
  heroes: HeroSchema[];
  selectedHeroId: HeroId;
  onSelect(id: HeroId): void;
}
export interface CollectiblesAccordionProps {
  editions: CollectibleEditionSchema[];
  openEdition: number | null;
  onToggle(edition: number): void;
}
export interface TalentTurfMatrixProps {
  matrix: LmeTurfMatrix;
  onNodeToggle(nodeId: string, enabled: boolean): void;
}
export interface PetSelectRadioProps {
  pets: PetSchema[];
  selectedPetId: string | null;
  mode: 'normal' | 'xeno';
  onSelect(id: string): void;
}
export interface XenoDetailsPanelProps {
  pet: PetSchema | null;
  resonanceChance: number;
  resonanceAtk: number;
  assistFilter: AssistSkill[];
  pending_xeno_specs: Record<IsolatedXenoTarget, IsolatedAreaPendingSpec>;
  onChange(next: Partial<PetSchema>): void;
}
export interface ReviveSettingsToggleProps {
  enabled: boolean;
  reviveIndex: 1 | 2 | 3;
  onToggle(enabled: boolean): void;
}
export interface ResourceLockButtonProps {
  locked: boolean;
  resourceId: string;
  limit: number | null;
  onToggle(resourceId: string): void;
}

// ───────────────────────────── P2 05 i18n (lines 19-22) ─────────────────────────────
export type TranslationCategory = 'ui_label' | 'hero' | 'weapon' | 'item' | 'tech' | 'pet' | 'collectible' | 'mode';
export type TranslationKey = string;
export interface TranslationEntry { category: TranslationCategory; en: string; ko: string; }
export type Translation = Record<TranslationKey, TranslationEntry>;
export type LocaleCode = 'en' | 'ko' | string;
