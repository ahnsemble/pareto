use crate::{valid_minimal_constraints, LegalityError, OptimizationSearchSpaceV2, OptimizerError};
use serde_json::{json, Value};
use std::path::Path;

pub fn build_full_space_from_fixture(
    fixture_path: &Path,
    constraints: &Value,
) -> Result<OptimizationSearchSpaceV2, OptimizerError> {
    let text = std::fs::read_to_string(fixture_path).map_err(|error| OptimizerError::Message(error.to_string()))?;
    let data: Value = serde_json::from_str(&text).map_err(|error| OptimizerError::Message(error.to_string()))?;
    let mut merged_constraints = valid_minimal_constraints();
    merge_objects(&mut merged_constraints, constraints);
    merged_constraints["fixture_path"] = json!(fixture_path.to_string_lossy().to_string());
    merged_constraints["expanded_config"] = data.clone();
    merged_constraints["prepared_case_base"] = json!({
        "score": data.get("score").and_then(Value::as_f64).unwrap_or(1000.0),
        "damageFactor": data.get("damageFactor").and_then(Value::as_f64).unwrap_or(100.0),
        "stats": data.get("stats").cloned().unwrap_or_else(|| json!({})),
        "damageStats": data.get("damageStats").cloned().unwrap_or_else(|| json!({})),
        "ceDamageTechs": data.get("ceDamageTechs").cloned().unwrap_or_else(|| json!({})),
        "attackMeta": data.get("meta").cloned().unwrap_or_else(|| json!({})),
        "skills": data.get("skills").cloned().unwrap_or_else(|| json!({})),
        "passivePools": data.get("passivePools").cloned().unwrap_or_else(|| json!([])),
        "calcMode": data.pointer("/settings/calcMode").cloned().unwrap_or_else(|| json!("damage")),
        "gameMode": data.pointer("/meta/gameMode").cloned().unwrap_or_else(|| json!(""))
    });

    let custom_set_fills = [4_usize, 8, 8]
        .iter()
        .enumerate()
        .map(|(index, size)| {
            data.get("customSets")
                .and_then(|sets| sets.get(index.to_string()))
                .and_then(|entry| entry.get("collectibles"))
                .and_then(Value::as_array)
                .map(|items| items.iter().filter_map(Value::as_str).map(str::to_string).collect::<Vec<_>>())
                .unwrap_or_else(|| vec!["None".to_string(); *size])
        })
        .collect::<Vec<_>>();
    let pet_slots = flatten_pet_slots(data.get("pets").unwrap_or(&Value::Null));
    let space = OptimizationSearchSpaceV2 {
        hero_candidates: data
            .get("heroes")
            .and_then(Value::as_object)
            .map(|object| object.keys().cloned().collect())
            .unwrap_or_else(|| vec!["Taloxa".to_string()]),
        collectible_inventory: data.get("collectibles").cloned().unwrap_or_else(|| json!({"Otherworld Key": {"stars": 0, "upgraded": false}})),
        tech_deployed: data
            .get("techs")
            .and_then(Value::as_object)
            .map(|object| {
                object
                    .iter()
                    .filter(|(_, entry)| entry.get("deployed").and_then(Value::as_bool).unwrap_or(false))
                    .map(|(name, _)| name.clone())
                    .collect()
            })
            .unwrap_or_default(),
        custom_set_fills,
        skill_toggles: data.get("skills").cloned().unwrap_or_else(|| json!({})),
        pet_slots,
        evo_tree: data
            .get("evoTree")
            .and_then(Value::as_object)
            .map(|object| object.keys().cloned().take(4).collect())
            .unwrap_or_else(|| vec!["A".to_string(), "B".to_string(), "C".to_string(), "D".to_string()]),
        constraints: merged_constraints,
    };
    space.validate().map_err(|error: LegalityError| OptimizerError::Message(error.to_string()))?;
    Ok(space)
}

pub fn estimate_space_size(space: &OptimizationSearchSpaceV2) -> Value {
    let hero_cardinality = space.hero_candidates.len() as u64;
    let collectible_cardinality = space.collectible_inventory.as_object().map(|object| object.len()).unwrap_or(0) as u64;
    let skill_cardinality = 2_u128.pow(space.skill_toggles.as_object().map(|object| object.len()).unwrap_or(0).min(63) as u32);
    json!({
        "hero_cardinality": hero_cardinality,
        "collectible_cardinality": collectible_cardinality,
        "tech_cardinality": space.tech_deployed.len(),
        "custom_set_cardinality": 405,
        "skill_cardinality": skill_cardinality,
        "pet_cardinality": space.pet_slots.as_object().map(|object| object.len()).unwrap_or(0),
        "evo_cardinality": 2_u64.pow(space.evo_tree.len() as u32),
        "legality_adjusted_total": (hero_cardinality as u128).max(1) * 2_u128.pow(collectible_cardinality.min(8) as u32) * skill_cardinality * 405_u128
    })
}

pub fn find_best_pareto_full(
    space_v2: &OptimizationSearchSpaceV2,
    target_combos: usize,
    objectives: &[String],
    beam_width: usize,
) -> Result<Vec<crate::OptimizationResult>, OptimizerError> {
    let slots = (target_combos.max(2) as f64).log2().round().max(1.0) as usize;
    let search_space = crate::make_synthetic_search_space(slots.min(16), false, true, beam_width.max(1));
    crate::find_best_pareto(&space_v2.constraints["prepared_case_base"], &Value::Null, &search_space, objectives, beam_width)
}

fn flatten_pet_slots(pets: &Value) -> Value {
    let mut slots = serde_json::Map::new();
    slots.insert(
        "active".to_string(),
        pets.get("active").cloned().unwrap_or_else(|| json!("None")),
    );
    for index in 1..8 {
        let value = pets
            .get("support")
            .and_then(Value::as_array)
            .and_then(|items| items.get(index - 1))
            .and_then(|entry| entry.get("name"))
            .cloned()
            .unwrap_or_else(|| json!("None"));
        slots.insert(format!("support_{index}"), value);
    }
    Value::Object(slots)
}

fn merge_objects(target: &mut Value, source: &Value) {
    let (Some(target), Some(source)) = (target.as_object_mut(), source.as_object()) else {
        return;
    };
    for (key, value) in source {
        target.insert(key.clone(), value.clone());
    }
}
