use crate::JsonResult;
use serde_json::Value;

pub fn passive_skill_contribution(_expanded_config: &Value, _skills: &Value) -> JsonResult<Value> {
    Ok(super::empty_stats())
}
