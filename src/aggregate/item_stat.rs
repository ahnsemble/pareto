use crate::JsonResult;
use serde_json::Value;
use std::collections::BTreeSet;

pub fn item_stat_contribution(
    _expanded_config: &Value,
    _upgraded_collectibles: &BTreeSet<String>,
) -> JsonResult<Value> {
    Ok(super::empty_stats())
}
