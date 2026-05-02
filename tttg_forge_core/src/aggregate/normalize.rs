use crate::JsonResult;
use serde_json::Value;

pub fn final_stat_normalization(_expanded_config: &Value, stats: &Value) -> JsonResult<Value> {
    Ok(stats.clone())
}
