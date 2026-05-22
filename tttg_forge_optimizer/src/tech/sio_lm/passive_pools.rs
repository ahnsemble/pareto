use serde_json::{json, Map, Value};
use std::collections::HashSet;

use super::{str_value, SioLmStatTransform};

const PASSIVE_POOL_COUNT: usize = tttg_forge_core::constants::MAX_DAMAGE_POOL_INDEX + 1;

pub(super) fn passive_pools_for_trace(
    techs: &Value,
    enabled: &HashSet<String>,
    transform: &SioLmStatTransform,
) -> Vec<Value> {
    let mut pools = vec![json!(1.0); PASSIVE_POOL_COUNT];
    let mut active_damage_modes = HashSet::new();
    active_damage_modes.insert("ssWeapon".to_string());
    for row in techs.as_object().into_iter().flat_map(Map::values) {
        let mode = str_value(row, "mode");
        if !mode.is_empty() && enabled.contains(mode) {
            active_damage_modes.insert(mode.to_string());
        }
    }
    if techs.get("Energy Guidance System").is_some_and(|row| {
        row.get("deployed")
            .and_then(Value::as_bool)
            .unwrap_or(false)
            && str_value(row, "mode") == "Forcefield Mode"
    }) && enabled.contains("Drone")
    {
        active_damage_modes.insert("Drone".to_string());
    }

    for (passive, level) in &transform.passive_levels {
        for mode in &active_damage_modes {
            set_passive_pool_for_mode(&mut pools, passive, mode, *level);
        }
    }
    for (index, value) in &transform.passive_pool_sets {
        if *index < pools.len() {
            pools[*index] = json!(*value);
        }
    }
    pools
}

fn set_passive_pool_for_mode(pools: &mut [Value], passive: &str, mode: &str, level: f64) {
    let multiplier = tttg_forge_core::constants::passive_multiplier(passive, mode, level);
    if (multiplier - 1.0).abs() <= f64::EPSILON {
        return;
    }
    if let Some(index) = tttg_forge_core::constants::damage_pool_index(mode, passive) {
        if index < pools.len() {
            pools[index] = json!(multiplier);
        }
    }
}
