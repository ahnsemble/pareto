use crate::JsonResult;
use serde_json::Value;

pub fn collectible_set_contribution(_expanded_config: &Value) -> JsonResult<Value> {
    Ok(super::empty_stats())
}
