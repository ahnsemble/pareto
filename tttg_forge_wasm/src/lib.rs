use serde::Serialize;
use serde_json::{json, Value};
use tttg_forge_core::DecodeOptions;
use wasm_bindgen::prelude::*;

pub mod twodeck;
pub mod optimizer;
pub mod sio_state_translator;
pub mod v3_damage;

pub use v3_damage::v3_damage_value;

fn to_value(input: JsValue) -> Value {
    serde_wasm_bindgen::from_value(input).unwrap_or(Value::Null)
}

fn to_js(value: Value) -> JsValue {
    serde_wasm_bindgen::to_value(&value).unwrap_or(JsValue::NULL)
}

fn to_json_js(value: Value) -> JsValue {
    value
        .serialize(&serde_wasm_bindgen::Serializer::json_compatible())
        .unwrap_or(JsValue::NULL)
}

#[cfg_attr(feature = "compat-exports", wasm_bindgen)]
pub fn invoke_export(module_id: u32, export_name: &str, args: JsValue) -> JsValue {
    to_js(json!({
        "moduleId": module_id,
        "exportName": export_name,
        "args": to_value(args)
    }))
}

#[cfg_attr(feature = "compat-exports", wasm_bindgen)]
pub fn bridge_set(values: JsValue) -> JsValue {
    let value = to_value(values);
    to_js(bridge_set_value(&value))
}

#[cfg_attr(feature = "compat-exports", wasm_bindgen)]
pub fn run_full_pipeline(config: JsValue) -> JsValue {
    let config = to_value(config);
    to_json_js(run_full_pipeline_value(&config))
}

#[cfg_attr(feature = "compat-exports", wasm_bindgen)]
pub fn expand_compact_js(
    compact: JsValue,
    data: JsValue,
    beta_flags: JsValue,
    strict: bool,
) -> JsValue {
    let compact = to_value(compact);
    let data = to_value(data);
    let beta_flags = serde_wasm_bindgen::from_value::<Vec<String>>(beta_flags).unwrap_or_default();
    to_json_js(
        tttg_forge_core::expand_in_memory(&compact, &data, &beta_flags, strict)
            .unwrap_or_else(|error| json!({"error": error.to_string()})),
    )
}

#[cfg_attr(feature = "compat-exports", wasm_bindgen)]
pub fn aggregate_in_memory_js(expanded_config: JsValue, data: JsValue) -> JsValue {
    let expanded_config = to_value(expanded_config);
    let data = to_value(data);
    to_json_js(
        tttg_forge_core::aggregate_in_memory(&expanded_config, &data)
            .unwrap_or_else(|error| json!({"error": error.to_string()})),
    )
}

#[cfg_attr(feature = "compat-exports", wasm_bindgen)]
pub fn run_full_pipeline_in_memory(config: JsValue, data: JsValue) -> JsValue {
    let config = to_value(config);
    let data = to_value(data);
    let beta_flags: Vec<String> = Vec::new();
    let expanded = tttg_forge_core::expand_in_memory(&config, &data, &beta_flags, false)
        .unwrap_or_else(|_| config.clone());
    let sanitized = tttg_forge_core::sanitize_expanded_in_memory(&expanded, &data)
        .unwrap_or_else(|_| expanded.clone());
    let stats =
        tttg_forge_core::aggregate_in_memory(&sanitized, &data).unwrap_or_else(|_| json!({}));
    to_json_js(json!({
        "stats": stats,
        "score": stats.get("score").and_then(Value::as_f64).unwrap_or(0.0),
        "damageFactor": stats.get("damageFactor").and_then(Value::as_f64).unwrap_or(0.0)
    }))
}

#[cfg_attr(feature = "compat-exports", wasm_bindgen)]
pub fn coerce_stat_dict(value: JsValue) -> JsValue {
    to_js(tttg_forge_core::coerce_stat_dict(&to_value(value)))
}

#[cfg_attr(feature = "compat-exports", wasm_bindgen)]
pub fn coerce_pool_vector(value: JsValue) -> JsValue {
    to_js(json!(tttg_forge_core::coerce_pool_vector(&to_value(value))))
}

#[cfg(feature = "compat-exports")]
#[wasm_bindgen]
pub fn get_base_stats() -> JsValue {
    to_js(tttg_forge_core::get_base_stats())
}

#[cfg_attr(feature = "compat-exports", wasm_bindgen)]
pub fn merge_stat_dicts(parts: JsValue) -> JsValue {
    let value = to_value(parts);
    to_js(merge_stat_dicts_value(&value))
}

#[wasm_bindgen]
pub fn decode_public_raw(raw_value: &str) -> JsValue {
    to_json_js(
        tttg_forge_core::decode_public_raw_with_options(raw_value, DecodeOptions::default())
            .unwrap_or_else(|_| json!({"error": "decode_failed"})),
    )
}

#[cfg_attr(feature = "compat-exports", wasm_bindgen)]
pub fn decode_public_raw_js(raw_value: &str, preserve_nulls: bool) -> JsValue {
    to_json_js(
        tttg_forge_core::decode_public_raw_with_options(
            raw_value,
            DecodeOptions {
                preserve_null_keys: preserve_nulls,
            },
        )
        .unwrap_or_else(|error| json!({"error": error.to_string()})),
    )
}

#[cfg_attr(feature = "compat-exports", wasm_bindgen)]
pub fn calculate_damage_factor(stats: JsValue, ce_damage_techs: JsValue) -> JsValue {
    match tttg_forge_core::calculate_damage_factor(&to_value(stats), &to_value(ce_damage_techs)) {
        Ok(result) => to_js(json!(result)),
        Err(error) => to_js(json!({"error": error.to_string()})),
    }
}

#[cfg_attr(feature = "compat-exports", wasm_bindgen)]
pub fn calculate_v3_final_damage(player_state: JsValue) -> JsValue {
    to_json_js(v3_damage_value(&to_value(player_state)))
}

#[cfg_attr(feature = "compat-exports", wasm_bindgen)]
pub fn relic_core_optimize_js(player_state: JsValue, constraints: JsValue) -> JsValue {
    to_json_js(optimizer::relic_core_optimize_value(
        &to_value(player_state),
        &to_value(constraints),
    ))
}

#[cfg_attr(feature = "compat-exports", wasm_bindgen)]
pub fn twinborn_auto_assign_js(player_state: JsValue, chip_pool: JsValue) -> JsValue {
    to_json_js(optimizer::twinborn_auto_assign_value(
        &to_value(player_state),
        &to_value(chip_pool),
    ))
}

#[cfg_attr(feature = "compat-exports", wasm_bindgen)]
pub fn branch_bound_run_js(search_space: JsValue) -> JsValue {
    to_json_js(optimizer::branch_bound_run_value(&to_value(search_space)))
}

#[cfg_attr(feature = "compat-exports", wasm_bindgen)]
pub fn beam_search_run_js(search_space: JsValue, beam_width: usize) -> JsValue {
    to_json_js(optimizer::beam_search_run_value(
        &to_value(search_space),
        beam_width,
    ))
}

#[cfg_attr(feature = "compat-exports", wasm_bindgen)]
pub fn pareto_frontier_compute_js(candidates: JsValue, objectives: JsValue) -> JsValue {
    to_json_js(optimizer::pareto_frontier_compute_value(
        &to_value(candidates),
        &to_value(objectives),
    ))
}

#[cfg_attr(feature = "compat-exports", wasm_bindgen)]
pub fn sio_export_to_player_state_patch_js(sio_export: JsValue) -> JsValue {
    to_json_js(sio_state_translator::sio_export_to_player_state_patch_value(
        &to_value(sio_export),
    ))
}

#[cfg(feature = "compat-exports")]
#[wasm_bindgen]
pub fn make_synthetic_search_space(
    slot_count: usize,
    include_baseline: bool,
    tradeoff: bool,
    top_k: usize,
) -> JsValue {
    to_js(json!(tttg_forge_optimizer::make_synthetic_search_space(
        slot_count,
        include_baseline,
        tradeoff,
        top_k
    )))
}

#[cfg_attr(feature = "compat-exports", wasm_bindgen)]
pub fn pareto_frontier_smoke_js(candidates: JsValue) -> JsValue {
    let value = to_value(candidates);
    to_js(pareto_frontier_smoke_value(&value))
}

#[cfg_attr(feature = "compat-exports", wasm_bindgen)]
pub fn pareto_frontier_smoke_wasm(points_json: &str) -> Result<JsValue, JsValue> {
    let candidates =
        serde_json::from_str::<Vec<tttg_forge_optimizer::ParetoSmokeCandidate>>(points_json)
            .map_err(|error| JsValue::from_str(&format!("json: {error}")))?;
    Ok(to_json_js(json!(
        tttg_forge_optimizer::pareto_frontier_smoke(&candidates)
    )))
}

#[wasm_bindgen]
#[cfg(feature = "pareto-objective-wasm")]
pub fn pareto_frontier_smoke_with_constraints_wasm(
    points_json: &str,
    constraints_json: &str,
) -> Result<JsValue, JsValue> {
    let candidates = serde_json::from_str::<Vec<Value>>(points_json)
        .map_err(|error| JsValue::from_str(&format!("json: {error}")))?;
    let constraints = serde_json::from_str::<Value>(constraints_json).unwrap_or(Value::Null);
    Ok(to_json_js(json!(
        tttg_forge_optimizer::pareto_frontier_smoke_with_constraints(&candidates, &constraints)
    )))
}

#[wasm_bindgen]
#[cfg(feature = "main-cli")]
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

fn run_full_pipeline_value(config: &Value) -> Value {
    match run_full_pipeline_stats(config) {
        Ok(stats) => pipeline_response(stats),
        Err(error) => {
            let stats = json!({});
            let mut response = pipeline_response(stats);
            if let Some(object) = response.as_object_mut() {
                object.insert("error".to_string(), json!(error.to_string()));
            }
            response
        }
    }
}

fn run_full_pipeline_stats(config: &Value) -> tttg_forge_core::JsonResult<Value> {
    let compact = if let Some(raw) = config.get("raw").and_then(Value::as_str) {
        tttg_forge_core::decode_public_raw_with_options(raw, DecodeOptions::default())?
    } else if let Some(compact) = config.get("compact") {
        compact.clone()
    } else {
        config.clone()
    };

    if let Some(data) = config.get("data") {
        let beta_flags = beta_flags_from_config(config);
        let strict = config
            .get("strict")
            .and_then(Value::as_bool)
            .unwrap_or(false);
        let expanded = tttg_forge_core::expand_in_memory(&compact, data, &beta_flags, strict)?;
        let sanitized = tttg_forge_core::sanitize_expanded_in_memory(&expanded, data)?;
        return tttg_forge_core::aggregate_in_memory(&sanitized, data);
    }

    tttg_forge_core::aggregate_in_memory(&compact, &json!({"cases": {}}))
}

fn beta_flags_from_config(config: &Value) -> Vec<String> {
    config
        .get("betaFlags")
        .or_else(|| config.get("beta_flags"))
        .and_then(Value::as_array)
        .map(|entries| {
            entries
                .iter()
                .filter_map(Value::as_str)
                .map(str::to_string)
                .collect()
        })
        .unwrap_or_default()
}

fn pipeline_response(stats: Value) -> Value {
    json!({
        "score": stats.get("score").and_then(Value::as_f64).unwrap_or(0.0),
        "damageFactor": stats.get("damageFactor").and_then(Value::as_f64).unwrap_or(0.0),
        "stats": stats
    })
}

fn pareto_frontier_smoke_value(value: &Value) -> Value {
    let candidates =
        serde_json::from_value::<Vec<tttg_forge_optimizer::ParetoSmokeCandidate>>(value.clone())
            .unwrap_or_default();
    json!(tttg_forge_optimizer::pareto_frontier_smoke(&candidates))
}

#[cfg(all(test, feature = "pareto-objective-wasm"))]
fn pareto_frontier_smoke_with_constraints_value(value: &Value, constraints: &Value) -> Value {
    let candidates = value.as_array().cloned().unwrap_or_default();
    json!(tttg_forge_optimizer::pareto_frontier_smoke_with_constraints(&candidates, constraints))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn native_base_stats_export_smoke() {
        assert!(tttg_forge_core::get_base_stats()
            .as_object()
            .unwrap()
            .contains_key("critDamage"));
    }

    #[test]
    fn native_merge_stat_dicts_export_smoke() {
        let input = json!([{"atk": 1.0}, {"atk": 2.0}]);
        assert_eq!(merge_stat_dicts_value(&input)["atk"], json!(3.0));
        assert_eq!(bridge_set_value(&input)["atk"], json!(3.0));
    }

    #[test]
    fn native_pareto_frontier_smoke_export_smoke() {
        let input = json!([
            {"label": "score-max", "score": 120.0, "damage": 70.0},
            {"label": "balanced", "score": 100.0, "damage": 100.0},
            {"label": "dominated", "score": 90.0, "damage": 90.0}
        ]);
        assert_eq!(pareto_frontier_smoke_value(&input), json!([0, 1]));
    }

    #[test]
    #[cfg(feature = "pareto-objective-wasm")]
    fn native_pareto_frontier_constraints_preserve_lme1_specialist() {
        let input = json!([
            {"label": "normal", "score": 130.0, "damageFactor": 100.0, "lme1Damage": 3.0},
            {"label": "lme1", "score": 100.0, "damageFactor": 90.0, "lme1Damage": 30.0}
        ]);
        let constraints = json!({"objectives": ["normal", "lme1"]});
        assert_eq!(
            pareto_frontier_smoke_with_constraints_value(&input, &constraints),
            json!([0, 1])
        );
    }

    #[test]
    fn native_run_full_pipeline_stat_parts_uses_general_path() {
        let input = json!({
            "statParts": [
                {"score": 3.0, "damageFactor": 1.0},
                {"score": 4.0, "damageFactor": 2.5, "text": "zero"},
                ["ignored"]
            ]
        });

        let actual = run_full_pipeline_value(&input);

        assert_eq!(actual["score"].as_f64().unwrap(), 7.0);
        assert_eq!(actual["damageFactor"].as_f64().unwrap(), 3.5);
        assert_eq!(actual["stats"]["text"].as_f64().unwrap(), 0.0);
    }

    #[test]
    fn native_beta_flags_accepts_camel_case_config() {
        let flags = beta_flags_from_config(&json!({"betaFlags": ["a", "b"]}));

        assert_eq!(flags, vec!["a".to_string(), "b".to_string()]);
    }

    #[test]
    fn native_beta_flags_accepts_snake_case_config() {
        let flags = beta_flags_from_config(&json!({"beta_flags": ["x"]}));

        assert_eq!(flags, vec!["x".to_string()]);
    }

    #[test]
    fn native_bridge_set_non_array_returns_empty_object() {
        assert_eq!(bridge_set_value(&json!({"not": "array"})), json!({}));
    }

    #[test]
    fn native_merge_stat_dicts_non_array_returns_empty_object() {
        assert_eq!(merge_stat_dicts_value(&json!({"not": "array"})), json!({}));
    }

    #[test]
    fn native_pareto_frontier_smoke_non_array_returns_empty_frontier() {
        assert_eq!(
            pareto_frontier_smoke_value(&json!({"not": "array"})),
            json!([])
        );
    }

    #[test]
    fn native_run_full_pipeline_invalid_raw_reports_error_payload() {
        let actual = run_full_pipeline_value(&json!({"raw": "not-valid"}));

        assert_eq!(actual["score"], json!(0.0));
        assert!(actual["error"].as_str().unwrap().contains("decode"));
    }

    #[test]
    fn native_run_full_pipeline_empty_config_is_zero_payload() {
        let actual = run_full_pipeline_value(&json!({}));

        assert_eq!(actual["score"], json!(0.0));
        assert_eq!(actual["damageFactor"], json!(0.0));
        assert_eq!(actual["stats"], json!({}));
    }
}
