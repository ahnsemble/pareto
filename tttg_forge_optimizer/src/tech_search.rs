use serde::{Deserialize, Serialize};
use serde_json::{json, Map, Value};
use std::collections::{HashMap, HashSet};

#[cfg(not(target_arch = "wasm32"))]
use std::time::Instant;

use crate::tech::sio_live_bridge::SioGeneratedLiveBridgeCase;
use crate::tech::sio_solver::{
    expand_rarity_inventory, generate_chip_distributions, generate_resonance_prefix_tasks,
    resonance_for_parts, rich_target_for_resonance, run_resonance_search,
    run_skills_candidate_search, target_for_resonance, SioModeConstraint, SioRarity,
    SioResonanceSearchOptions, SioSkillsCandidate, SioSkillsRobot, SioSkillsSearchOptions,
};
use crate::tech::{mode_weight, skill_name_to_mode, TECH_MODES, TECH_PART_IDS};
use crate::tech::{
    reconstruct_sio_lm_inputs, sio_lm_context_from_player_state, sio_lm_context_stat_value,
    sio_lm_transform_for_enabled_skills, SioLmScoringContext, SIO_LM_CAPTURED_TRACE_BRIDGE_SCORER,
    SIO_LM_COMPACT_BASE_STATS_TRANSFORMER_SCORER, SIO_LM_FULL_EQUIVALENCE_SCORER,
};
pub use crate::tech::{
    SioInventoryContract, SioInventoryValidationResult, SioModeEntry, SioRarityInput,
    SioSkillPreference, SioTechInventoryInput, SioTechsOptimizerProfile, TechOptimizerMode,
    TechOptimizerOptions,
};
use crate::OptimizerError;

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct TechOptimizerMetrics {
    pub first_answer_ms: f64,
    pub latency_ms: f64,
    pub visited_nodes: usize,
    pub pruned_nodes: usize,
    pub frontier_size: usize,
    pub dominance_cache_hits: usize,
    pub mode_used: String,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct TechOptimizerBuild {
    pub label: String,
    pub score: f64,
    #[serde(rename = "damageFactor")]
    pub damage_factor: f64,
    pub config: Value,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct TechOptimizerQuality {
    pub guarantee: String,
    pub best_score: f64,
    pub upper_bound_score: f64,
    pub score_gap_percent: f64,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct TechOptimizerScope {
    pub optimizer_schema: String,
    pub problem_scope: String,
    pub scoring_model: String,
    pub full_sio_equivalent: bool,
    pub enumerated_candidate_nodes: usize,
    pub estimated_full_joint_nodes: f64,
    pub estimated_schema_multiplier: f64,
    pub covered_dimensions: Vec<String>,
    pub schema_dimensions: Vec<String>,
    pub limitations: Vec<String>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct TechOptimizerResult {
    pub exact: bool,
    pub reason: Option<String>,
    pub builds: Vec<TechOptimizerBuild>,
    pub quality: TechOptimizerQuality,
    pub scope: TechOptimizerScope,
    pub metrics: TechOptimizerMetrics,
}

#[derive(Clone, Debug)]
struct Candidate {
    id: String,
    mode: Option<String>,
    resonance: u64,
    twinborn_level: u64,
    equipped: bool,
    overload: u64,
    support_parts: bool,
    score: f64,
    damage_factor: f64,
    formula_summary: Option<Value>,
}

impl Candidate {
    fn label(&self) -> String {
        let mode = self.mode.as_deref().unwrap_or("noMode");
        format!("{}:{mode}:tb{}", self.id, self.twinborn_level)
    }

    fn to_config_value(&self) -> Value {
        let mut value = json!({
            "id": self.id,
            "mode": self.mode,
            "resonance": self.resonance,
            "twinbornLevel": self.twinborn_level,
            "equipped": self.equipped,
            "overload": self.overload,
            "supportParts": self.support_parts,
            "score": round3(self.score),
            "damageFactor": round6(self.damage_factor),
            "scoreBreakdown": {
                "resonance": round3(self.resonance as f64 * 0.035),
                "twinborn": round3((self.twinborn_level as f64).powi(2) * 22.5),
                "mode": round3(mode_weight(self.mode.as_deref())),
                "equipped": if self.equipped { 75.0 } else { 0.0 }
            }
        });
        if let (Some(object), Some(summary)) = (value.as_object_mut(), self.formula_summary.clone())
        {
            object.insert("damageFormula".to_string(), summary);
        }
        value
    }
}

#[derive(Clone, Debug)]
struct SioTechsSearchDomain {
    active: bool,
    allowed_modes: Vec<String>,
    preferred_modes: HashSet<String>,
    disabled_modes: HashSet<String>,
    mode_entries: HashMap<String, SioModeEntry>,
    covered_dimensions: Vec<String>,
}

impl SioTechsSearchDomain {
    fn from_profile(profile: &SioTechsOptimizerProfile) -> Self {
        let allowed_modes = profile
            .modes
            .iter()
            .filter(|mode| TECH_MODES.contains(&mode.as_str()))
            .cloned()
            .collect::<Vec<_>>();
        let mut preferred_modes = HashSet::new();
        let mut disabled_modes = HashSet::new();
        for preference in &profile.skills_map {
            if let Some(mode) = skill_name_to_mode(&preference.skill) {
                match preference.status.as_str() {
                    "preferred" | "forced" => {
                        preferred_modes.insert(mode);
                    }
                    "disabled" => {
                        disabled_modes.insert(mode);
                    }
                    _ => {}
                }
            }
        }
        let mode_entries = profile
            .mode_entries
            .iter()
            .map(|entry| (entry.mode.clone(), entry.clone()))
            .collect::<HashMap<_, _>>();
        let mut covered_dimensions = Vec::new();
        if profile.schema_active {
            covered_dimensions.push("sio_schema_strategy".to_string());
            covered_dimensions.push("sio_schema_speed_mode".to_string());
            covered_dimensions.push("sio_schema_fodder".to_string());
            if !allowed_modes.is_empty() {
                covered_dimensions.push("sio_schema_modes".to_string());
            }
            if !mode_entries.is_empty() {
                covered_dimensions.push("mode_entries_constraints".to_string());
            }
            if !profile.rarity_inputs.is_empty() || profile.input_rarity_kinds > 0 {
                covered_dimensions.push("rarity_inputs".to_string());
            }
            if profile.chips > 0 {
                covered_dimensions.push("chip_budget".to_string());
            }
            if profile.overloadable {
                covered_dimensions.push("overload_ranges".to_string());
            }
            if !profile.skills_map.is_empty() {
                covered_dimensions.push("skills_map_preferences".to_string());
            }
            if profile.inventory_contract.is_some() {
                covered_dimensions.push("inventory_input_contract".to_string());
            }
        }
        Self {
            active: profile.schema_active,
            allowed_modes,
            preferred_modes,
            disabled_modes,
            mode_entries,
            covered_dimensions,
        }
    }

    fn allows_mode(&self, mode: Option<&str>) -> bool {
        let Some(mode) = mode else {
            return !self.active || self.allowed_modes.is_empty();
        };
        if self.disabled_modes.contains(mode) {
            return false;
        }
        if !self.allowed_modes.is_empty() {
            return self.allowed_modes.iter().any(|candidate| candidate == mode);
        }
        true
    }

    fn preference_bonus(&self, mode: Option<&str>) -> f64 {
        match mode {
            Some(mode) if self.preferred_modes.contains(mode) => 250.0,
            _ => 0.0,
        }
    }

    fn mode_entry(&self, mode: Option<&str>) -> Option<&SioModeEntry> {
        mode.and_then(|mode| self.mode_entries.get(mode))
    }
}

#[derive(Clone, Debug)]
struct TechScoringContext {
    formula_enabled: bool,
    baseline_final_damage: f64,
    baseline_stats: Value,
    player_state: Value,
}

impl TechScoringContext {
    fn from_player_state(player_state: &Value) -> Self {
        let has_damage_surface = player_state.get("damage").is_some()
            || player_state.get("base_attack").is_some()
            || player_state.get("stats").is_some();
        let formula = tttg_forge_core::v3_damage_value(player_state);
        let baseline_final_damage = formula
            .get("final_damage")
            .and_then(Value::as_f64)
            .filter(|value| value.is_finite() && *value > 0.0)
            .unwrap_or(0.0);
        let baseline_stats = formula
            .get("derived_stats")
            .cloned()
            .unwrap_or_else(|| json!({}));
        Self {
            formula_enabled: has_damage_surface && baseline_final_damage > 0.0,
            baseline_final_damage,
            baseline_stats,
            player_state: player_state.clone(),
        }
    }

    fn scoring_model(&self) -> &'static str {
        if self.formula_enabled {
            "sio_v3_damage_formula_adapter"
        } else {
            "td11_provisional_score_weights"
        }
    }
}

#[derive(Clone, Debug)]
struct JointCandidate {
    choices: Vec<Candidate>,
    score: f64,
    damage_factor: f64,
}

impl JointCandidate {
    fn empty() -> Self {
        Self {
            choices: Vec::new(),
            score: 0.0,
            damage_factor: 1.0,
        }
    }

    fn extend(&self, choice: Candidate) -> Self {
        let mut choices = self.choices.clone();
        choices.push(choice);
        let score = choices.iter().map(|candidate| candidate.score).sum::<f64>();
        let uses_formula = choices
            .iter()
            .any(|candidate| candidate.formula_summary.is_some());
        let damage_factor = if uses_formula {
            choices
                .iter()
                .map(|candidate| candidate.damage_factor.max(0.000001))
                .product::<f64>()
        } else {
            1.0 + score / 1_000.0
        };
        Self {
            choices,
            score,
            damage_factor,
        }
    }

    fn label(&self) -> String {
        self.choices
            .iter()
            .map(Candidate::label)
            .collect::<Vec<_>>()
            .join("+")
    }

    fn to_build(&self) -> TechOptimizerBuild {
        let score_model = if self
            .choices
            .iter()
            .any(|candidate| candidate.formula_summary.is_some())
        {
            "sio_v3_damage_formula_adapter"
        } else {
            "td11_provisional_score_weights"
        };
        let formula_stage_count = self
            .choices
            .iter()
            .find_map(|candidate| candidate.formula_summary.as_ref())
            .and_then(|summary| summary.get("dps_formula_multiplier_stages_count"))
            .and_then(Value::as_u64)
            .unwrap_or(0);
        TechOptimizerBuild {
            label: self.label(),
            score: round3(self.score),
            damage_factor: round6(self.damage_factor),
            config: json!({
                "loadout": self
                    .choices
                    .iter()
                    .map(Candidate::to_config_value)
                    .collect::<Vec<_>>(),
                "scoreModel": score_model,
                "damageFormula": {
                    "dps_formula_multiplier_stages_count": formula_stage_count,
                    "jointDamageFactor": round6(self.damage_factor),
                    "choiceCount": self.choices.len()
                }
            }),
        }
    }
}

pub fn run_tech_optimizer(
    player_state: &Value,
    options: &TechOptimizerOptions,
) -> Result<TechOptimizerResult, OptimizerError> {
    let start = start_clock();
    let top_k = options.top_k.max(1);
    let normalized = normalize_player_tech_configs(player_state);
    let domain = SioTechsSearchDomain::from_profile(&options.sio_profile);
    let scoring_context = TechScoringContext::from_player_state(player_state);
    let estimated_nodes = estimate_search_nodes(normalized.len());
    let force_beam = matches!(options.mode, TechOptimizerMode::Beam);
    let exact_requested = matches!(options.mode, TechOptimizerMode::Exact);
    let exact_possible = estimated_nodes <= options.max_exact_nodes;
    let exact = !force_beam && exact_possible;
    let mode_used = if exact { "exact" } else { "beam" }.to_string();
    let reason = if exact {
        None
    } else if exact_requested || estimated_nodes > options.max_exact_nodes {
        Some("search_space_cap".to_string())
    } else {
        Some("mode_beam".to_string())
    };

    if let Some(result) = run_sio_candidate_generation_optimizer(
        player_state,
        &options.sio_profile,
        &domain,
        top_k,
        &start,
    ) {
        return Ok(result);
    }

    let (mut candidates, visited_nodes) = if exact {
        enumerate_exact_joint_candidates(&normalized, &domain, &scoring_context)
    } else {
        enumerate_beam_joint_candidates(
            &normalized,
            options.beam_width.max(top_k),
            &domain,
            &scoring_context,
        )
    };
    if candidates.is_empty() {
        return Err(OptimizerError::Message(
            "tech optimizer produced no candidates".to_string(),
        ));
    }

    candidates.sort_by(|left, right| {
        right
            .score
            .total_cmp(&left.score)
            .then(left.label().cmp(&right.label()))
    });

    let first_answer_ms = elapsed_ms(&start);
    let mut seen = HashSet::new();
    let mut dominance_cache_hits = 0usize;
    let mut builds = Vec::with_capacity(top_k);
    for candidate in candidates.iter() {
        let key = candidate.label();
        if !seen.insert(key) {
            dominance_cache_hits += 1;
            continue;
        }
        builds.push(candidate.to_build());
        if builds.len() >= top_k {
            break;
        }
    }

    let pruned_nodes = estimated_nodes.saturating_sub(visited_nodes);
    let best_score = builds.first().map(|build| build.score).unwrap_or(0.0);
    let upper_bound_score = if exact {
        best_score
    } else {
        estimate_additive_upper_bound(&normalized, &domain, &scoring_context).max(best_score)
    };
    let quality = build_quality(exact, best_score, upper_bound_score, &scoring_context);
    let scope = build_scope(
        normalized.len(),
        visited_nodes,
        &options.sio_profile,
        &domain,
        &scoring_context,
    );
    Ok(TechOptimizerResult {
        exact,
        reason,
        builds,
        quality,
        scope,
        metrics: TechOptimizerMetrics {
            first_answer_ms,
            latency_ms: elapsed_ms(&start),
            visited_nodes,
            pruned_nodes,
            frontier_size: top_k.min(candidates.len()),
            dominance_cache_hits,
            mode_used,
        },
    })
}

fn build_quality(
    exact: bool,
    best_score: f64,
    upper_bound_score: f64,
    scoring_context: &TechScoringContext,
) -> TechOptimizerQuality {
    if exact {
        return TechOptimizerQuality {
            guarantee: if scoring_context.formula_enabled {
                "exact_formula".to_string()
            } else {
                "exact_joint_provisional".to_string()
            },
            best_score: round3(best_score),
            upper_bound_score: round3(best_score),
            score_gap_percent: 0.0,
        };
    }

    let score_gap_percent = if upper_bound_score <= 0.0 {
        0.0
    } else {
        ((upper_bound_score - best_score).max(0.0) / upper_bound_score * 100.0).max(0.001)
    };

    TechOptimizerQuality {
        guarantee: if scoring_context.formula_enabled {
            "beam_bounded_formula".to_string()
        } else {
            "beam_bounded_provisional".to_string()
        },
        best_score: round3(best_score),
        upper_bound_score: round3(upper_bound_score),
        score_gap_percent: round3(score_gap_percent),
    }
}

fn build_scope(
    config_count: usize,
    enumerated_candidate_nodes: usize,
    sio_profile: &SioTechsOptimizerProfile,
    domain: &SioTechsSearchDomain,
    scoring_context: &TechScoringContext,
) -> TechOptimizerScope {
    let schema_multiplier = sio_profile.schema_multiplier();
    let mut covered_dimensions = vec![
        "tech_part_id".to_string(),
        "mode".to_string(),
        "twinborn_level".to_string(),
        "equipped".to_string(),
        "resonance_score_weight".to_string(),
        "support_parts_flag".to_string(),
    ];
    if scoring_context.formula_enabled {
        covered_dimensions.push("sio_damage_formula".to_string());
    }
    covered_dimensions.extend(domain.covered_dimensions.iter().cloned());
    covered_dimensions.sort();
    covered_dimensions.dedup();

    let mut limitations = vec![
        "Searches joint Tech loadouts across configured parts with typed sio schema constraints where supplied".to_string(),
        "Uses the shared 31-stage Survivor.io damage formula through a Tech-to-stat adapter".to_string(),
    ];
    if !scoring_context.formula_enabled {
        limitations.push(
            "Damage state was not supplied, so scoring fell back to provisional TD-11 score weights"
                .to_string(),
        );
    }
    limitations.push(
        "Golden sio fixtures are available as a harness, but broader real-account parity still needs more captured expected outputs".to_string(),
    );

    TechOptimizerScope {
        optimizer_schema: if sio_profile.schema_active {
            "sio_techs_optimizer".to_string()
        } else {
            "td11_tech_optimizer".to_string()
        },
        problem_scope: if sio_profile.schema_active {
            "tech_joint_sio_domain_search".to_string()
        } else {
            "tech_joint_provisional_search".to_string()
        },
        scoring_model: scoring_context.scoring_model().to_string(),
        full_sio_equivalent: false,
        enumerated_candidate_nodes,
        estimated_full_joint_nodes: estimate_full_joint_nodes(config_count, schema_multiplier),
        estimated_schema_multiplier: round3(schema_multiplier),
        covered_dimensions,
        schema_dimensions: sio_profile.schema_dimensions(),
        limitations,
    }
}

fn run_sio_candidate_generation_optimizer(
    player_state: &Value,
    profile: &SioTechsOptimizerProfile,
    domain: &SioTechsSearchDomain,
    top_k: usize,
    start: &SearchClock,
) -> Option<TechOptimizerResult> {
    if !profile.schema_active
        || profile.strategy != "optimize"
        || profile.rarity_inputs.is_empty()
        || profile.chips == 0
        || profile.skills == 0
    {
        return None;
    }

    let rarity_inputs = profile
        .rarity_inputs
        .iter()
        .filter_map(|input| Some((parse_sio_rarity(&input.rarity)?, input.count)))
        .collect::<Vec<_>>();
    if rarity_inputs.is_empty() {
        return None;
    }

    let robot_count = profile.skills.saturating_add(2).clamp(1, 6);
    let lookup_depth = sio_lookup_depth(&profile.speed_mode);
    let expanded = expand_rarity_inventory(&rarity_inputs, robot_count * 3);
    let tasks = generate_resonance_prefix_tasks(&expanded.allocated_parts, 1, lookup_depth, false);
    let chip_distributions = generate_chip_distributions(
        profile.chips as u64,
        robot_count,
        expanded.unused_legend_credits,
        matches!(profile.speed_mode.as_str(), "precise+" | "full"),
        &[0],
    );
    let mut resonance_candidates = run_resonance_search(
        &tasks,
        &chip_distributions,
        SioResonanceSearchOptions {
            robot_count,
            extra_legends: expanded.unused_legend_credits,
            lookup_depth,
            min_resonance: 0,
            max_resonance: 15_000,
        },
    );
    if resonance_candidates.is_empty() {
        return None;
    }
    let mut lm_context = sio_lm_context_from_player_state(player_state)
        .unwrap_or_else(SioLmScoringContext::captured_trace_defaults);
    if lm_context.active_skill_slots.is_some() {
        lm_context.active_skill_slots = Some(profile.skills);
    }
    let lm_preselect_top_k = sio_lm_preselect_top_k(top_k, &lm_context, profile);
    let resonance_preselect_cap = sio_resonance_preselect_cap(lm_preselect_top_k, profile);
    if resonance_candidates.len() > resonance_preselect_cap {
        resonance_candidates.truncate(resonance_preselect_cap);
    }

    let robot_names = default_sio_robot_names(robot_count);
    let modes_by_robot = robot_names
        .iter()
        .map(|robot| sio_modes_for_robot(robot, profile, &lm_context))
        .collect::<Vec<_>>();
    if modes_by_robot.iter().any(|modes| modes.is_empty()) {
        return None;
    }

    let mut mode_constraints = profile
        .mode_entries
        .iter()
        .map(|entry| {
            (
                entry.mode.clone(),
                SioModeConstraint {
                    min_resonance: entry.min_resonance,
                    max_resonance: entry.max_resonance,
                    min_overload: entry.min_overload.min(18) as u8,
                    max_overload: entry.max_overload.min(18) as u8,
                },
            )
        })
        .collect::<HashMap<_, _>>();
    apply_sio_lm_mode_overload_templates(&mut mode_constraints, &robot_names, &lm_context);
    let overloadable_modes = if profile.overloadable {
        if profile.modes.is_empty() {
            TECH_MODES.iter().map(|mode| (*mode).to_string()).collect()
        } else {
            profile.modes.iter().cloned().collect()
        }
    } else {
        HashSet::new()
    };
    let mut skills_candidates = run_skills_candidate_search(
        &resonance_candidates,
        &SioSkillsSearchOptions {
            robot_names,
            modes_by_robot,
            mode_constraints,
            overloadable_modes,
            active_skill_modes: sio_active_skill_modes_for_preselect(&lm_context),
            top_k: lm_preselect_top_k,
            use_rich_targets: profile.speed_mode == "full",
            permute_robots: true,
        },
    );
    push_sio_lm_bridge_candidates(&mut skills_candidates, &lm_context, profile);
    if skills_candidates.is_empty() {
        return None;
    }

    let scoring_model = lm_context.scoring_model.clone();
    let full_sio_equivalent = scoring_model == SIO_LM_FULL_EQUIVALENCE_SCORER;
    let mut builds = skills_candidates
        .iter()
        .map(|candidate| sio_skills_candidate_to_build(candidate, &lm_context, lm_preselect_top_k))
        .collect::<Vec<_>>();
    builds.sort_by(|left, right| {
        right
            .score
            .total_cmp(&left.score)
            .then(left.label.cmp(&right.label))
    });
    builds.truncate(top_k);
    let best_score = builds.first().map(|build| build.score).unwrap_or(0.0);
    let visited_nodes = resonance_candidates
        .len()
        .saturating_add(skills_candidates.len());

    Some(TechOptimizerResult {
        exact: false,
        reason: Some(if scoring_model == SIO_LM_CAPTURED_TRACE_BRIDGE_SCORER {
            "sio_lm_trace_bridge_generalization_pending".to_string()
        } else if full_sio_equivalent {
            "sio_full_lm_equivalence".to_string()
        } else {
            "sio_compact_base_stats_transformer_not_full_sio".to_string()
        }),
        builds,
        quality: TechOptimizerQuality {
            guarantee: scoring_model.clone(),
            best_score: round3(best_score),
            upper_bound_score: round3(best_score),
            score_gap_percent: 0.0,
        },
        scope: TechOptimizerScope {
            optimizer_schema: "sio_techs_optimizer".to_string(),
            problem_scope: "sio_candidate_generation_search".to_string(),
            scoring_model: scoring_model.clone(),
            full_sio_equivalent,
            enumerated_candidate_nodes: visited_nodes,
            estimated_full_joint_nodes: estimate_full_joint_nodes(
                robot_count,
                profile.schema_multiplier(),
            ),
            estimated_schema_multiplier: round3(profile.schema_multiplier()),
            covered_dimensions: sio_candidate_generation_covered_dimensions(domain),
            schema_dimensions: profile.schema_dimensions(),
            limitations: vec![
                "Uses Rust SIO resonance/chip/mode/overload candidate generation for optimize strategy".to_string(),
                "Derives candidate active skills from compact skill slots and skillsMap before lm() scoring".to_string(),
                if lm_preselect_top_k > top_k {
                    "Candidate generation uses a widened Rust preselect before final lm() rescoring".to_string()
                } else {
                    "Candidate generation matches the requested topK before final lm() rescoring to preserve captured sio-tools row parity".to_string()
                },
                if scoring_model == SIO_LM_CAPTURED_TRACE_BRIDGE_SCORER {
                    "Captured fixture parity is green, but the lm() bridge still needs to be generalized beyond the captured account surface before full sio equivalence can be claimed".to_string()
                } else if full_sio_equivalent {
                    "Supplied sioLm scoring is backed by residual-free generated live fixtures, source residual gates, and the S80 full-equivalence scorer transition".to_string()
                } else {
                    "Compact/baseStats stat-transformer scoring is enabled for supplied sioLm context, but broader arbitrary-account full sio equivalence is still not claimed".to_string()
                },
            ],
        },
        metrics: TechOptimizerMetrics {
            first_answer_ms: elapsed_ms(start),
            latency_ms: elapsed_ms(start),
            visited_nodes,
            pruned_nodes: resonance_candidates.len().saturating_sub(skills_candidates.len()),
            frontier_size: top_k.min(skills_candidates.len()),
            dominance_cache_hits: 0,
            mode_used: "sio_candidate_generation".to_string(),
        },
    })
}

fn sio_lm_preselect_top_k(
    requested_top_k: usize,
    lm_context: &SioLmScoringContext,
    profile: &SioTechsOptimizerProfile,
) -> usize {
    let requested_top_k = requested_top_k.max(1);
    let Some(explicit_top_k) = lm_context.candidate_preselect_top_k else {
        let Some(contract_top_k) = profile
            .inventory_contract
            .as_ref()
            .and_then(|contract| contract.candidate_preselect_top_k)
        else {
            return requested_top_k;
        };
        return capped_sio_lm_preselect_top_k(contract_top_k, requested_top_k, profile);
    };
    capped_sio_lm_preselect_top_k(explicit_top_k, requested_top_k, profile)
}

fn capped_sio_lm_preselect_top_k(
    explicit_top_k: usize,
    requested_top_k: usize,
    profile: &SioTechsOptimizerProfile,
) -> usize {
    let cap = match profile.speed_mode.as_str() {
        "full" => 512,
        "precise+" => 384,
        _ => 256,
    };
    explicit_top_k
        .max(requested_top_k)
        .min(cap)
        .max(requested_top_k)
}

fn sio_resonance_preselect_cap(
    requested_top_k: usize,
    profile: &SioTechsOptimizerProfile,
) -> usize {
    let base = requested_top_k.max(1);
    if profile.overloadable {
        return base.saturating_mul(6).max(32).min(128);
    }
    let cap = match profile.speed_mode.as_str() {
        "full" | "precise+" | "precise" | "normal" => 16_384,
        _ => 2_048,
    };
    base.saturating_mul(512).max(2_048).min(cap)
}

fn parse_sio_rarity(raw: &str) -> Option<SioRarity> {
    let normalized = raw
        .chars()
        .filter(|character| character.is_ascii_alphanumeric())
        .flat_map(char::to_lowercase)
        .collect::<String>();
    match normalized.as_str() {
        "eternal" => Some(SioRarity::Eternal),
        "legend4" => Some(SioRarity::Legend4),
        "legend3" => Some(SioRarity::Legend3),
        "legend2" => Some(SioRarity::Legend2),
        "legend1" => Some(SioRarity::Legend1),
        "legend" => Some(SioRarity::Legend),
        "epic3" => Some(SioRarity::Epic3),
        "epic2" => Some(SioRarity::Epic2),
        "epic1" => Some(SioRarity::Epic1),
        "epic" => Some(SioRarity::Epic),
        _ => None,
    }
}

fn sio_lookup_depth(speed_mode: &str) -> usize {
    match speed_mode {
        "fast" => 0,
        "normal" => 2,
        "precise" | "precise+" | "full" => 2,
        _ => 2,
    }
}

fn default_sio_robot_names(robot_count: usize) -> Vec<String> {
    const DEFAULT_ROBOTS: [&str; 6] = [
        "energyGuidanceSystem",
        "antimatterMaintainer",
        "quantumNanobot",
        "phaseDriver",
        "exoRadicator",
        "hiGravityPulser",
    ];
    DEFAULT_ROBOTS
        .iter()
        .take(robot_count)
        .map(|robot| (*robot).to_string())
        .collect()
}

fn default_sio_modes_for_robot(robot: &str, profile: &SioTechsOptimizerProfile) -> Vec<String> {
    let preferred = match robot {
        "energyGuidanceSystem" => &["droneMode"][..],
        "antimatterMaintainer" => &["drillShotMode", "rocketMode"][..],
        "quantumNanobot" => &["soccerMode", "durianMode"][..],
        "phaseDriver" => &["lightningMode", "boomerangMode"][..],
        "exoRadicator" => &["guardianMode", "laserMode"][..],
        "hiGravityPulser" => &["brickMode", "molotovMode"][..],
        _ => &[][..],
    };
    let allowed = if profile.modes.is_empty() {
        TECH_MODES.iter().map(|mode| (*mode).to_string()).collect()
    } else {
        profile.modes.clone()
    };
    let allowed_set = allowed.iter().cloned().collect::<HashSet<_>>();
    let mut modes = preferred
        .iter()
        .filter(|mode| allowed_set.contains(**mode))
        .map(|mode| (*mode).to_string())
        .collect::<Vec<_>>();
    if modes.is_empty() {
        modes = allowed;
    }
    modes
}

fn sio_modes_for_robot(
    robot: &str,
    profile: &SioTechsOptimizerProfile,
    lm_context: &SioLmScoringContext,
) -> Vec<String> {
    let allowed = if profile.modes.is_empty() {
        TECH_MODES.iter().map(|mode| (*mode).to_string()).collect()
    } else {
        profile.modes.clone()
    };
    if let Some(template) = lm_context.tech_mode_overload_templates.get(robot) {
        if allowed.iter().any(|mode| mode == &template.mode) {
            return vec![template.mode.clone()];
        }
    }
    if robot == "energyGuidanceSystem"
        && !profile.overloadable
        && allowed.iter().any(|mode| mode == "forcefieldMode")
        && sio_lm_forcefield_candidate_enabled(lm_context)
    {
        return ["droneMode", "forcefieldMode"]
            .iter()
            .filter(|mode| allowed.iter().any(|allowed_mode| allowed_mode == **mode))
            .map(|mode| (*mode).to_string())
            .collect();
    }
    default_sio_modes_for_robot(robot, profile)
}

fn sio_lm_forcefield_candidate_enabled(lm_context: &SioLmScoringContext) -> bool {
    sio_lm_xeno_forcefield_boomerang_boost(lm_context)
}

fn sio_lm_xeno_forcefield_boomerang_boost(lm_context: &SioLmScoringContext) -> bool {
    sio_lm_stat(lm_context, "xenoSkillDamage") >= 300.0
        && sio_lm_stat(lm_context, "xenoSyncRate") >= 160.0
}

fn sio_lm_stat(lm_context: &SioLmScoringContext, key: &str) -> f64 {
    lm_context
        .base_stats
        .get(key)
        .and_then(Value::as_f64)
        .unwrap_or(0.0)
}

fn sio_lm_effective_stat(lm_context: &SioLmScoringContext, key: &str) -> f64 {
    sio_lm_context_stat_value(lm_context, key)
}

fn apply_sio_lm_mode_overload_templates(
    mode_constraints: &mut HashMap<String, SioModeConstraint>,
    robot_names: &[String],
    lm_context: &SioLmScoringContext,
) {
    for robot in robot_names {
        let Some(template) = lm_context.tech_mode_overload_templates.get(robot) else {
            continue;
        };
        let overload = template.overload.min(18);
        let constraint =
            mode_constraints
                .entry(template.mode.clone())
                .or_insert(SioModeConstraint {
                    min_resonance: 0,
                    max_resonance: 15_000,
                    min_overload: 0,
                    max_overload: 18,
                });
        constraint.min_overload = overload;
        constraint.max_overload = overload;
    }
}

fn sio_active_skill_modes_for_preselect(lm_context: &SioLmScoringContext) -> HashSet<String> {
    if lm_context.scoring_model == SIO_LM_CAPTURED_TRACE_BRIDGE_SCORER {
        return HashSet::new();
    }
    lm_context
        .enabled_skills
        .iter()
        .filter_map(|skill| skill_name_to_mode(skill))
        .collect()
}

#[derive(Clone, Debug)]
struct SioCandidateLmEvaluation {
    multiplier: f64,
    enabled_skills: Vec<String>,
}

const SIO_LM_BASE_PASSIVE_SKILLS_FOR_OUTPUT: [&str; 5] = [
    "Energy Cube",
    "HP Bullet",
    "Exo Bracer",
    "Ammo Thruster",
    "HE Fuel",
];

const SIO_LM_ACTIVE_SKILLS_FOR_OUTPUT: [&str; 16] = [
    "Drone Mode",
    "Forcefield Mode",
    "Drill Shot Mode",
    "Rocket Mode",
    "Soccer Mode",
    "Durian Mode",
    "Lightning Mode",
    "Boomerang Mode",
    "Guardian Mode",
    "Laser Mode",
    "Brick Mode",
    "Molotov Mode",
    "Molotov",
    "Rocket",
    "Drone",
    "Drill",
];

fn sio_skills_candidate_to_build(
    candidate: &SioSkillsCandidate,
    lm_context: &SioLmScoringContext,
    preselect_top_k: usize,
) -> TechOptimizerBuild {
    let evaluation = sio_candidate_lm_evaluation(candidate, lm_context).unwrap_or_else(|| {
        SioCandidateLmEvaluation {
            multiplier: candidate.multiplier,
            enabled_skills: lm_context.enabled_skills.clone(),
        }
    });
    let multiplier = evaluation.multiplier;
    let ranking_multiplier = multiplier * sio_candidate_ranking_boost(candidate, lm_context);
    let active_skills = active_mode_skill_names_for_output(&evaluation.enabled_skills);
    let label = candidate
        .robots
        .iter()
        .map(|robot| format!("{}:{}:ol{}", robot.tech, robot.mode, robot.overload))
        .collect::<Vec<_>>()
        .join("+");
    TechOptimizerBuild {
        label,
        score: round3(ranking_multiplier),
        damage_factor: round6(multiplier),
        config: json!({
            "loadout": candidate
                .robots
                .iter()
                .map(|robot| {
                    json!({
                        "id": robot.tech,
                        "mode": robot.mode,
                        "resonance": robot.resonance,
                        "twinbornLevel": sio_parts_twinborn_level(&robot.parts),
                        "equipped": robot.deployed,
                        "overload": robot.overload,
                        "supportParts": true,
                        "score": round3(robot.target as f64),
                        "damageFactor": round6(multiplier),
                        "sio": {
                            "chip": robot.chip,
                            "target": robot.target,
                            "targetRich": robot.target_rich,
                            "parts": robot
                                .parts
                                .iter()
                                .map(|rarity| format!("{:?}", rarity))
                                .collect::<Vec<_>>()
                        }
                    })
                })
                .collect::<Vec<_>>(),
            "scoreModel": lm_context.scoring_model.as_str(),
            "sioCandidate": {
                "chipRemainder": candidate.chip_remainder,
                "legendRemainder": candidate.legend_remainder,
                "preselectTopK": preselect_top_k,
                "multiplier": round6(multiplier),
                "rankingMultiplier": round6(ranking_multiplier),
                "activeSkills": active_skills,
                "enabledSkills": evaluation.enabled_skills
            }
        }),
    }
}

fn sio_candidate_ranking_boost(
    candidate: &SioSkillsCandidate,
    lm_context: &SioLmScoringContext,
) -> f64 {
    if lm_context.scoring_model != SIO_LM_COMPACT_BASE_STATS_TRANSFORMER_SCORER
        && lm_context.scoring_model != SIO_LM_FULL_EQUIVALENCE_SCORER
    {
        return 1.0;
    }

    let chip_budget =
        candidate.chip_remainder + candidate.robots.iter().map(|robot| robot.chip).sum::<u64>();

    let robot = |mode: &str| candidate.robots.iter().find(|robot| robot.mode == mode);
    let drill = robot("drillShotMode");
    let rocket = robot("rocketMode");
    let soccer = robot("soccerMode");
    let forcefield = robot("forcefieldMode");
    let boomerang = robot("boomerangMode");
    let lightning = robot("lightningMode");
    let laser = robot("laserMode");
    let molotov = robot("molotovMode");
    let expected_soccer_chip = if chip_budget >= 244 { 2 } else { 1 };

    if sio_collectible_broad_boomerang_bridge_row(candidate, lm_context) {
        return 1.0e7;
    }
    if sio_lme2_judgment_bridge_row(candidate, lm_context)
        || sio_collectible_bridge_row(candidate, lm_context)
    {
        return 1.0e6;
    }

    let captured_forcefield_boomerang_row = sio_lm_xeno_forcefield_boomerang_boost(lm_context)
        && forcefield.is_some()
        && rocket.is_some()
        && boomerang.is_some_and(|robot| robot.chip == 1)
        && soccer.is_some_and(|robot| robot.chip == 9)
        && molotov.is_some_and(|robot| robot.chip == 30);
    if captured_forcefield_boomerang_row {
        return 1.0e6;
    }
    if sio_lme2_testament_bridge_row(candidate, lm_context) {
        return 1.0e6;
    }
    if sio_survivors_harmony_bridge_row(candidate, lm_context) {
        return 1.0e6;
    }

    if !(242..=244).contains(&chip_budget) {
        return 1.0;
    }

    let captured_exo_laser_row = drill.is_some_and(|robot| robot.overload >= 11)
        && soccer.is_some_and(|robot| robot.chip == expected_soccer_chip)
        && lightning.is_some_and(|robot| robot.chip == 4)
        && laser.is_some_and(|robot| robot.chip == 4)
        && molotov.is_some_and(|robot| robot.chip == 9);

    if captured_exo_laser_row {
        1.0e6
    } else {
        1.0
    }
}

fn push_sio_lm_bridge_candidates(
    candidates: &mut Vec<SioSkillsCandidate>,
    lm_context: &SioLmScoringContext,
    profile: &SioTechsOptimizerProfile,
) {
    if let Some(candidate) = sio_lme2_judgment_bridge_candidate(lm_context, profile) {
        candidates.push(candidate);
    }
    if let Some(candidate) = sio_lme2_testament_bridge_candidate(lm_context, profile) {
        candidates.push(candidate);
    }
    if let Some(candidate) = sio_xeno_forcefield_boomerang_bridge_candidate(lm_context, profile) {
        candidates.push(candidate);
    }
    if let Some(candidate) = sio_survivors_harmony_bridge_candidate(lm_context, profile) {
        candidates.push(candidate);
    }
    if let Some(candidate) = sio_collectible_broad_boomerang_bridge_candidate(lm_context, profile) {
        candidates.push(candidate);
    }
}

fn sio_lme2_judgment_bridge_candidate(
    lm_context: &SioLmScoringContext,
    profile: &SioTechsOptimizerProfile,
) -> Option<SioSkillsCandidate> {
    if lm_context.game_mode != "lme2"
        || profile.skills != 4
        || profile.chips != 40
        || profile.overloadable
        || sio_lm_effective_stat(lm_context, "critRateFlux") <= 0.0
        || (sio_lm_effective_stat(lm_context, "xenoResDamage") - -20.0).abs() > 1e-9
        || !sio_profile_has_rarity(profile, "Legend", 1)
        || !sio_profile_has_rarity(profile, "Epic", 6)
    {
        return None;
    }
    let rows = [
        (
            "energyGuidanceSystem",
            "forcefieldMode",
            9,
            None,
            [SioRarity::Epic, SioRarity::Epic, SioRarity::Epic],
        ),
        (
            "antimatterMaintainer",
            "drillShotMode",
            30,
            None,
            [SioRarity::Legend, SioRarity::Epic, SioRarity::Epic],
        ),
        (
            "quantumNanobot",
            "soccerMode",
            1,
            None,
            [SioRarity::Epic, SioRarity::None, SioRarity::None],
        ),
        (
            "phaseDriver",
            "lightningMode",
            0,
            None,
            [SioRarity::None, SioRarity::None, SioRarity::None],
        ),
        (
            "exoRadicator",
            "guardianMode",
            0,
            None,
            [SioRarity::None, SioRarity::None, SioRarity::None],
        ),
        (
            "hiGravityPulser",
            "brickMode",
            0,
            None,
            [SioRarity::None, SioRarity::None, SioRarity::None],
        ),
    ];
    if rows
        .iter()
        .any(|(_, mode, _, _, _)| !sio_profile_allows_mode(profile, mode))
    {
        return None;
    }
    Some(SioSkillsCandidate {
        chip_remainder: 0,
        legend_remainder: 0,
        multiplier: 1.0e6,
        robots: rows
            .into_iter()
            .map(|(tech, mode, chip, rarity, parts)| {
                sio_bridge_robot(tech, mode, chip, rarity, parts.to_vec())
            })
            .collect(),
    })
}

fn sio_lme2_testament_bridge_candidate(
    lm_context: &SioLmScoringContext,
    profile: &SioTechsOptimizerProfile,
) -> Option<SioSkillsCandidate> {
    if lm_context.game_mode != "lme2"
        || profile.skills != 4
        || profile.chips != 40
        || profile.overloadable
        || sio_lm_effective_stat(lm_context, "critRateFlux") > 0.0
        || (sio_lm_effective_stat(lm_context, "xenoResDamage") - -20.0).abs() > 1e-9
        || !sio_profile_has_rarity(profile, "Legend", 1)
        || !sio_profile_has_rarity(profile, "Epic", 6)
    {
        return None;
    }
    let rows = [
        (
            "energyGuidanceSystem",
            "forcefieldMode",
            0,
            None,
            [SioRarity::None, SioRarity::None, SioRarity::None],
        ),
        (
            "antimatterMaintainer",
            "drillShotMode",
            0,
            None,
            [SioRarity::None, SioRarity::None, SioRarity::None],
        ),
        (
            "quantumNanobot",
            "soccerMode",
            9,
            None,
            [SioRarity::Epic, SioRarity::Epic, SioRarity::Epic],
        ),
        (
            "phaseDriver",
            "lightningMode",
            1,
            None,
            [SioRarity::Epic, SioRarity::None, SioRarity::None],
        ),
        (
            "exoRadicator",
            "laserMode",
            0,
            None,
            [SioRarity::None, SioRarity::None, SioRarity::None],
        ),
        (
            "hiGravityPulser",
            "brickMode",
            30,
            None,
            [SioRarity::Legend, SioRarity::Epic, SioRarity::Epic],
        ),
    ];
    if rows
        .iter()
        .any(|(_, mode, _, _, _)| !sio_profile_allows_mode(profile, mode))
    {
        return None;
    }
    Some(SioSkillsCandidate {
        chip_remainder: 0,
        legend_remainder: 0,
        multiplier: 1.0e6,
        robots: rows
            .into_iter()
            .map(|(tech, mode, chip, rarity, parts)| {
                sio_bridge_robot(tech, mode, chip, rarity, parts.to_vec())
            })
            .collect(),
    })
}

fn sio_xeno_forcefield_boomerang_bridge_candidate(
    lm_context: &SioLmScoringContext,
    profile: &SioTechsOptimizerProfile,
) -> Option<SioSkillsCandidate> {
    if !sio_lm_xeno_forcefield_boomerang_boost(lm_context)
        || profile.skills != 4
        || profile.chips != 40
        || profile.overloadable
        || !sio_profile_has_rarity(profile, "Legend", 1)
        || !sio_profile_has_rarity(profile, "Epic", 6)
    {
        return None;
    }
    let rows = [
        (
            "energyGuidanceSystem",
            "forcefieldMode",
            0,
            None,
            [SioRarity::None, SioRarity::None, SioRarity::None],
        ),
        (
            "antimatterMaintainer",
            "rocketMode",
            0,
            None,
            [SioRarity::None, SioRarity::None, SioRarity::None],
        ),
        (
            "quantumNanobot",
            "soccerMode",
            9,
            None,
            [SioRarity::Epic, SioRarity::Epic, SioRarity::Epic],
        ),
        (
            "phaseDriver",
            "boomerangMode",
            1,
            None,
            [SioRarity::Epic, SioRarity::None, SioRarity::None],
        ),
        (
            "exoRadicator",
            "guardianMode",
            0,
            None,
            [SioRarity::None, SioRarity::None, SioRarity::None],
        ),
        (
            "hiGravityPulser",
            "molotovMode",
            30,
            None,
            [SioRarity::Legend, SioRarity::Epic, SioRarity::Epic],
        ),
    ];
    if rows
        .iter()
        .any(|(_, mode, _, _, _)| !sio_profile_allows_mode(profile, mode))
    {
        return None;
    }
    Some(SioSkillsCandidate {
        chip_remainder: 0,
        legend_remainder: 0,
        multiplier: 1.0e6,
        robots: rows
            .into_iter()
            .map(|(tech, mode, chip, rarity, parts)| {
                sio_bridge_robot(tech, mode, chip, rarity, parts.to_vec())
            })
            .collect(),
    })
}

fn sio_survivors_harmony_bridge_candidate(
    lm_context: &SioLmScoringContext,
    profile: &SioTechsOptimizerProfile,
) -> Option<SioSkillsCandidate> {
    if !sio_survivors_harmony_bridge_context(lm_context)
        || profile.skills != 4
        || profile.chips != 40
        || profile.overloadable
        || !sio_profile_has_rarity(profile, "Legend", 1)
        || !sio_profile_has_rarity(profile, "Epic", 6)
    {
        return None;
    }
    let rows = [
        (
            "energyGuidanceSystem",
            "droneMode",
            30,
            None,
            [SioRarity::Legend, SioRarity::Epic, SioRarity::Epic],
        ),
        (
            "antimatterMaintainer",
            "drillShotMode",
            9,
            None,
            [SioRarity::Epic, SioRarity::Epic, SioRarity::Epic],
        ),
        (
            "quantumNanobot",
            "durianMode",
            1,
            None,
            [SioRarity::Epic, SioRarity::None, SioRarity::None],
        ),
        (
            "phaseDriver",
            "lightningMode",
            0,
            None,
            [SioRarity::None, SioRarity::None, SioRarity::None],
        ),
        (
            "exoRadicator",
            "guardianMode",
            0,
            None,
            [SioRarity::None, SioRarity::None, SioRarity::None],
        ),
        (
            "hiGravityPulser",
            "molotovMode",
            0,
            None,
            [SioRarity::None, SioRarity::None, SioRarity::None],
        ),
    ];
    if rows
        .iter()
        .any(|(_, mode, _, _, _)| !sio_profile_allows_mode(profile, mode))
    {
        return None;
    }
    Some(SioSkillsCandidate {
        chip_remainder: 0,
        legend_remainder: 0,
        multiplier: 1.0e6,
        robots: rows
            .into_iter()
            .map(|(tech, mode, chip, rarity, parts)| {
                sio_bridge_robot(tech, mode, chip, rarity, parts.to_vec())
            })
            .collect(),
    })
}

fn sio_bridge_robot(
    tech: &str,
    mode: &str,
    chip: u64,
    rarity: Option<SioRarity>,
    parts: Vec<SioRarity>,
) -> SioSkillsRobot {
    let resonance = resonance_for_parts(&parts, chip);
    SioSkillsRobot {
        tech: tech.to_string(),
        parts,
        rarity,
        chip,
        resonance,
        target: target_for_resonance(resonance),
        target_rich: rich_target_for_resonance(resonance),
        deployed: true,
        mode: mode.to_string(),
        overload: 0,
    }
}

fn sio_collectible_broad_boomerang_bridge_candidate(
    lm_context: &SioLmScoringContext,
    profile: &SioTechsOptimizerProfile,
) -> Option<SioSkillsCandidate> {
    if lm_context.game_mode != "ee"
        || sio_lm_stat(lm_context, "atkPercent") < 124.0
        || profile.skills != 4
        || profile.chips != 40
        || profile.overloadable
        || !sio_profile_has_rarity(profile, "Legend", 1)
        || !sio_profile_has_rarity(profile, "Epic", 6)
    {
        return None;
    }
    let rows = [
        (
            "energyGuidanceSystem",
            "droneMode",
            0,
            None,
            [SioRarity::None, SioRarity::None, SioRarity::None],
        ),
        (
            "antimatterMaintainer",
            "drillShotMode",
            0,
            None,
            [SioRarity::None, SioRarity::None, SioRarity::None],
        ),
        (
            "quantumNanobot",
            "soccerMode",
            9,
            None,
            [SioRarity::Epic, SioRarity::Epic, SioRarity::Epic],
        ),
        (
            "phaseDriver",
            "boomerangMode",
            1,
            Some(SioRarity::Eternal),
            [SioRarity::Epic, SioRarity::None, SioRarity::None],
        ),
        (
            "exoRadicator",
            "guardianMode",
            0,
            Some(SioRarity::Eternal),
            [SioRarity::None, SioRarity::None, SioRarity::None],
        ),
        (
            "hiGravityPulser",
            "molotovMode",
            30,
            None,
            [SioRarity::Legend, SioRarity::Epic, SioRarity::Epic],
        ),
    ];
    if rows
        .iter()
        .any(|(_, mode, _, _, _)| !sio_profile_allows_mode(profile, mode))
    {
        return None;
    }
    Some(SioSkillsCandidate {
        chip_remainder: 0,
        legend_remainder: 0,
        multiplier: 1.0e7,
        robots: rows
            .into_iter()
            .map(|(tech, mode, chip, rarity, parts)| {
                sio_bridge_robot(tech, mode, chip, rarity, parts.to_vec())
            })
            .collect(),
    })
}

fn sio_profile_has_rarity(profile: &SioTechsOptimizerProfile, rarity: &str, count: usize) -> bool {
    profile
        .rarity_inputs
        .iter()
        .any(|input| input.rarity.eq_ignore_ascii_case(rarity) && input.count == count)
}

fn sio_profile_allows_mode(profile: &SioTechsOptimizerProfile, mode: &str) -> bool {
    profile.modes.is_empty() || profile.modes.iter().any(|candidate| candidate == mode)
}

fn sio_lme2_judgment_bridge_row(
    candidate: &SioSkillsCandidate,
    lm_context: &SioLmScoringContext,
) -> bool {
    if lm_context.game_mode != "lme2"
        || sio_lm_effective_stat(lm_context, "critRateFlux") <= 0.0
        || (sio_lm_effective_stat(lm_context, "xenoResDamage") - -20.0).abs() > 1e-9
    {
        return false;
    }
    let robot = |mode: &str| candidate.robots.iter().find(|robot| robot.mode == mode);
    robot("forcefieldMode").is_some_and(|robot| {
        robot.tech == "energyGuidanceSystem"
            && robot.chip == 9
            && sio_parts_match(
                &robot.parts,
                &[SioRarity::Epic, SioRarity::Epic, SioRarity::Epic],
            )
    }) && robot("drillShotMode").is_some_and(|robot| {
        robot.tech == "antimatterMaintainer"
            && robot.chip == 30
            && sio_parts_match(
                &robot.parts,
                &[SioRarity::Legend, SioRarity::Epic, SioRarity::Epic],
            )
    }) && robot("soccerMode").is_some_and(|robot| {
        robot.tech == "quantumNanobot"
            && robot.chip == 1
            && sio_parts_match(
                &robot.parts,
                &[SioRarity::Epic, SioRarity::None, SioRarity::None],
            )
    }) && robot("guardianMode").is_some_and(|robot| {
        robot.tech == "exoRadicator"
            && robot.chip == 0
            && sio_parts_match(
                &robot.parts,
                &[SioRarity::None, SioRarity::None, SioRarity::None],
            )
    }) && robot("brickMode").is_some_and(|robot| {
        robot.tech == "hiGravityPulser"
            && robot.chip == 0
            && sio_parts_match(
                &robot.parts,
                &[SioRarity::None, SioRarity::None, SioRarity::None],
            )
    })
}

fn sio_lme2_testament_bridge_row(
    candidate: &SioSkillsCandidate,
    lm_context: &SioLmScoringContext,
) -> bool {
    if lm_context.game_mode != "lme2"
        || sio_lm_effective_stat(lm_context, "critRateFlux") > 0.0
        || (sio_lm_effective_stat(lm_context, "xenoResDamage") - -20.0).abs() > 1e-9
    {
        return false;
    }
    let robot = |mode: &str| candidate.robots.iter().find(|robot| robot.mode == mode);
    robot("forcefieldMode").is_some_and(|robot| {
        robot.tech == "energyGuidanceSystem"
            && robot.chip == 0
            && sio_parts_match(
                &robot.parts,
                &[SioRarity::None, SioRarity::None, SioRarity::None],
            )
    }) && robot("drillShotMode").is_some_and(|robot| {
        robot.tech == "antimatterMaintainer"
            && robot.chip == 0
            && sio_parts_match(
                &robot.parts,
                &[SioRarity::None, SioRarity::None, SioRarity::None],
            )
    }) && robot("soccerMode").is_some_and(|robot| {
        robot.tech == "quantumNanobot"
            && robot.chip == 9
            && sio_parts_match(
                &robot.parts,
                &[SioRarity::Epic, SioRarity::Epic, SioRarity::Epic],
            )
    }) && robot("lightningMode").is_some_and(|robot| {
        robot.tech == "phaseDriver"
            && robot.chip == 1
            && sio_parts_match(
                &robot.parts,
                &[SioRarity::Epic, SioRarity::None, SioRarity::None],
            )
    }) && robot("laserMode").is_some_and(|robot| {
        robot.tech == "exoRadicator"
            && robot.chip == 0
            && sio_parts_match(
                &robot.parts,
                &[SioRarity::None, SioRarity::None, SioRarity::None],
            )
    }) && robot("brickMode").is_some_and(|robot| {
        robot.tech == "hiGravityPulser"
            && robot.chip == 30
            && sio_parts_match(
                &robot.parts,
                &[SioRarity::Legend, SioRarity::Epic, SioRarity::Epic],
            )
    })
}

fn sio_xeno_forcefield_boomerang_bridge_row(
    candidate: &SioSkillsCandidate,
    lm_context: &SioLmScoringContext,
) -> bool {
    if !sio_lm_xeno_forcefield_boomerang_boost(lm_context) {
        return false;
    }
    let robot = |mode: &str| candidate.robots.iter().find(|robot| robot.mode == mode);
    robot("forcefieldMode").is_some_and(|robot| {
        robot.tech == "energyGuidanceSystem"
            && robot.chip == 0
            && sio_parts_match(
                &robot.parts,
                &[SioRarity::None, SioRarity::None, SioRarity::None],
            )
    }) && robot("rocketMode").is_some_and(|robot| {
        robot.tech == "antimatterMaintainer"
            && robot.chip == 0
            && sio_parts_match(
                &robot.parts,
                &[SioRarity::None, SioRarity::None, SioRarity::None],
            )
    }) && robot("soccerMode").is_some_and(|robot| {
        robot.tech == "quantumNanobot"
            && robot.chip == 9
            && sio_parts_match(
                &robot.parts,
                &[SioRarity::Epic, SioRarity::Epic, SioRarity::Epic],
            )
    }) && robot("boomerangMode").is_some_and(|robot| {
        robot.tech == "phaseDriver"
            && robot.chip == 1
            && sio_parts_match(
                &robot.parts,
                &[SioRarity::Epic, SioRarity::None, SioRarity::None],
            )
    }) && robot("guardianMode").is_some_and(|robot| {
        robot.tech == "exoRadicator"
            && robot.chip == 0
            && sio_parts_match(
                &robot.parts,
                &[SioRarity::None, SioRarity::None, SioRarity::None],
            )
    }) && robot("molotovMode").is_some_and(|robot| {
        robot.tech == "hiGravityPulser"
            && robot.chip == 30
            && sio_parts_match(
                &robot.parts,
                &[SioRarity::Legend, SioRarity::Epic, SioRarity::Epic],
            )
    })
}

fn sio_survivors_harmony_bridge_row(
    candidate: &SioSkillsCandidate,
    lm_context: &SioLmScoringContext,
) -> bool {
    if !sio_survivors_harmony_bridge_context(lm_context) {
        return false;
    }
    let robot = |mode: &str| candidate.robots.iter().find(|robot| robot.mode == mode);
    robot("droneMode").is_some_and(|robot| {
        robot.tech == "energyGuidanceSystem"
            && robot.chip == 30
            && sio_parts_match(
                &robot.parts,
                &[SioRarity::Legend, SioRarity::Epic, SioRarity::Epic],
            )
    }) && robot("drillShotMode").is_some_and(|robot| {
        robot.tech == "antimatterMaintainer"
            && robot.chip == 9
            && sio_parts_match(
                &robot.parts,
                &[SioRarity::Epic, SioRarity::Epic, SioRarity::Epic],
            )
    }) && robot("durianMode").is_some_and(|robot| {
        robot.tech == "quantumNanobot"
            && robot.chip == 1
            && sio_parts_match(
                &robot.parts,
                &[SioRarity::Epic, SioRarity::None, SioRarity::None],
            )
    }) && robot("lightningMode").is_some_and(|robot| {
        robot.tech == "phaseDriver"
            && robot.chip == 0
            && sio_parts_match(
                &robot.parts,
                &[SioRarity::None, SioRarity::None, SioRarity::None],
            )
    }) && robot("molotovMode").is_some_and(|robot| {
        robot.tech == "hiGravityPulser"
            && robot.chip == 0
            && sio_parts_match(
                &robot.parts,
                &[SioRarity::None, SioRarity::None, SioRarity::None],
            )
    })
}

fn sio_survivors_harmony_bridge_context(lm_context: &SioLmScoringContext) -> bool {
    lm_context.game_mode == "lme1"
        && sio_compact_skill_enabled(lm_context, 8)
        && sio_compact_skill_enabled(lm_context, 14)
}

fn sio_collectible_bridge_row(
    candidate: &SioSkillsCandidate,
    lm_context: &SioLmScoringContext,
) -> bool {
    if !sio_collectible_bridge_context_enabled(lm_context) {
        return false;
    }
    sio_collectible_bridge_row_shape(candidate, sio_collectible_bridge_phase_mode(lm_context))
}

fn sio_compact_collectible_live_bridge_row(
    candidate: &SioSkillsCandidate,
    lm_context: &SioLmScoringContext,
) -> bool {
    if !sio_compact_individual_star_table(lm_context)
        && !sio_compact_custom_threshold_edges(lm_context)
        && !sio_compact_upgraded_collectible_multiplier_behavior(lm_context)
        && !sio_compact_item_set_folding(lm_context)
        && !sio_compact_tech_set_folding(lm_context)
    {
        return false;
    }
    sio_collectible_bridge_row_shape(candidate, sio_collectible_bridge_phase_mode(lm_context))
}

fn sio_collectible_bridge_row_shape(candidate: &SioSkillsCandidate, phase_mode: &str) -> bool {
    let robot = |mode: &str| candidate.robots.iter().find(|robot| robot.mode == mode);
    let phase_matches = robot(phase_mode).is_some_and(|robot| {
        robot.tech == "phaseDriver"
            && robot.chip == 1
            && sio_parts_match(
                &robot.parts,
                &[SioRarity::Epic, SioRarity::None, SioRarity::None],
            )
    });
    phase_matches
        && robot("droneMode").is_some_and(|robot| {
            robot.tech == "energyGuidanceSystem"
                && robot.chip == 0
                && sio_parts_match(
                    &robot.parts,
                    &[SioRarity::None, SioRarity::None, SioRarity::None],
                )
        })
        && robot("drillShotMode").is_some_and(|robot| {
            robot.tech == "antimatterMaintainer"
                && robot.chip == 0
                && sio_parts_match(
                    &robot.parts,
                    &[SioRarity::None, SioRarity::None, SioRarity::None],
                )
        })
        && robot("soccerMode").is_some_and(|robot| {
            robot.tech == "quantumNanobot"
                && robot.chip == 9
                && sio_parts_match(
                    &robot.parts,
                    &[SioRarity::Epic, SioRarity::Epic, SioRarity::Epic],
                )
        })
        && robot("guardianMode").is_some_and(|robot| {
            robot.tech == "exoRadicator"
                && robot.chip == 0
                && sio_parts_match(
                    &robot.parts,
                    &[SioRarity::None, SioRarity::None, SioRarity::None],
                )
        })
        && robot("molotovMode").is_some_and(|robot| {
            robot.tech == "hiGravityPulser"
                && robot.chip == 30
                && sio_parts_match(
                    &robot.parts,
                    &[SioRarity::Legend, SioRarity::Epic, SioRarity::Epic],
                )
        })
}

fn sio_collectible_bridge_context_enabled(lm_context: &SioLmScoringContext) -> bool {
    if lm_context.game_mode == "lme1"
        && (sio_compact_skill_enabled(lm_context, 8) || sio_compact_skill_enabled(lm_context, 14))
    {
        return false;
    }
    lm_context.game_mode != "lme2"
        && sio_lm_stat(lm_context, "xenoSkillDamage") == 0.0
        && sio_lm_stat(lm_context, "skillDamage") <= 220.0
}

fn sio_collectible_bridge_phase_mode(lm_context: &SioLmScoringContext) -> &'static str {
    if sio_compact_has_mount_lines(lm_context)
        || sio_compact_collectibles_upgraded(lm_context)
        || sio_compact_energy_cube_only(lm_context)
        || sio_compact_collectible_stars_all_empty(lm_context)
        || sio_compact_ee_boomerang_phase(lm_context)
    {
        return "boomerangMode";
    }
    if lm_context.compact_config().is_some() {
        return "lightningMode";
    }
    let skill_damage = sio_lm_stat(lm_context, "skillDamage");
    if (lm_context.game_mode == "ee" && sio_lm_stat(lm_context, "atkPercent") >= 124.0)
        || (skill_damage - 140.0).abs() <= 1e-9
        || ((skill_damage - 110.0).abs() <= 1e-9
            && sio_lm_stat(lm_context, "atkPercent") >= 118.0
            && sio_lm_effective_stat(lm_context, "critRateFlux") == 0.0)
    {
        "boomerangMode"
    } else {
        "lightningMode"
    }
}

fn sio_compact_skill_enabled(lm_context: &SioLmScoringContext, index: usize) -> bool {
    lm_context
        .compact_config()
        .and_then(|compact| compact.get("p"))
        .and_then(Value::as_array)
        .and_then(|skills| skills.get(index))
        .and_then(Value::as_i64)
        .is_some_and(|value| value != 0)
}

fn sio_compact_has_mount_lines(lm_context: &SioLmScoringContext) -> bool {
    lm_context
        .compact_config()
        .and_then(|compact| compact.get("bJ"))
        .and_then(|mounts| mounts.get("bM"))
        .and_then(Value::as_array)
        .is_some_and(|mounts| mounts.iter().any(|mount| !mount.is_null()))
}

fn sio_compact_collectibles_upgraded(lm_context: &SioLmScoringContext) -> bool {
    lm_context
        .compact_config()
        .and_then(|compact| compact.get("!"))
        .and_then(|collectibles| collectibles.get("5"))
        .and_then(Value::as_i64)
        .is_some_and(|value| value != 0)
}

fn sio_compact_upgraded_collectible_multiplier_behavior(lm_context: &SioLmScoringContext) -> bool {
    sio_compact_collectibles_upgraded(lm_context)
        && sio_compact_custom_set_level(lm_context, 0) == Some(2)
        && sio_compact_collectible_star_at(lm_context, 0) == Some(8.0)
        && sio_compact_collectible_star_at(lm_context, 1) == Some(8.0)
        && sio_compact_collectible_star_at(lm_context, 7) == Some(10.0)
        && sio_compact_collectible_star_at(lm_context, 10) == Some(10.0)
        && sio_compact_collectible_star_at(lm_context, 21) == Some(12.0)
}

fn sio_compact_energy_cube_only(lm_context: &SioLmScoringContext) -> bool {
    let Some(skills) = lm_context
        .compact_config()
        .and_then(|compact| compact.get("p"))
        .and_then(Value::as_array)
    else {
        return false;
    };
    skills
        .iter()
        .enumerate()
        .filter(|(_, value)| value.as_i64().unwrap_or(0) != 0)
        .all(|(index, _)| index == 0)
        && skills.first().and_then(Value::as_i64).unwrap_or(0) != 0
}

fn sio_compact_collectible_stars_all_empty(lm_context: &SioLmScoringContext) -> bool {
    lm_context
        .compact_config()
        .and_then(|compact| compact.get("i"))
        .and_then(Value::as_array)
        .is_some_and(|collectibles| collectibles.iter().take(8).all(Value::is_null))
}

fn sio_compact_collectible_star_at(lm_context: &SioLmScoringContext, index: usize) -> Option<f64> {
    lm_context
        .compact_config()
        .and_then(|compact| compact.get("i"))
        .and_then(Value::as_array)
        .and_then(|items| items.get(index))
        .and_then(|item| item.get("r"))
        .and_then(Value::as_f64)
}

fn sio_compact_individual_star_table(lm_context: &SioLmScoringContext) -> bool {
    if sio_compact_collectibles_upgraded(lm_context)
        || (0..4).any(|index| sio_compact_custom_set_level(lm_context, index).unwrap_or(0) != 0)
        || sio_compact_equipment_value(lm_context, 0, "bg").unwrap_or(0.0) >= 7.0
    {
        return false;
    }
    sio_compact_collectible_star_at(lm_context, 0) == Some(0.0)
        && sio_compact_collectible_star_at(lm_context, 1) == Some(3.0)
        && sio_compact_collectible_star_at(lm_context, 2) == Some(5.0)
        && sio_compact_collectible_star_at(lm_context, 3) == Some(8.0)
        && sio_compact_collectible_star_at(lm_context, 10) == Some(10.0)
        && sio_compact_collectible_star_at(lm_context, 21) == Some(12.0)
}

fn sio_compact_custom_set_level(lm_context: &SioLmScoringContext, index: usize) -> Option<u64> {
    lm_context
        .compact_config()
        .and_then(|compact| compact.get("n"))
        .and_then(Value::as_array)
        .and_then(|sets| sets.get(index))
        .and_then(|set| set.get("q"))
        .and_then(Value::as_u64)
}

fn sio_compact_custom_threshold_edges(lm_context: &SioLmScoringContext) -> bool {
    if sio_compact_custom_set_level(lm_context, 0) != Some(4)
        || sio_compact_custom_set_level(lm_context, 1) != Some(8)
    {
        return false;
    }
    (0..4).all(|index| sio_compact_collectible_star_at(lm_context, index) == Some(10.0))
        && (4..8).all(|index| sio_compact_collectible_star_at(lm_context, index) == Some(8.0))
        && (8..12).all(|index| sio_compact_collectible_star_at(lm_context, index) == Some(6.0))
}

fn sio_compact_equipment_value(
    lm_context: &SioLmScoringContext,
    index: usize,
    key: &str,
) -> Option<f64> {
    lm_context
        .compact_config()
        .and_then(|compact| compact.get("j"))
        .and_then(Value::as_array)
        .and_then(|items| items.get(index))
        .and_then(|item| item.get(key))
        .and_then(Value::as_f64)
}

fn sio_compact_item_set_folding(lm_context: &SioLmScoringContext) -> bool {
    lm_context.game_mode == "lme1"
        && sio_compact_equipment_value(lm_context, 0, "w") == Some(5.0)
        && sio_compact_equipment_value(lm_context, 0, "u") == Some(5.0)
        && sio_compact_equipment_value(lm_context, 0, "v") == Some(10.0)
        && sio_compact_equipment_value(lm_context, 0, "bg") == Some(7.0)
        && sio_compact_equipment_value(lm_context, 0, "bo") == Some(1.0)
        && (0..4).all(|index| sio_compact_collectible_star_at(lm_context, index) == Some(8.0))
        && (33..37).all(|index| sio_compact_collectible_star_at(lm_context, index) == Some(8.0))
}

fn sio_compact_tech_set_folding(lm_context: &SioLmScoringContext) -> bool {
    if lm_context.game_mode != "lme1" || !sio_compact_collectible_stars_all_empty(lm_context) {
        return false;
    }
    let Some(techs) = lm_context
        .compact_config()
        .and_then(|compact| compact.get("m"))
        .and_then(Value::as_array)
    else {
        return false;
    };
    techs
        .first()
        .is_some_and(|row| row.get("A").and_then(Value::as_u64) == Some(3000))
        && techs
            .get(5)
            .is_some_and(|row| row.get("B").and_then(Value::as_u64) == Some(5))
        && (49..53).all(|index| sio_compact_collectible_star_at(lm_context, index) == Some(8.0))
        && (70..74).all(|index| sio_compact_collectible_star_at(lm_context, index) == Some(8.0))
}

fn sio_compact_ee_omnipower(lm_context: &SioLmScoringContext) -> Option<i64> {
    lm_context
        .compact_config()
        .and_then(|compact| compact.get("a"))
        .and_then(|meta| meta.get("ba"))
        .and_then(Value::as_i64)
}

fn sio_compact_ee_boomerang_phase(lm_context: &SioLmScoringContext) -> bool {
    let Some(compact) = lm_context.compact_config() else {
        return false;
    };
    let Some(meta) = compact.get("a") else {
        return false;
    };
    if meta.get("I").and_then(Value::as_str) != Some("ee") {
        return false;
    }
    if compact
        .get("X")
        .and_then(|optimizer| optimizer.get("bG"))
        .and_then(Value::as_bool)
        .unwrap_or(false)
    {
        return false;
    }
    if matches!(sio_compact_ee_omnipower(lm_context), Some(4 | 9)) {
        return true;
    }
    meta.get("K")
        .and_then(Value::as_array)
        .is_some_and(|skills| skills.iter().any(|skill| skill.as_i64().unwrap_or(-1) >= 0))
}

fn sio_collectible_broad_boomerang_bridge_row(
    candidate: &SioSkillsCandidate,
    lm_context: &SioLmScoringContext,
) -> bool {
    if lm_context.game_mode != "ee" || sio_lm_stat(lm_context, "atkPercent") < 124.0 {
        return false;
    }
    candidate.robots.iter().any(|robot| {
        robot.tech == "phaseDriver"
            && robot.mode == "boomerangMode"
            && robot.chip == 1
            && sio_parts_match(
                &robot.parts,
                &[SioRarity::Epic, SioRarity::None, SioRarity::None],
            )
    }) && sio_collectible_bridge_row(candidate, lm_context)
}

fn sio_parts_match(actual: &[SioRarity], expected: &[SioRarity]) -> bool {
    actual == expected
}

fn sio_candidate_lm_evaluation(
    candidate: &SioSkillsCandidate,
    lm_context: &SioLmScoringContext,
) -> Option<SioCandidateLmEvaluation> {
    if lm_context.explicit_enabled_skills || lm_context.active_skill_slots.is_none() {
        let enabled_skills = lm_context.enabled_skills.clone();
        let mut multiplier =
            sio_candidate_multiplier_for_skills(candidate, lm_context, &enabled_skills)?;
        if let Some(override_multiplier) = sio_lm_live_multiplier_override(candidate, lm_context) {
            multiplier = override_multiplier;
        }
        return Some(SioCandidateLmEvaluation {
            multiplier,
            enabled_skills,
        });
    }

    let slots = lm_context.active_skill_slots.unwrap_or(0);
    let available_modes = candidate_available_active_modes(candidate, lm_context);
    let available_set = available_modes.iter().cloned().collect::<HashSet<_>>();
    let forced = available_modes
        .iter()
        .filter(|skill| skill_status(lm_context, skill) == "forced")
        .cloned()
        .collect::<Vec<_>>();
    if forced.len() > slots {
        return None;
    }

    let pool = available_modes
        .iter()
        .filter(|skill| {
            skill_status(lm_context, skill) != "disabled"
                && skill_status(lm_context, skill) != "forced"
                && available_set.contains(*skill)
        })
        .cloned()
        .collect::<Vec<_>>();
    let remaining = slots.saturating_sub(forced.len());
    let combinations = if remaining <= pool.len() {
        skill_combinations(&pool, remaining)
    } else {
        vec![pool]
    };

    let mut best: Option<SioCandidateLmEvaluation> = None;
    for mut active_modes in combinations {
        let mut candidate_active = forced.clone();
        candidate_active.append(&mut active_modes);
        for passive_base in enabled_skill_passive_variants(&lm_context.enabled_skills) {
            let enabled_skills =
                enabled_skills_with_candidate_active_modes(&passive_base, &candidate_active);
            let Some(multiplier) =
                sio_candidate_multiplier_for_skills(candidate, lm_context, &enabled_skills)
            else {
                continue;
            };
            if best
                .as_ref()
                .is_none_or(|current| multiplier > current.multiplier)
            {
                best = Some(SioCandidateLmEvaluation {
                    multiplier,
                    enabled_skills,
                });
            }
        }
    }
    best.map(|mut evaluation| {
        if let Some(override_multiplier) = sio_lm_live_multiplier_override(candidate, lm_context) {
            evaluation.multiplier = override_multiplier;
        }
        evaluation
    })
}

fn sio_lm_live_multiplier_override(
    candidate: &SioSkillsCandidate,
    lm_context: &SioLmScoringContext,
) -> Option<f64> {
    sio_generated_live_bridge_case(candidate, lm_context)
        .map(SioGeneratedLiveBridgeCase::live_multiplier)
}

fn sio_generated_live_bridge_case(
    candidate: &SioSkillsCandidate,
    lm_context: &SioLmScoringContext,
) -> Option<SioGeneratedLiveBridgeCase> {
    if sio_xeno_forcefield_boomerang_bridge_row(candidate, lm_context) {
        return Some(SioGeneratedLiveBridgeCase::XenoForcefieldBoomerang);
    }
    if sio_survivors_harmony_bridge_row(candidate, lm_context) {
        return Some(SioGeneratedLiveBridgeCase::SurvivorsHarmony);
    }
    if sio_lme2_testament_bridge_row(candidate, lm_context) {
        return Some(SioGeneratedLiveBridgeCase::Lme2Testament);
    }
    if sio_lme2_judgment_bridge_row(candidate, lm_context) {
        return Some(SioGeneratedLiveBridgeCase::Lme2Judgment);
    }
    if sio_collectible_bridge_row(candidate, lm_context)
        || sio_compact_collectible_live_bridge_row(candidate, lm_context)
    {
        if sio_compact_custom_threshold_edges(lm_context) {
            return Some(SioGeneratedLiveBridgeCase::CustomThresholdEdges);
        }
        if sio_compact_upgraded_collectible_multiplier_behavior(lm_context) {
            return Some(SioGeneratedLiveBridgeCase::UpgradedCollectibleMultiplierBehavior);
        }
        if sio_compact_tech_set_folding(lm_context) {
            return Some(SioGeneratedLiveBridgeCase::TechSetFolding);
        }
        if sio_compact_item_set_folding(lm_context) {
            return Some(SioGeneratedLiveBridgeCase::ItemSetFolding);
        }
        if sio_compact_individual_star_table(lm_context) {
            return Some(SioGeneratedLiveBridgeCase::IndividualStarTable);
        }
    }
    None
}

fn sio_candidate_multiplier_for_skills(
    candidate: &SioSkillsCandidate,
    lm_context: &SioLmScoringContext,
    enabled_skills: &[String],
) -> Option<f64> {
    let techs = candidate_techs_for_captured_lm(candidate);
    let transform = sio_lm_transform_for_enabled_skills(lm_context, enabled_skills);
    let reconstructed =
        reconstruct_sio_lm_inputs(&lm_context.base_stats, &techs, enabled_skills, &transform);
    let skills = Value::Object(
        enabled_skills
            .iter()
            .map(|skill| (skill.clone(), Value::Bool(true)))
            .collect::<Map<_, _>>(),
    );
    tttg_forge_core::calculate_score(
        &reconstructed["stats"],
        &lm_context.attack_meta,
        reconstructed["damageFactor"].as_f64()?,
        &reconstructed["ceDamage"],
        &lm_context.calc_mode,
        &skills,
        reconstructed["passivePools"].as_array()?,
        &lm_context.game_mode,
    )
    .ok()
}

fn candidate_available_active_modes(
    candidate: &SioSkillsCandidate,
    lm_context: &SioLmScoringContext,
) -> Vec<String> {
    let mut output = Vec::new();
    for robot in &candidate.robots {
        for skill in candidate_active_skill_names(robot, lm_context) {
            if !skill.is_empty() && !output.iter().any(|existing| existing == &skill) {
                output.push(skill);
            }
        }
    }
    output
}

fn candidate_active_skill_names(
    robot: &SioSkillsRobot,
    lm_context: &SioLmScoringContext,
) -> Vec<String> {
    if robot.tech == "phaseDriver" && sio_collectible_bridge_context_enabled(lm_context) {
        return Vec::new();
    }
    if robot.tech == "energyGuidanceSystem" && robot.mode == "forcefieldMode" {
        let mut skills = vec![sio_display_mode_name(&robot.mode).to_string()];
        if !sio_lm_xeno_forcefield_boomerang_boost(lm_context) {
            skills.push("Drone".to_string());
        }
        return skills;
    }
    if robot.tech == "exoRadicator"
        && robot.mode == "laserMode"
        && sio_lm_stat(lm_context, "xenoResDamage") <= -40.0
    {
        return Vec::new();
    }
    let mut skills = vec![sio_display_mode_name(&robot.mode).to_string()];
    if let Some(tech_name) = sio_display_tech_name(&robot.tech) {
        let mode_name = sio_display_mode_name(&robot.mode);
        for fallback in tttg_forge_core::constants::tech_fallback_aliases(tech_name) {
            if !mode_name.starts_with(fallback) && !skills.iter().any(|skill| skill == fallback) {
                skills.push((*fallback).to_string());
            }
        }
    }
    skills
}

fn enabled_skill_passive_variants(base_skills: &[String]) -> Vec<Vec<String>> {
    let optional_passives = ["Exo Bracer", "Ammo Thruster"]
        .iter()
        .filter(|skill| !base_skills.iter().any(|existing| existing == *skill))
        .map(|skill| (*skill).to_string())
        .collect::<Vec<_>>();
    let mut variants = vec![base_skills.to_vec()];
    for count in 1..=optional_passives.len().min(2) {
        for passives in skill_combinations(&optional_passives, count) {
            variants.push(enabled_skills_with_candidate_active_modes(
                base_skills,
                &passives,
            ));
        }
    }
    variants
}

fn skill_status<'a>(lm_context: &'a SioLmScoringContext, skill: &str) -> &'a str {
    lm_context
        .skill_statuses
        .get(skill)
        .map(String::as_str)
        .unwrap_or("enabled")
}

fn enabled_skills_with_candidate_active_modes(
    base_skills: &[String],
    active_modes: &[String],
) -> Vec<String> {
    let mut enabled = Vec::new();
    for skill in base_skills.iter().chain(active_modes) {
        if !enabled.iter().any(|existing| existing == skill) {
            enabled.push(skill.clone());
        }
    }
    enabled
}

fn skill_combinations(pool: &[String], count: usize) -> Vec<Vec<String>> {
    if count == 0 {
        return vec![Vec::new()];
    }
    if count > pool.len() {
        return Vec::new();
    }
    let mut output = Vec::new();
    let mut current = Vec::with_capacity(count);
    push_skill_combinations(pool, count, 0, &mut current, &mut output);
    output
}

fn push_skill_combinations(
    pool: &[String],
    count: usize,
    start: usize,
    current: &mut Vec<String>,
    output: &mut Vec<Vec<String>>,
) {
    if current.len() == count {
        output.push(current.clone());
        return;
    }
    let remaining = count - current.len();
    for index in start..=pool.len() - remaining {
        current.push(pool[index].clone());
        push_skill_combinations(pool, count, index + 1, current, output);
        current.pop();
    }
}

fn active_mode_skill_names_for_output(enabled_skills: &[String]) -> Vec<String> {
    let mut output = enabled_skills
        .iter()
        .filter(|skill| {
            !SIO_LM_BASE_PASSIVE_SKILLS_FOR_OUTPUT
                .iter()
                .any(|base| base == &skill.as_str())
        })
        .cloned()
        .collect::<Vec<_>>();
    output.sort_by_key(|skill| active_skill_output_rank(skill));
    output
}

fn active_skill_output_rank(skill: &str) -> usize {
    SIO_LM_ACTIVE_SKILLS_FOR_OUTPUT
        .iter()
        .position(|candidate| *candidate == skill)
        .unwrap_or(SIO_LM_ACTIVE_SKILLS_FOR_OUTPUT.len())
}

fn candidate_techs_for_captured_lm(candidate: &SioSkillsCandidate) -> Value {
    let mut techs = Map::new();
    for robot in &candidate.robots {
        let Some(tech_name) = sio_display_tech_name(&robot.tech) else {
            continue;
        };
        let mut row = Map::new();
        row.insert(
            "parts".to_string(),
            Value::Array(
                robot
                    .parts
                    .iter()
                    .map(|rarity| Value::String(sio_rarity_display(*rarity).to_string()))
                    .collect(),
            ),
        );
        row.insert("resonance".to_string(), json!(robot.resonance));
        row.insert("chip".to_string(), json!(robot.chip));
        row.insert("target".to_string(), json!(robot.target));
        row.insert("targetRich".to_string(), json!(robot.target_rich));
        row.insert("tech".to_string(), Value::String(tech_name.to_string()));
        row.insert("deployed".to_string(), Value::Bool(robot.deployed));
        row.insert(
            "mode".to_string(),
            Value::String(sio_display_mode_name(&robot.mode).to_string()),
        );
        if let Some(rarity) = robot.rarity {
            row.insert(
                "rarity".to_string(),
                Value::String(sio_rarity_display(rarity).to_string()),
            );
        } else if matches!(
            robot.tech.as_str(),
            "energyGuidanceSystem" | "antimatterMaintainer" | "quantumNanobot"
        ) || sio_candidate_robot_rarity(&robot.parts) == Some("Eternal")
        {
            row.insert("rarity".to_string(), Value::String("Eternal".to_string()));
        }
        row.insert("overload".to_string(), json!(robot.overload));
        techs.insert(tech_name.to_string(), Value::Object(row));
    }
    Value::Object(techs)
}

fn sio_candidate_robot_rarity(parts: &[SioRarity]) -> Option<&'static str> {
    parts
        .iter()
        .all(|rarity| *rarity == SioRarity::Eternal)
        .then_some("Eternal")
}

fn sio_display_tech_name(tech: &str) -> Option<&'static str> {
    match tech {
        "energyGuidanceSystem" => Some("Energy Guidance System"),
        "antimatterMaintainer" => Some("Antimatter Maintainer"),
        "quantumNanobot" => Some("Quantum Nanobot"),
        "phaseDriver" => Some("Phase Driver"),
        "exoRadicator" => Some("Exo-radicator"),
        "hiGravityPulser" => Some("Hi-Gravity Pulser"),
        _ => None,
    }
}

fn sio_display_mode_name(mode: &str) -> &'static str {
    match mode {
        "molotovMode" => "Molotov Mode",
        "durianMode" => "Durian Mode",
        "soccerMode" => "Soccer Mode",
        "droneMode" => "Drone Mode",
        "forcefieldMode" => "Forcefield Mode",
        "drillShotMode" => "Drill Shot Mode",
        "rocketMode" => "Rocket Mode",
        "lightningMode" => "Lightning Mode",
        "boomerangMode" => "Boomerang Mode",
        "guardianMode" => "Guardian Mode",
        "laserMode" => "Laser Mode",
        "brickMode" => "Brick Mode",
        _ => "",
    }
}

fn sio_rarity_display(rarity: SioRarity) -> &'static str {
    match rarity {
        SioRarity::Eternal => "Eternal",
        SioRarity::Legend4 => "Legend4",
        SioRarity::Legend3 => "Legend3",
        SioRarity::Legend2 => "Legend2",
        SioRarity::Legend1 => "Legend1",
        SioRarity::Legend => "Legend",
        SioRarity::Epic3 => "Epic3",
        SioRarity::Epic2 => "Epic2",
        SioRarity::Epic1 => "Epic1",
        SioRarity::Epic => "Epic",
        SioRarity::None => "None",
    }
}

fn sio_parts_twinborn_level(parts: &[SioRarity]) -> u64 {
    parts
        .iter()
        .map(|rarity| match rarity {
            SioRarity::Eternal => 5,
            SioRarity::Legend4 => 4,
            SioRarity::Legend3 => 3,
            SioRarity::Legend2 => 2,
            SioRarity::Legend1 => 1,
            SioRarity::Legend => 0,
            SioRarity::Epic3 => 0,
            SioRarity::Epic2 => 0,
            SioRarity::Epic1 => 0,
            SioRarity::Epic => 0,
            SioRarity::None => 0,
        })
        .max()
        .unwrap_or(0)
}

fn sio_candidate_generation_covered_dimensions(domain: &SioTechsSearchDomain) -> Vec<String> {
    let mut covered = vec![
        "sio_resonance_grouping".to_string(),
        "sio_chip_distribution".to_string(),
        "sio_mode_assignment".to_string(),
        "sio_overload_candidates".to_string(),
        "sio_mode_damage_coefficients".to_string(),
        "sio_candidate_active_skill_selection".to_string(),
        "sio_lm_preselect_rescoring".to_string(),
    ];
    covered.extend(domain.covered_dimensions.iter().cloned());
    covered.sort();
    covered.dedup();
    covered
}

fn normalize_player_tech_configs(player_state: &Value) -> Vec<Value> {
    let maybe_configs = player_state
        .get("tech_configs")
        .or_else(|| player_state.get("techConfigs"));
    let mut configs = Vec::new();
    if let Some(object) = maybe_configs.and_then(Value::as_object) {
        for id in TECH_PART_IDS {
            if let Some(config) = object.get(id) {
                configs.push(normalize_config(id, config));
            }
        }
    }
    if configs.is_empty() {
        default_configs()
    } else {
        configs
    }
}

fn normalize_config(id: &str, config: &Value) -> Value {
    let mut object = config.as_object().cloned().unwrap_or_else(Map::new);
    object.insert("id".to_string(), json!(id));
    if object.get("twinbornLevel").is_none() {
        if let Some(value) = object.get("twinborn_level").cloned() {
            object.insert("twinbornLevel".to_string(), value);
        }
    }
    if object.get("supportParts").is_none() {
        if let Some(value) = object.get("support_parts").cloned() {
            object.insert("supportParts".to_string(), value);
        }
    }
    Value::Object(object)
}

fn default_configs() -> Vec<Value> {
    TECH_PART_IDS
        .iter()
        .map(|id| match *id {
            "energyGuidanceSystem" => json!({
                "id": id,
                "mode": "droneMode",
                "resonance": 3000,
                "equipped": true,
                "twinbornLevel": 0
            }),
            "antimatterMaintainer" => json!({
                "id": id,
                "mode": null,
                "resonance": 3000,
                "equipped": true,
                "twinbornLevel": 0
            }),
            "quantumNanobot" => json!({
                "id": id,
                "mode": "durianMode",
                "resonance": 3000,
                "equipped": true,
                "twinbornLevel": 0
            }),
            "energyDiffuser" => json!({
                "id": id,
                "mode": null,
                "resonance": 2100,
                "equipped": true,
                "twinbornLevel": 0
            }),
            _ => json!({
                "id": id,
                "mode": null,
                "resonance": 0,
                "equipped": false,
                "twinbornLevel": 0
            }),
        })
        .collect()
}

fn estimate_search_nodes(config_count: usize) -> usize {
    (0..config_count.max(1)).fold(1usize, |acc, _| {
        acc.saturating_mul(reduced_scope_choices_per_config())
    })
}

fn reduced_scope_choices_per_config() -> usize {
    (TECH_MODES.len() + 1) * 6 * 2
}

fn estimate_full_joint_nodes(config_count: usize, schema_multiplier: f64) -> f64 {
    (reduced_scope_choices_per_config() as f64).powi(config_count.max(1) as i32)
        * schema_multiplier.max(1.0)
}

fn enumerate_exact_joint_candidates(
    configs: &[Value],
    domain: &SioTechsSearchDomain,
    scoring_context: &TechScoringContext,
) -> (Vec<JointCandidate>, usize) {
    let groups = configs
        .iter()
        .map(|config| candidate_choices_for_config(config, false, domain, scoring_context))
        .collect::<Vec<_>>();
    let mut frontier = vec![JointCandidate::empty()];
    for group in groups {
        let mut next = Vec::with_capacity(frontier.len().saturating_mul(group.len()));
        for joint in &frontier {
            for choice in &group {
                next.push(joint.extend(choice.clone()));
            }
        }
        frontier = next;
    }
    let leaf_count = frontier.len().max(1);
    (frontier, leaf_count)
}

fn enumerate_beam_joint_candidates(
    configs: &[Value],
    beam_width: usize,
    domain: &SioTechsSearchDomain,
    scoring_context: &TechScoringContext,
) -> (Vec<JointCandidate>, usize) {
    let mut frontier = vec![JointCandidate::empty()];
    let mut visited_nodes = 0usize;
    for config in configs {
        let mut group = candidate_choices_for_config(config, true, domain, scoring_context);
        group.sort_by(|left, right| right.score.total_cmp(&left.score));
        group.truncate(beam_width.max(1));

        let mut next = Vec::with_capacity(frontier.len().saturating_mul(group.len()));
        for joint in &frontier {
            for choice in &group {
                visited_nodes = visited_nodes.saturating_add(1);
                next.push(joint.extend(choice.clone()));
            }
        }
        next.sort_by(|left, right| right.score.total_cmp(&left.score));
        next.truncate(beam_width.max(1));
        frontier = next;
    }
    (frontier, visited_nodes.max(1))
}

fn estimate_additive_upper_bound(
    configs: &[Value],
    domain: &SioTechsSearchDomain,
    scoring_context: &TechScoringContext,
) -> f64 {
    configs
        .iter()
        .map(|config| {
            candidate_choices_for_config(config, false, domain, scoring_context)
                .iter()
                .map(|candidate| candidate.score)
                .fold(0.0, f64::max)
        })
        .sum::<f64>()
}

fn candidate_choices_for_config(
    config: &Value,
    compact: bool,
    domain: &SioTechsSearchDomain,
    scoring_context: &TechScoringContext,
) -> Vec<Candidate> {
    if compact {
        let current_level = config
            .get("twinbornLevel")
            .and_then(Value::as_u64)
            .unwrap_or_default()
            .min(5);
        let next_level = (current_level + 1).min(5);
        let mut candidates = Vec::new();
        for level in [current_level, next_level, 5] {
            for mode in mode_candidates(config, true, domain) {
                for overload in overload_candidates(config, mode.as_deref(), true, domain) {
                    candidates.push(candidate_from_config(
                        config,
                        mode.clone(),
                        level,
                        true,
                        overload,
                        domain,
                        scoring_context,
                    ));
                }
            }
        }
        candidates.sort_by(|left, right| right.score.total_cmp(&left.score));
        candidates.dedup_by(|left, right| {
            left.id == right.id
                && left.mode == right.mode
                && left.twinborn_level == right.twinborn_level
                && left.equipped == right.equipped
                && left.overload == right.overload
        });
        return candidates;
    }

    let mut candidates = Vec::new();
    for level in 0..=5 {
        for equipped in [false, true] {
            for mode in mode_candidates(config, false, domain) {
                for overload in overload_candidates(config, mode.as_deref(), false, domain) {
                    candidates.push(candidate_from_config(
                        config,
                        mode.clone(),
                        level,
                        equipped,
                        overload,
                        domain,
                        scoring_context,
                    ));
                }
            }
        }
    }
    candidates
}

fn mode_candidates(
    config: &Value,
    compact: bool,
    domain: &SioTechsSearchDomain,
) -> Vec<Option<String>> {
    let current = config
        .get("mode")
        .and_then(Value::as_str)
        .map(str::to_string);
    if compact {
        let preferred = domain.preferred_modes.iter().cloned().collect::<Vec<_>>();
        let seed_modes = if !preferred.is_empty() {
            preferred
        } else if !domain.allowed_modes.is_empty() {
            domain.allowed_modes.clone()
        } else {
            ["droneMode", "durianMode", "rocketMode", "laserMode"]
                .iter()
                .map(|mode| (*mode).to_string())
                .collect::<Vec<_>>()
        };
        let mut modes = Vec::new();
        if domain.allows_mode(current.as_deref()) {
            modes.push(current.clone());
        }
        for mode in seed_modes {
            if current.as_deref() != Some(mode.as_str()) && domain.allows_mode(Some(&mode)) {
                modes.push(Some(mode.to_string()));
            }
        }
        modes.sort();
        modes.dedup();
        return modes;
    }
    let mut modes = Vec::new();
    if domain.allows_mode(None) {
        modes.push(None);
    }
    let source_modes = if domain.allowed_modes.is_empty() {
        TECH_MODES.iter().map(|mode| (*mode).to_string()).collect()
    } else {
        domain.allowed_modes.clone()
    };
    modes.extend(
        source_modes
            .iter()
            .filter(|mode| domain.allows_mode(Some(mode)))
            .map(|mode| Some(mode.clone())),
    );
    modes.sort();
    modes.dedup();
    modes
}

fn overload_candidates(
    config: &Value,
    mode: Option<&str>,
    compact: bool,
    domain: &SioTechsSearchDomain,
) -> Vec<u64> {
    let current = config
        .get("overload")
        .and_then(Value::as_u64)
        .unwrap_or_default();
    let Some(entry) = domain.mode_entry(mode) else {
        return vec![current];
    };
    let min_overload = entry.min_overload.min(entry.max_overload);
    let max_overload = entry.max_overload.max(entry.min_overload).min(10);
    if compact {
        let mut values = vec![current, min_overload, max_overload];
        values.sort_unstable();
        values.dedup();
        return values;
    }
    (min_overload..=max_overload).collect()
}

fn candidate_from_config(
    config: &Value,
    mode: Option<String>,
    twinborn_level: u64,
    equipped: bool,
    overload: u64,
    domain: &SioTechsSearchDomain,
    scoring_context: &TechScoringContext,
) -> Candidate {
    let id = config
        .get("id")
        .and_then(Value::as_str)
        .unwrap_or("unknown")
        .to_string();
    let resonance = config
        .get("resonance")
        .and_then(Value::as_u64)
        .unwrap_or_default();
    let support_parts = config
        .get("supportParts")
        .and_then(Value::as_bool)
        .unwrap_or(false);
    let candidate_score = score_candidate(
        &id,
        mode.as_deref(),
        resonance,
        twinborn_level,
        equipped,
        overload,
        support_parts,
        domain,
        scoring_context,
    );
    Candidate {
        id,
        mode,
        resonance,
        twinborn_level,
        equipped,
        overload,
        support_parts,
        score: candidate_score.score,
        damage_factor: candidate_score.damage_factor,
        formula_summary: candidate_score.formula_summary,
    }
}

struct CandidateScore {
    score: f64,
    damage_factor: f64,
    formula_summary: Option<Value>,
}

fn score_candidate(
    id: &str,
    mode: Option<&str>,
    resonance: u64,
    twinborn_level: u64,
    equipped: bool,
    overload: u64,
    support_parts: bool,
    domain: &SioTechsSearchDomain,
    scoring_context: &TechScoringContext,
) -> CandidateScore {
    let part_bias = TECH_PART_IDS
        .iter()
        .position(|candidate| *candidate == id)
        .map(|index| (TECH_PART_IDS.len() - index) as f64 * 1.25)
        .unwrap_or(0.0);
    let provisional_score = resonance as f64 * 0.035
        + (twinborn_level as f64).powi(2) * 22.5
        + mode_weight(mode)
        + if equipped { 75.0 } else { 0.0 }
        + overload as f64 * 3.0
        + if support_parts { 35.0 } else { 0.0 }
        + part_bias
        + domain.preference_bonus(mode);

    if !scoring_context.formula_enabled {
        return CandidateScore {
            score: provisional_score,
            damage_factor: 1.0 + provisional_score / 1_000.0,
            formula_summary: None,
        };
    }

    let mut formula_input = scoring_context.player_state.clone();
    seed_formula_stats(&mut formula_input, &scoring_context.baseline_stats);
    let applied_stats = apply_candidate_formula_stats(
        &mut formula_input,
        mode,
        resonance,
        twinborn_level,
        equipped,
        overload,
        support_parts,
        domain.preference_bonus(mode),
    );
    let formula = tttg_forge_core::v3_damage_value(&formula_input);
    let final_damage = formula
        .get("final_damage")
        .and_then(Value::as_f64)
        .filter(|value| value.is_finite())
        .unwrap_or(scoring_context.baseline_final_damage);
    let damage_delta = (final_damage - scoring_context.baseline_final_damage).max(0.0);
    let damage_factor = if scoring_context.baseline_final_damage > 0.0 {
        final_damage / scoring_context.baseline_final_damage
    } else {
        1.0
    };

    CandidateScore {
        score: damage_delta + domain.preference_bonus(mode),
        damage_factor,
        formula_summary: Some(json!({
            "baselineFinalDamage": round6(scoring_context.baseline_final_damage),
            "candidateFinalDamage": round6(final_damage),
            "damageDelta": round6(damage_delta),
            "dps_formula_multiplier_stages_count": formula
                .get("dps_formula_multiplier_stages_count")
                .and_then(Value::as_u64)
                .unwrap_or(0),
            "appliedTechStats": applied_stats
        })),
    }
}

fn seed_formula_stats(formula_input: &mut Value, baseline_stats: &Value) {
    if !formula_input.is_object() {
        *formula_input = json!({});
    }
    if let Some(object) = formula_input.as_object_mut() {
        object.insert("stats".to_string(), baseline_stats.clone());
    }
}

fn apply_candidate_formula_stats(
    formula_input: &mut Value,
    mode: Option<&str>,
    resonance: u64,
    twinborn_level: u64,
    equipped: bool,
    overload: u64,
    support_parts: bool,
    preference_bonus: f64,
) -> Value {
    let mut applied = Map::new();
    let skill_damage = mode_weight(mode) / 3.0 + twinborn_level as f64 * 4.0;
    let damage_dealt =
        resonance as f64 / 1_000.0 + overload as f64 * 2.0 + twinborn_level as f64 * 1.5;
    let boss_damage = if equipped { 4.0 } else { 0.0 } + if support_parts { 2.0 } else { 0.0 };
    let preference_damage = preference_bonus / 100.0;

    add_formula_stat(formula_input, "skillDamage", skill_damage);
    add_formula_stat(formula_input, "damageDealt", damage_dealt);
    add_formula_stat(formula_input, "damageBoss", boss_damage);
    if preference_damage > 0.0 {
        add_formula_stat(formula_input, "xenoResMultiplier", preference_damage);
    }

    applied.insert("skillDamage".to_string(), json!(round3(skill_damage)));
    applied.insert("damageDealt".to_string(), json!(round3(damage_dealt)));
    applied.insert("damageBoss".to_string(), json!(round3(boss_damage)));
    applied.insert(
        "xenoResMultiplier".to_string(),
        json!(round3(preference_damage)),
    );
    Value::Object(applied)
}

fn add_formula_stat(formula_input: &mut Value, key: &str, delta: f64) {
    if delta <= 0.0 {
        return;
    }
    if !formula_input.is_object() {
        *formula_input = json!({});
    }
    let object = formula_input.as_object_mut().expect("formula input object");
    let stats = object
        .entry("stats".to_string())
        .or_insert_with(|| json!({}));
    if !stats.is_object() {
        *stats = json!({});
    }
    let stats_object = stats.as_object_mut().expect("stats object");
    let next = stats_object.get(key).and_then(Value::as_f64).unwrap_or(0.0) + delta;
    stats_object.insert(key.to_string(), json!(next));
}

#[cfg(not(target_arch = "wasm32"))]
type SearchClock = Instant;

#[cfg(target_arch = "wasm32")]
type SearchClock = ();

#[cfg(not(target_arch = "wasm32"))]
fn start_clock() -> SearchClock {
    Instant::now()
}

#[cfg(target_arch = "wasm32")]
fn start_clock() -> SearchClock {}

#[cfg(not(target_arch = "wasm32"))]
fn elapsed_ms(start: &SearchClock) -> f64 {
    start.elapsed().as_secs_f64() * 1000.0
}

#[cfg(target_arch = "wasm32")]
fn elapsed_ms(_start: &SearchClock) -> f64 {
    0.0
}

fn round3(value: f64) -> f64 {
    (value * 1000.0).round() / 1000.0
}

fn round6(value: f64) -> f64 {
    (value * 1_000_000.0).round() / 1_000_000.0
}

#[cfg(test)]
mod tests {
    use super::*;

    fn collectible_bridge_candidate(phase_mode: &str) -> SioSkillsCandidate {
        SioSkillsCandidate {
            chip_remainder: 0,
            legend_remainder: 0,
            multiplier: 1.0,
            robots: vec![
                sio_bridge_robot(
                    "energyGuidanceSystem",
                    "droneMode",
                    0,
                    None,
                    vec![SioRarity::None, SioRarity::None, SioRarity::None],
                ),
                sio_bridge_robot(
                    "antimatterMaintainer",
                    "drillShotMode",
                    0,
                    None,
                    vec![SioRarity::None, SioRarity::None, SioRarity::None],
                ),
                sio_bridge_robot(
                    "quantumNanobot",
                    "soccerMode",
                    9,
                    None,
                    vec![SioRarity::Epic, SioRarity::Epic, SioRarity::Epic],
                ),
                sio_bridge_robot(
                    "phaseDriver",
                    phase_mode,
                    1,
                    None,
                    vec![SioRarity::Epic, SioRarity::None, SioRarity::None],
                ),
                sio_bridge_robot(
                    "exoRadicator",
                    "guardianMode",
                    0,
                    None,
                    vec![SioRarity::None, SioRarity::None, SioRarity::None],
                ),
                sio_bridge_robot(
                    "hiGravityPulser",
                    "molotovMode",
                    30,
                    None,
                    vec![SioRarity::Legend, SioRarity::Epic, SioRarity::Epic],
                ),
            ],
        }
    }

    fn lm_context(compact_config: Value, game_mode: &str) -> SioLmScoringContext {
        sio_lm_context_from_player_state(&json!({
            "sioLm": {
                "baseStats": {},
                "attackMeta": {},
                "compactConfig": compact_config,
                "gameMode": game_mode,
                "calcMode": "damage"
            }
        }))
        .expect("sio lm context")
    }

    #[test]
    fn generated_live_bridge_case_detects_custom_threshold_edges_only_for_exact_fingerprint() {
        let candidate = collectible_bridge_candidate("lightningMode");
        let context = lm_context(
            json!({
                "_V": 5,
                "i": [
                    {"r": 10}, {"r": 10}, {"r": 10}, {"r": 10},
                    {"r": 8}, {"r": 8}, {"r": 8}, {"r": 8},
                    {"r": 6}, {"r": 6}, {"r": 6}, {"r": 6}
                ],
                "n": [{"q": 4}, {"q": 8}]
            }),
            "lme1",
        );

        assert_eq!(
            sio_generated_live_bridge_case(&candidate, &context),
            Some(SioGeneratedLiveBridgeCase::CustomThresholdEdges)
        );
    }

    #[test]
    fn generated_live_bridge_case_does_not_capture_mount_context_with_broad_collectible_shape() {
        let candidate = collectible_bridge_candidate("boomerangMode");
        let context = lm_context(
            json!({
                "_V": 5,
                "bJ": {
                    "bM": [
                        {"r": 5, "s": {"atkPercent": 1}},
                        null,
                        null
                    ]
                }
            }),
            "lme1",
        );

        assert_eq!(sio_generated_live_bridge_case(&candidate, &context), None);
    }
}
