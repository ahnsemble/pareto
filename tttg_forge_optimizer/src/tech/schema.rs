use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};

use super::catalog::{skill_name_to_mode, TECH_MODES};

const SIO_RARITY_ALIASES: [(&str, &str); 10] = [
    ("eternal", "Eternal"),
    ("legend4", "Legend4"),
    ("legend3", "Legend3"),
    ("legend2", "Legend2"),
    ("legend1", "Legend1"),
    ("legend", "Legend"),
    ("epic3", "Epic3"),
    ("epic2", "Epic2"),
    ("epic1", "Epic1"),
    ("epic", "Epic"),
];

const SIO_SPEED_MODES: [&str; 5] = ["fast", "normal", "precise", "precise+", "full"];
const SIO_LIMITS: [&str; 2] = ["basic", "advanced"];

#[derive(Clone, Copy, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TechOptimizerMode {
    Auto,
    Exact,
    Beam,
}

#[derive(Clone, Debug, PartialEq)]
pub struct TechOptimizerOptions {
    pub top_k: usize,
    pub mode: TechOptimizerMode,
    pub first_answer_budget_ms: u64,
    pub total_budget_ms: u64,
    pub beam_width: usize,
    pub max_exact_nodes: usize,
    pub sio_profile: SioTechsOptimizerProfile,
}

#[derive(Clone, Debug, PartialEq)]
pub struct SioTechsOptimizerProfile {
    pub schema_active: bool,
    pub strategy: String,
    pub speed_mode: String,
    pub fodder: String,
    pub skills: usize,
    pub chips: usize,
    pub overloadable: bool,
    pub overload: String,
    pub input_rarity_kinds: usize,
    pub input_rarity_total: usize,
    pub modes_count: usize,
    pub mode_entries_count: usize,
    pub skills_map_enabled: usize,
    pub skills_map_preferred: usize,
    pub skills_map_disabled: usize,
    pub limit: String,
    pub rarity_inputs: Vec<SioRarityInput>,
    pub modes: Vec<String>,
    pub mode_entries: Vec<SioModeEntry>,
    pub skills_map: Vec<SioSkillPreference>,
    pub inventory_contract: Option<SioInventoryContract>,
}

#[derive(Clone, Debug, PartialEq)]
pub struct SioRarityInput {
    pub rarity: String,
    pub count: usize,
}

#[derive(Clone, Debug, PartialEq)]
pub struct SioModeEntry {
    pub mode: String,
    pub min_resonance: u64,
    pub max_resonance: u64,
    pub min_overload: u64,
    pub max_overload: u64,
}

#[derive(Clone, Debug, PartialEq)]
pub struct SioSkillPreference {
    pub skill: String,
    pub status: String,
}

#[derive(Clone, Debug, PartialEq)]
pub struct SioInventoryContract {
    pub candidate_preselect_top_k: Option<usize>,
    pub validation_warnings: Vec<String>,
}

#[derive(Clone, Debug, PartialEq)]
pub struct SioInventoryValidationResult {
    pub valid: bool,
    pub errors: Vec<String>,
    pub warnings: Vec<String>,
}

#[derive(Clone, Debug, PartialEq)]
pub struct SioTechInventoryInput {
    pub rarity_counts: Vec<(String, usize)>,
    pub chips: usize,
    pub skill_slots: usize,
    pub overloadable: bool,
    pub max_overload: u64,
    pub modes: Vec<String>,
    pub forced_skills: Vec<String>,
    pub preferred_skills: Vec<String>,
    pub disabled_skills: Vec<String>,
    pub speed_mode: String,
    pub limit: String,
    pub candidate_preselect_top_k: Option<usize>,
}

impl Default for SioTechsOptimizerProfile {
    fn default() -> Self {
        Self {
            schema_active: false,
            strategy: "optimize".to_string(),
            speed_mode: "normal".to_string(),
            fodder: "excess".to_string(),
            skills: 0,
            chips: 0,
            overloadable: false,
            overload: "excess".to_string(),
            input_rarity_kinds: 0,
            input_rarity_total: 0,
            modes_count: 0,
            mode_entries_count: 0,
            skills_map_enabled: 0,
            skills_map_preferred: 0,
            skills_map_disabled: 0,
            limit: "basic".to_string(),
            rarity_inputs: Vec::new(),
            modes: Vec::new(),
            mode_entries: Vec::new(),
            skills_map: Vec::new(),
            inventory_contract: None,
        }
    }
}

impl SioTechsOptimizerProfile {
    pub(crate) fn schema_multiplier(&self) -> f64 {
        if !self.schema_active {
            return 1.0;
        }
        let rarity = (self.input_rarity_total + 1).max(1) as f64;
        let modes = self.modes_count.max(1) as f64;
        let entries = self.mode_entries_count.max(1) as f64;
        let skills = (self.skills + 1).max(1) as f64;
        let chips = (self.chips + 1).max(1) as f64;
        let overload = if self.overloadable { 3.0 } else { 1.0 };
        let skills_map =
            (self.skills_map_enabled + self.skills_map_preferred + self.skills_map_disabled + 1)
                .max(1) as f64;

        rarity * modes * entries * skills * chips * overload * skills_map
    }

    pub(crate) fn schema_dimensions(&self) -> Vec<String> {
        if !self.schema_active {
            return Vec::new();
        }
        let mut dimensions = vec![
            "strategy".to_string(),
            "speed_mode".to_string(),
            "fodder".to_string(),
            "skills".to_string(),
            "chips".to_string(),
            "limit".to_string(),
        ];
        if self.overloadable {
            dimensions.push("overload".to_string());
        }
        if self.input_rarity_kinds > 0 {
            dimensions.push("rarity_inputs".to_string());
        }
        if self.modes_count > 0 {
            dimensions.push("modes".to_string());
        }
        if self.mode_entries_count > 0 {
            dimensions.push("mode_entries".to_string());
        }
        if self.skills_map_enabled + self.skills_map_preferred + self.skills_map_disabled > 0 {
            dimensions.push("skills_map".to_string());
        }
        if self.inventory_contract.is_some() {
            dimensions.push("inventory_contract".to_string());
        }
        dimensions
    }
}

impl SioInventoryValidationResult {
    fn from_parts(mut errors: Vec<String>, mut warnings: Vec<String>) -> Self {
        errors.sort();
        errors.dedup();
        warnings.sort();
        warnings.dedup();
        Self {
            valid: errors.is_empty(),
            errors,
            warnings,
        }
    }
}

impl SioTechInventoryInput {
    pub fn validate(&self) -> SioInventoryValidationResult {
        let mut errors = Vec::new();
        let mut warnings = Vec::new();
        let mut positive_rarity_count = 0usize;

        for (rarity, count) in &self.rarity_counts {
            if canonical_sio_rarity(rarity).is_none() {
                errors.push(format!("rarity_counts.{rarity}.unknown"));
            }
            if *count == 0 {
                errors.push(format!("rarity_counts.{rarity}.count_zero"));
            } else {
                positive_rarity_count += 1;
            }
        }
        if positive_rarity_count == 0 {
            errors.push("rarity_counts.empty".to_string());
        }

        if self.chips > 999 {
            errors.push("chips.gt_999".to_string());
        }
        if self.skill_slots == 0 {
            errors.push("skill_slots.lt_1".to_string());
        }
        if self.skill_slots > 6 {
            errors.push("skill_slots.gt_6".to_string());
        }
        if self.max_overload > 18 {
            errors.push("overload.max_gt_18".to_string());
        }
        if !self.overloadable && self.max_overload > 0 {
            errors.push("overload.max_requires_overloadable".to_string());
        }
        if !SIO_SPEED_MODES.contains(&self.speed_mode.as_str()) {
            errors.push(format!("speed_mode.{}.unknown", self.speed_mode));
        }
        if !SIO_LIMITS.contains(&self.limit.as_str()) {
            errors.push(format!("limit.{}.unknown", self.limit));
        }
        if self.candidate_preselect_top_k == Some(0) {
            errors.push("candidate_preselect_top_k.lt_1".to_string());
        }

        let known_modes = TECH_MODES.into_iter().collect::<HashSet<_>>();
        for mode in &self.modes {
            if !known_modes.contains(mode.as_str()) {
                errors.push(format!("modes.{mode}.unknown"));
            }
        }

        let mut skill_statuses: HashMap<String, Vec<(&str, &str)>> = HashMap::new();
        validate_skill_list(
            "forced",
            &self.forced_skills,
            &mut errors,
            &mut skill_statuses,
        );
        validate_skill_list(
            "preferred",
            &self.preferred_skills,
            &mut errors,
            &mut skill_statuses,
        );
        validate_skill_list(
            "disabled",
            &self.disabled_skills,
            &mut errors,
            &mut skill_statuses,
        );
        for (_mode, statuses) in skill_statuses {
            let has_forced = statuses.iter().any(|(_, status)| *status == "forced");
            let has_disabled = statuses.iter().any(|(_, status)| *status == "disabled");
            if has_forced && has_disabled {
                let label = statuses
                    .iter()
                    .find_map(|(label, status)| (*status == "forced").then_some(*label))
                    .unwrap_or(statuses[0].0);
                warnings.push(format!("skill.{label}.conflicts_forced_and_disabled"));
            }
        }

        SioInventoryValidationResult::from_parts(errors, warnings)
    }

    pub fn to_optimizer_profile(
        &self,
    ) -> Result<SioTechsOptimizerProfile, SioInventoryValidationResult> {
        let validation = self.validate();
        if !validation.valid {
            return Err(validation);
        }

        let rarity_inputs = self
            .rarity_counts
            .iter()
            .filter_map(|(rarity, count)| {
                canonical_sio_rarity(rarity).map(|canonical| SioRarityInput {
                    rarity: canonical.to_string(),
                    count: *count,
                })
            })
            .collect::<Vec<_>>();
        let input_rarity_total = rarity_inputs.iter().map(|input| input.count).sum::<usize>();
        let mut mode_entries = Vec::new();
        if self.overloadable && self.max_overload > 0 {
            for mode in &self.modes {
                mode_entries.push(SioModeEntry {
                    mode: mode.clone(),
                    min_resonance: 0,
                    max_resonance: 15_000,
                    min_overload: 0,
                    max_overload: self.max_overload,
                });
            }
        }

        let skills_map = self.skill_preferences();
        let skills_map_preferred = skills_map
            .iter()
            .filter(|entry| entry.status == "preferred" || entry.status == "forced")
            .count();
        let skills_map_disabled = skills_map
            .iter()
            .filter(|entry| entry.status == "disabled")
            .count();
        let modes_count = self.modes.len();
        let mode_entries_count = mode_entries.len();

        Ok(SioTechsOptimizerProfile {
            schema_active: true,
            strategy: "optimize".to_string(),
            speed_mode: self.speed_mode.clone(),
            fodder: "excess".to_string(),
            skills: self.skill_slots,
            chips: self.chips,
            overloadable: self.overloadable,
            overload: if self.overloadable {
                "full".to_string()
            } else {
                "excess".to_string()
            },
            input_rarity_kinds: rarity_inputs.len(),
            input_rarity_total,
            modes_count,
            mode_entries_count,
            skills_map_enabled: 0,
            skills_map_preferred,
            skills_map_disabled,
            limit: self.limit.clone(),
            rarity_inputs,
            modes: self.modes.clone(),
            mode_entries,
            skills_map,
            inventory_contract: Some(SioInventoryContract {
                candidate_preselect_top_k: self.candidate_preselect_top_k,
                validation_warnings: validation.warnings,
            }),
        })
    }

    pub fn into_contract(self) -> SioInventoryContract {
        let validation = self.validate();
        SioInventoryContract {
            candidate_preselect_top_k: self.candidate_preselect_top_k,
            validation_warnings: validation.warnings,
        }
    }

    fn skill_preferences(&self) -> Vec<SioSkillPreference> {
        let mut entries = Vec::new();
        entries.extend(self.forced_skills.iter().map(|skill| SioSkillPreference {
            skill: skill.clone(),
            status: "forced".to_string(),
        }));
        entries.extend(
            self.preferred_skills
                .iter()
                .map(|skill| SioSkillPreference {
                    skill: skill.clone(),
                    status: "preferred".to_string(),
                }),
        );
        entries.extend(self.disabled_skills.iter().map(|skill| SioSkillPreference {
            skill: skill.clone(),
            status: "disabled".to_string(),
        }));
        entries
    }
}

fn validate_skill_list<'a>(
    status: &'static str,
    skills: &'a [String],
    errors: &mut Vec<String>,
    skill_statuses: &mut HashMap<String, Vec<(&'a str, &'static str)>>,
) {
    for skill in skills {
        let Some(mode) = skill_name_to_mode(skill) else {
            errors.push(format!("skill.{skill}.unknown"));
            continue;
        };
        skill_statuses
            .entry(mode)
            .or_default()
            .push((skill.as_str(), status));
    }
}

fn canonical_sio_rarity(value: &str) -> Option<&'static str> {
    let normalized = value
        .chars()
        .filter(|character| character.is_ascii_alphanumeric())
        .flat_map(char::to_lowercase)
        .collect::<String>();
    SIO_RARITY_ALIASES
        .iter()
        .find_map(|(alias, canonical)| (*alias == normalized).then_some(*canonical))
}

impl Default for TechOptimizerOptions {
    fn default() -> Self {
        Self {
            top_k: 10,
            mode: TechOptimizerMode::Auto,
            first_answer_budget_ms: 3_000,
            total_budget_ms: 60_000,
            beam_width: 64,
            max_exact_nodes: 250_000,
            sio_profile: SioTechsOptimizerProfile::default(),
        }
    }
}
