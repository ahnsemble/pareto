use crate::JsonResult;
use serde_json::Value;
use std::collections::BTreeSet;

pub fn upgraded_collectible_extra(
    _expanded_config: &Value,
    _upgraded_collectibles: &BTreeSet<String>,
) -> JsonResult<Value> {
    Ok(super::empty_stats())
}
