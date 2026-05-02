use crate::JsonResult;
use serde_json::{json, Value};
use std::collections::BTreeSet;

pub fn tech_stats_and_pools(
    _expanded_config: &Value,
    _skills: &Value,
    _upgraded_collectibles: &BTreeSet<String>,
    _cooldown_reduction: f64,
) -> JsonResult<Value> {
    Ok(json!({"stats": {}, "ceDamage": {}, "passivePools": []}))
}
