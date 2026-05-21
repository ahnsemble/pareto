use serde_json::{json, Value};
use tttg_forge_optimizer::{
    run_tech_optimizer, SioInventoryValidationResult, SioModeEntry, SioRarityInput,
    SioSkillPreference, SioTechInventoryInput, SioTechsOptimizerProfile, TechOptimizerMode,
    TechOptimizerOptions,
};

const TWINBORN_PARTS: [(&str, &str); 10] = [
    ("energyGuidanceSystem", "Energy Guidance System"),
    ("antimatterMaintainer", "Antimatter Maintainer"),
    ("quantumNanobot", "Quantum Nanobot"),
    ("phaseDriver", "Phase Driver"),
    ("energyDiffuser", "Energy Diffuser"),
    ("hiMaintainer", "Hi-Maintainer"),
    ("precisionDevice", "Precision Device"),
    ("antimatterGenerator", "Antimatter Generator"),
    ("exoRadicator", "Exo-radicator"),
    ("hiGravityPulser", "Hi-Gravity Pulser"),
];

const ACTIVE_SKILLS: [(&str, &str); 18] = [
    ("drone", "Drone"),
    ("molotov", "Molotov"),
    ("drill", "Drill"),
    ("rocket", "Rocket"),
    ("durian", "Durian"),
    ("soccer", "Soccer"),
    ("forcefield", "Forcefield"),
    ("drillShot", "Drill Shot"),
    ("lightning", "Lightning"),
    ("boomerang", "Boomerang"),
    ("energyCube", "Energy Cube"),
    ("hpBullet", "HP Bullet"),
    ("exoBracer", "Exo Bracer"),
    ("ammoThruster", "Ammo Thruster"),
    ("heFuel", "HE Fuel"),
    ("guardian", "Guardian"),
    ("laser", "Laser"),
    ("brick", "Brick"),
];

const MODE_VARIANTS: [(&str, &str); 12] = [
    ("molotovMode", "Molotov Mode"),
    ("durianMode", "Durian Mode"),
    ("soccerMode", "Soccer Mode"),
    ("droneMode", "Drone Mode"),
    ("forcefieldMode", "Forcefield Mode"),
    ("drillShotMode", "Drill Shot Mode"),
    ("rocketMode", "Rocket Mode"),
    ("lightningMode", "Lightning Mode"),
    ("boomerangMode", "Boomerang Mode"),
    ("guardianMode", "Guardian Mode"),
    ("laserMode", "Laser Mode"),
    ("brickMode", "Brick Mode"),
];

const RARITIES: [&str; 10] = [
    "legend",
    "epic1",
    "epic",
    "excellent1",
    "excellent",
    "better",
    "good",
    "advanced",
    "super",
    "all",
];

pub fn get_tech_parts_full_value() -> Value {
    json!({
        "twinbornParts": TWINBORN_PARTS.map(|(id, name)| json!({"id": id, "name": name})),
        "activeSkills": ACTIVE_SKILLS.map(|(id, name)| json!({"id": id, "name": name})),
        "modeVariants": MODE_VARIANTS.map(|(id, name)| json!({"id": id, "name": name})),
        "rarities": RARITIES,
        "techModifierMatrix": tttg_forge_core::tech_modifier_matrix_entries()
            .iter()
            .map(|entry| json!({
                "baseTech": entry.base_tech,
                "target": entry.target,
                "coefficient": entry.coefficient,
                "returnsLevel": entry.returns_level
            }))
            .collect::<Vec<_>>(),
        "techModifierTargets": tttg_forge_core::tech_modifier_target_count()
    })
}

pub fn compute_tech_modifier_value(base: &Value, target: &Value, level: &Value) -> Value {
    let base = base.as_str().unwrap_or_default();
    let target = target.as_str().unwrap_or_default();
    let level = level.as_f64().unwrap_or_default();
    json!(tttg_forge_core::compute_tech_modifier(base, target, level))
}

pub fn validate_tech_part_config_value(config: &Value) -> Value {
    let twinborn_level = config
        .get("twinbornLevel")
        .or_else(|| config.get("twinborn_level"))
        .and_then(Value::as_u64)
        .unwrap_or(0);
    let resonance = config.get("resonance").and_then(Value::as_u64).unwrap_or(0);
    let overload = config.get("overload").and_then(Value::as_u64).unwrap_or(0);
    let id = config.get("id").and_then(Value::as_str).unwrap_or_default();
    let valid_id = TWINBORN_PARTS.iter().any(|(candidate, _)| *candidate == id);
    let mut errors = Vec::new();
    if !valid_id {
        errors.push("unknown_id");
    }
    if twinborn_level > 5 {
        errors.push("twinborn_level_gt_5");
    }
    if resonance > 999_999 {
        errors.push("resonance_gt_999999");
    }
    if overload > 999 {
        errors.push("overload_gt_999");
    }
    json!({
        "valid": errors.is_empty(),
        "errors": errors
    })
}

pub fn validate_sio_tech_inventory_value(config: &Value) -> Value {
    let inventory = read_sio_inventory(config);
    inventory_validation_to_value(&inventory.validate())
}

pub fn tech_optimizer_run_value(player_state: &Value, options: &Value) -> Value {
    let request = read_optimizer_request(options);
    if let Some(validation) = &request.inventory_validation {
        if !validation.valid {
            return json!({
                "algorithm": "tech_optimizer",
                "error": "invalid_sio_tech_inventory",
                "inventoryValidation": inventory_validation_to_value(validation),
                "builds": []
            });
        }
    }
    match run_tech_optimizer(player_state, &request.options) {
        Ok(result) => {
            let mut value = serde_json::to_value(result).unwrap_or_else(|_| json!({}));
            if let Some(object) = value.as_object_mut() {
                object.insert("algorithm".to_string(), json!("tech_optimizer"));
                object.insert("topK".to_string(), json!(request.options.top_k));
                if let Some(validation) = &request.inventory_validation {
                    object.insert(
                        "inventoryValidation".to_string(),
                        inventory_validation_to_value(validation),
                    );
                }
            }
            value
        }
        Err(error) => json!({
            "algorithm": "tech_optimizer",
            "error": error.to_string(),
            "builds": []
        }),
    }
}

struct OptimizerRequest {
    options: TechOptimizerOptions,
    inventory_validation: Option<SioInventoryValidationResult>,
}

fn read_optimizer_request(value: &Value) -> OptimizerRequest {
    let mut options = read_optimizer_options(value);
    let inventory = value
        .get("sioTechInventory")
        .or_else(|| value.get("sio_tech_inventory"));
    let inventory_validation = inventory.map(|raw| {
        let input = read_sio_inventory(raw);
        let validation = input.validate();
        if validation.valid {
            if let Ok(profile) = input.to_optimizer_profile() {
                options.sio_profile = profile;
            }
        }
        validation
    });
    OptimizerRequest {
        options,
        inventory_validation,
    }
}

fn read_optimizer_options(value: &Value) -> TechOptimizerOptions {
    let defaults = TechOptimizerOptions::default();
    TechOptimizerOptions {
        top_k: read_usize(value, "topK", "top_k").unwrap_or(defaults.top_k),
        mode: read_mode(value).unwrap_or(defaults.mode),
        first_answer_budget_ms: read_u64(value, "firstAnswerBudgetMs", "first_answer_budget_ms")
            .unwrap_or(defaults.first_answer_budget_ms),
        total_budget_ms: read_u64(value, "totalBudgetMs", "total_budget_ms")
            .unwrap_or(defaults.total_budget_ms),
        beam_width: read_usize(value, "beamWidth", "beam_width").unwrap_or(defaults.beam_width),
        max_exact_nodes: read_usize(value, "maxExactNodes", "max_exact_nodes")
            .unwrap_or(defaults.max_exact_nodes),
        sio_profile: read_sio_profile(value).unwrap_or(defaults.sio_profile),
    }
}

fn read_sio_profile(value: &Value) -> Option<SioTechsOptimizerProfile> {
    let raw = value
        .get("techsOptimizer")
        .or_else(|| value.get("techs_optimizer"))?;

    let inputs = raw.get("inputs").and_then(Value::as_object);
    let input_rarity_kinds = inputs.map(|object| object.len()).unwrap_or_default();
    let rarity_inputs = inputs
        .map(|object| {
            object
                .iter()
                .filter_map(|(rarity, count)| {
                    Some(SioRarityInput {
                        rarity: rarity.clone(),
                        count: count.as_u64()? as usize,
                    })
                })
                .collect::<Vec<_>>()
        })
        .unwrap_or_default();
    let input_rarity_total = inputs
        .map(|object| {
            object
                .values()
                .filter_map(Value::as_u64)
                .map(|value| value as usize)
                .sum::<usize>()
        })
        .unwrap_or_default();

    let modes_count = raw
        .get("modes")
        .and_then(Value::as_array)
        .map(|items| items.len())
        .unwrap_or_default();
    let modes = raw
        .get("modes")
        .and_then(Value::as_array)
        .map(|items| {
            items
                .iter()
                .filter_map(Value::as_str)
                .map(str::to_string)
                .collect::<Vec<_>>()
        })
        .unwrap_or_default();
    let mode_entries_count = raw
        .get("modeEntries")
        .or_else(|| raw.get("mode_entries"))
        .and_then(Value::as_object)
        .map(|items| items.len())
        .unwrap_or_default();
    let mode_entries = raw
        .get("modeEntries")
        .or_else(|| raw.get("mode_entries"))
        .and_then(Value::as_object)
        .map(|items| {
            items
                .iter()
                .map(|(mode, entry)| SioModeEntry {
                    mode: mode.clone(),
                    min_resonance: read_u64(entry, "minResonance", "min_resonance").unwrap_or(0),
                    max_resonance: read_u64(entry, "maxResonance", "max_resonance")
                        .unwrap_or(u64::MAX),
                    min_overload: read_u64(entry, "minOverload", "min_overload").unwrap_or(0),
                    max_overload: read_u64(entry, "maxOverload", "max_overload").unwrap_or(0),
                })
                .collect::<Vec<_>>()
        })
        .unwrap_or_default();

    let mut skills_map_enabled = 0usize;
    let mut skills_map_preferred = 0usize;
    let mut skills_map_disabled = 0usize;
    let mut skills_map_entries = Vec::new();
    if let Some(skills_map_object) = raw
        .get("skillsMap")
        .or_else(|| raw.get("skills_map"))
        .and_then(Value::as_object)
    {
        for (skill, status) in skills_map_object
            .iter()
            .filter_map(|(skill, status)| Some((skill, status.as_str()?)))
        {
            match status {
                "enabled" => skills_map_enabled += 1,
                "preferred" | "forced" => skills_map_preferred += 1,
                "disabled" => skills_map_disabled += 1,
                _ => {}
            }
            skills_map_entries.push(SioSkillPreference {
                skill: skill.clone(),
                status: status.to_string(),
            });
        }
    }

    Some(SioTechsOptimizerProfile {
        schema_active: true,
        strategy: read_string(raw, "strategy", "strategy")
            .unwrap_or_else(|| "optimize".to_string()),
        speed_mode: read_string(raw, "speedMode", "speed_mode")
            .unwrap_or_else(|| "normal".to_string()),
        fodder: read_string(raw, "fodder", "fodder").unwrap_or_else(|| "excess".to_string()),
        skills: read_usize(raw, "skills", "skills").unwrap_or_default(),
        chips: read_usize(raw, "chips", "chips").unwrap_or_default(),
        overloadable: read_bool(raw, "overloadable", "overloadable").unwrap_or(false),
        overload: read_string(raw, "overload", "overload").unwrap_or_else(|| "excess".to_string()),
        input_rarity_kinds,
        input_rarity_total,
        modes_count,
        mode_entries_count,
        skills_map_enabled,
        skills_map_preferred,
        skills_map_disabled,
        limit: read_string(raw, "limit", "limit").unwrap_or_else(|| "basic".to_string()),
        rarity_inputs,
        modes,
        mode_entries,
        skills_map: skills_map_entries,
        inventory_contract: None,
    })
}

fn read_sio_inventory(value: &Value) -> SioTechInventoryInput {
    let rarity_counts = value
        .get("rarityCounts")
        .or_else(|| value.get("rarity_counts"))
        .and_then(Value::as_object)
        .map(|object| {
            object
                .iter()
                .map(|(rarity, count)| {
                    (
                        rarity.clone(),
                        count.as_u64().map(|number| number as usize).unwrap_or(0),
                    )
                })
                .collect::<Vec<_>>()
        })
        .unwrap_or_default();
    SioTechInventoryInput {
        rarity_counts,
        chips: read_usize(value, "chips", "chips").unwrap_or_default(),
        skill_slots: read_usize(value, "skillSlots", "skill_slots").unwrap_or_default(),
        overloadable: read_bool(value, "overloadable", "overloadable").unwrap_or(false),
        max_overload: read_u64(value, "maxOverload", "max_overload").unwrap_or_default(),
        modes: read_string_array(value, "modes", "modes"),
        forced_skills: read_string_array(value, "forcedSkills", "forced_skills"),
        preferred_skills: read_string_array(value, "preferredSkills", "preferred_skills"),
        disabled_skills: read_string_array(value, "disabledSkills", "disabled_skills"),
        speed_mode: read_string(value, "speedMode", "speed_mode")
            .unwrap_or_else(|| "normal".to_string()),
        limit: read_string(value, "limit", "limit").unwrap_or_else(|| "basic".to_string()),
        candidate_preselect_top_k: read_usize(
            value,
            "candidatePreselectTopK",
            "candidate_preselect_top_k",
        ),
    }
}

fn read_string_array(value: &Value, camel: &str, snake: &str) -> Vec<String> {
    value
        .get(camel)
        .or_else(|| value.get(snake))
        .and_then(Value::as_array)
        .map(|items| {
            items
                .iter()
                .filter_map(Value::as_str)
                .map(str::to_string)
                .collect::<Vec<_>>()
        })
        .unwrap_or_default()
}

fn inventory_validation_to_value(validation: &SioInventoryValidationResult) -> Value {
    json!({
        "valid": validation.valid,
        "errors": validation.errors,
        "warnings": validation.warnings
    })
}

fn read_mode(value: &Value) -> Option<TechOptimizerMode> {
    let raw = value.get("mode").and_then(Value::as_str)?;
    match raw {
        "auto" | "Auto" => Some(TechOptimizerMode::Auto),
        "exact" | "Exact" => Some(TechOptimizerMode::Exact),
        "beam" | "Beam" => Some(TechOptimizerMode::Beam),
        _ => None,
    }
}

fn read_usize(value: &Value, camel: &str, snake: &str) -> Option<usize> {
    read_u64(value, camel, snake).map(|number| number as usize)
}

fn read_u64(value: &Value, camel: &str, snake: &str) -> Option<u64> {
    value
        .get(camel)
        .or_else(|| value.get(snake))
        .and_then(Value::as_u64)
}

fn read_string(value: &Value, camel: &str, snake: &str) -> Option<String> {
    value
        .get(camel)
        .or_else(|| value.get(snake))
        .and_then(Value::as_str)
        .map(str::to_string)
}

fn read_bool(value: &Value, camel: &str, snake: &str) -> Option<bool> {
    value
        .get(camel)
        .or_else(|| value.get(snake))
        .and_then(Value::as_bool)
}
