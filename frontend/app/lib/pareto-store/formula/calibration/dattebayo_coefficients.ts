export const DATTEBAYO_FORMULA_COEFFICIENTS = {
  "stage1_base_normalization": {
    "baseline_player_atk": 2316228.0,
    "flat_attack_bonus": 1427218.1691568
  },
  "stage2_equipment_weapon": {
    "ss_active_slot_bonus": 0.4,
    "ss_af_step_bonus": 0.1,
    "ss_chaos_step_bonus": 0.1,
    "weapon_af_step_bonus": 0.1,
    "ssweapon_chaos_total": 10.08,
    "ssweapon_passive_factor": 1.0180018
  },
  "stage3_tech_parts": {
    "tech_base_gain": 0.05,
    "tech_twinborn_gain": 0.15,
    "tech_resonance_chip_gain": 0.0005,
    "destroyer_contribution_share": 0.0,
    "ssweapon_contribution_share": 0.3234750159
  },
  "stage4_pet_resonance": {
    "deployed_pet_gain": 0.600625,
    "assist_pet_gain": 0.05,
    "pet_resonance_atk_per_unit": 0.0001
  },
  "stage5_collectibles": {
    "collectible_unlock_gain": 0.05,
    "crit_rate_relics": 2.15,
    "crit_damage_relics": 1.75
  },
  "stage6_lme_turf": {
    "turf1_gain": 0.0,
    "turf2_gain": 1.6,
    "lme_damage_dealt_delta": -0.8
  },
  "stage7_conditionals": {
    "venato_hp_scaling_factor": 0.6,
    "taloxa_laceration_factor": 3.64,
    "judgment_weakened_factor": 7.04,
    "king_crit_expected_factor": 16.73,
    "lme_boss_phase_weight": 2.6,
    "lme_battle_phase_weight": 1.0,
    "crit_rate_total": 4.05,
    "crit_damage_additional": 14.73
  },
  "stage8_xeno_resonance": {
    "default_xeno_delta": 0.600625,
    "xeno_clucker_resonance_factor": 1.600625
  },
  "stage9_finalization": {
    "mode_lme_weight": 1.0,
    "mode_ee_weight": 1.0,
    "mode_generic_weight": 1.0,
    "dattebayo_multipliers_output": 606858439306.0,
    "dattebayo_damage_output": 3.94228e+16
  }
} as const;

export type DattebayoFormulaCoefficients = typeof DATTEBAYO_FORMULA_COEFFICIENTS;
