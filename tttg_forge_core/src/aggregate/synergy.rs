use crate::JsonResult;
use serde_json::Value;

pub fn base_synergy_contribution(_expanded_config: &Value) -> JsonResult<Value> {
    Ok(super::empty_stats())
}
