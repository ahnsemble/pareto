use serde_json::Value;
use tttg_forge_optimizer::{pareto_twodeck_compute, OptimizationResult};
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn pareto_twodeck_compute_wasm(
    deck_a_json: &str,
    deck_b_json: &str,
    _constraints_json: &str,
) -> Result<JsValue, JsValue> {
    let deck_a: Vec<OptimizationResult> = serde_json::from_str(deck_a_json)
        .map_err(|e| JsValue::from_str(&format!("deck_a parse error: {e}")))?;
    let deck_b: Vec<OptimizationResult> = serde_json::from_str(deck_b_json)
        .map_err(|e| JsValue::from_str(&format!("deck_b parse error: {e}")))?;

    let result = pareto_twodeck_compute(&deck_a, &deck_b);

    let value = serde_json::to_value(&result)
        .map_err(|e| JsValue::from_str(&format!("serialize error: {e}")))?;
    serialize_for_js(value)
}

fn serialize_for_js(value: Value) -> Result<JsValue, JsValue> {
    use serde::Serialize;
    value
        .serialize(&serde_wasm_bindgen::Serializer::json_compatible())
        .map_err(|e| JsValue::from_str(&format!("js serialize error: {e}")))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn twodeck_native_smoke() {
        let a = r#"[{"label":"a","score":1.0,"damageFactor":1.0,"build":{}}]"#;
        let b = r#"[{"label":"b","score":2.0,"damageFactor":2.0,"build":{}}]"#;
        let deck_a: Vec<OptimizationResult> = serde_json::from_str(a).unwrap();
        let deck_b: Vec<OptimizationResult> = serde_json::from_str(b).unwrap();
        let r = pareto_twodeck_compute(&deck_a, &deck_b);
        assert_eq!(r.deck_a_frontier.len(), 1);
        assert_eq!(r.deck_b_frontier.len(), 1);
    }
}
