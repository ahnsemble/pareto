use crate::JsonResult;
use serde_json::{json, Value};

pub fn cooldown_reduction_contribution(_expanded_config: &Value, _skills: &Value) -> JsonResult<Value> {
    Ok(json!({"cooldownReduction": 0.0}))
}
