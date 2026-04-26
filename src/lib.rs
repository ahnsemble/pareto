use serde_json::{json, Value};
use wasm_bindgen::prelude::*;

fn to_value(input: JsValue) -> Value {
    serde_wasm_bindgen::from_value(input).unwrap_or(Value::Null)
}

fn to_js(value: Value) -> JsValue {
    serde_wasm_bindgen::to_value(&value).unwrap_or(JsValue::NULL)
}

#[wasm_bindgen]
pub fn invoke_export(module_id: u32, export_name: &str, args: JsValue) -> JsValue {
    to_js(json!({
        "moduleId": module_id,
        "exportName": export_name,
        "args": to_value(args)
    }))
}

#[wasm_bindgen]
pub fn bridge_set(values: JsValue) -> JsValue {
    let value = to_value(values);
    to_js(bridge_set_value(&value))
}

#[wasm_bindgen]
pub fn run_full_pipeline(config: JsValue) -> JsValue {
    let config = to_value(config);
    let stats = tttg_forge_core::aggregate_all(&config).unwrap_or_else(|_| json!({}));
    to_js(json!({
        "stats": stats,
        "score": stats.get("score").and_then(Value::as_f64).unwrap_or(0.0),
        "damageFactor": stats.get("damageFactor").and_then(Value::as_f64).unwrap_or(0.0)
    }))
}

#[wasm_bindgen]
pub fn coerce_stat_dict(value: JsValue) -> JsValue {
    to_js(tttg_forge_core::coerce_stat_dict(&to_value(value)))
}

#[wasm_bindgen]
pub fn coerce_pool_vector(value: JsValue) -> JsValue {
    to_js(json!(tttg_forge_core::coerce_pool_vector(&to_value(value))))
}

#[wasm_bindgen]
pub fn get_base_stats() -> JsValue {
    to_js(tttg_forge_core::get_base_stats())
}

#[wasm_bindgen]
pub fn merge_stat_dicts(parts: JsValue) -> JsValue {
    let value = to_value(parts);
    to_js(merge_stat_dicts_value(&value))
}

#[wasm_bindgen]
pub fn decode_public_raw(raw_value: &str) -> JsValue {
    to_js(tttg_forge_core::decode_public_raw(raw_value).unwrap_or_else(|error| json!({"error": error.to_string()})))
}

#[wasm_bindgen]
pub fn calculate_damage_factor(stats: JsValue, ce_damage_techs: JsValue) -> JsValue {
    match tttg_forge_core::calculate_damage_factor(&to_value(stats), &to_value(ce_damage_techs)) {
        Ok(result) => to_js(json!(result)),
        Err(error) => to_js(json!({"error": error.to_string()})),
    }
}

#[wasm_bindgen]
pub fn make_synthetic_search_space(slot_count: usize, include_baseline: bool, tradeoff: bool, top_k: usize) -> JsValue {
    to_js(json!(tttg_forge_optimizer::make_synthetic_search_space(
        slot_count,
        include_baseline,
        tradeoff,
        top_k
    )))
}

#[wasm_bindgen]
pub fn main_cli() -> Result<(), JsValue> {
    Ok(())
}

fn bridge_set_value(value: &Value) -> Value {
    let parts = value.as_array().cloned().unwrap_or_default();
    tttg_forge_core::bridge_set(&parts)
}

fn merge_stat_dicts_value(value: &Value) -> Value {
    let parts = value.as_array().cloned().unwrap_or_default();
    tttg_forge_core::merge_stat_dicts(&parts)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn native_base_stats_export_smoke() {
        assert!(tttg_forge_core::get_base_stats().as_object().unwrap().contains_key("critDamage"));
    }

    #[test]
    fn native_merge_stat_dicts_export_smoke() {
        let input = json!([{"atk": 1.0}, {"atk": 2.0}]);
        assert_eq!(merge_stat_dicts_value(&input)["atk"], json!(3.0));
        assert_eq!(bridge_set_value(&input)["atk"], json!(3.0));
    }
}
