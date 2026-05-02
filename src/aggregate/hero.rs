use crate::JsonResult;
use serde_json::Value;

pub fn hero_stat_contribution(
    _expanded_config: &Value,
    _skills: &Value,
    _beta_features: bool,
) -> JsonResult<Value> {
    Ok(super::empty_stats())
}
