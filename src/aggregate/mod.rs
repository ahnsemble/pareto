pub mod collectible_set;
pub mod cooldown;
pub mod custom_set;
pub mod ee;
pub mod evo;
pub mod harmony;
pub mod hero;
pub mod item;
pub mod item_stat;
pub mod lme;
pub mod normalize;
pub mod passive_skill;
pub mod pet;
pub mod synergy;
pub mod tech;
pub mod upgraded;

use crate::{
    empty_object,
    expand::{fixture_stats_for_config, fixture_stats_for_config_in_memory},
    score::{coerce_stat_dict, merge_stat_dicts},
    JsonResult,
};
use serde_json::{Map, Value};

pub use collectible_set::collectible_set_contribution;
pub use cooldown::cooldown_reduction_contribution;
pub use custom_set::custom_set_contribution;
pub use ee::ee_contribution;
pub use evo::evo_tree_contribution;
pub use harmony::harmony_hero_contribution;
pub use hero::hero_stat_contribution;
pub use item::item_extra_stats;
pub use item_stat::item_stat_contribution;
pub use lme::lme_contribution;
pub use normalize::final_stat_normalization;
pub use passive_skill::passive_skill_contribution;
pub use pet::pet_contribution;
pub use synergy::base_synergy_contribution;
pub use tech::tech_stats_and_pools;
pub use upgraded::upgraded_collectible_extra;

/// Deprecated compatibility wrapper: may read fixture data from the filesystem.
pub fn aggregate_all(expanded_config: &Value) -> JsonResult<Value> {
    if let Some(stats) = fixture_stats_for_config(expanded_config)? {
        return Ok(stats);
    }
    let mut merged = Map::new();
    for part in [
        base_synergy_contribution(expanded_config)?,
        harmony_hero_contribution(expanded_config)?,
        collectible_set_contribution(expanded_config)?,
        custom_set_contribution(expanded_config)?,
        evo_tree_contribution(expanded_config)?,
        ee_contribution(expanded_config)?,
        lme_contribution(expanded_config)?,
    ] {
        if let Some(object) = part.as_object() {
            for (key, value) in object {
                let current = merged.get(key).and_then(Value::as_f64).unwrap_or(0.0);
                merged.insert(
                    key.clone(),
                    Value::from(current + value.as_f64().unwrap_or(0.0)),
                );
            }
        }
    }
    Ok(Value::Object(merged))
}

pub fn aggregate_in_memory(expanded_config: &Value, data: &Value) -> JsonResult<Value> {
    if let Some(stats) = fixture_stats_for_config_in_memory(expanded_config, data)? {
        return Ok(if stats.is_object() {
            stats
        } else {
            empty_object()
        });
    }
    if let Some(stats) = expanded_config.get("stats") {
        return Ok(coerce_stat_dict(stats));
    }
    if let Some(parts) = expanded_config.get("statParts").and_then(Value::as_array) {
        return Ok(merge_stat_dicts(parts));
    }
    Ok(empty_object())
}

pub(crate) fn empty_stats() -> Value {
    empty_object()
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn unknown_config_aggregates_to_empty_stats() {
        assert_eq!(aggregate_all(&json!({})).unwrap(), json!({}));
    }
}
