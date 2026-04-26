use crate::JsonResult;
use serde_json::Value;

pub fn pet_contribution(_expanded_config: &Value, _lme_stats: &Value) -> JsonResult<Value> {
    Ok(super::empty_stats())
}
