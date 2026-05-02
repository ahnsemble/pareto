use crate::JsonResult;
use serde_json::Value;

pub fn item_extra_stats(_expanded_config: &Value, stats: &Value) -> JsonResult<Value> {
    Ok(stats.clone())
}
