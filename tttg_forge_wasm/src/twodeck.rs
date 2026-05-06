use serde_json::Value;
use tttg_forge_optimizer::{
    pareto_twodeck_compute_with_top_k, OptimizationResult, DEFAULT_TWODECK_TOP_K,
};
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn pareto_twodeck_compute_wasm(
    deck_a_json: &str,
    deck_b_json: &str,
    constraints_json: &str,
) -> Result<JsValue, JsValue> {
    let deck_a: Vec<OptimizationResult> = serde_json::from_str(deck_a_json)
        .map_err(|e| JsValue::from_str(&format!("deck_a parse error: {e}")))?;
    let deck_b: Vec<OptimizationResult> = serde_json::from_str(deck_b_json)
        .map_err(|e| JsValue::from_str(&format!("deck_b parse error: {e}")))?;
    let top_k = top_k_from_constraints_json(constraints_json);

    let result = pareto_twodeck_compute_with_top_k(&deck_a, &deck_b, top_k);

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

fn top_k_from_constraints_json(constraints_json: &str) -> usize {
    let bytes = constraints_json.as_bytes();
    find_top_k(bytes, br#""topK""#)
        .or_else(|| find_top_k(bytes, br#""top_k""#))
        .unwrap_or(DEFAULT_TWODECK_TOP_K)
}

fn find_top_k(bytes: &[u8], key: &[u8]) -> Option<usize> {
    let mut offset = bytes.windows(key.len()).position(|window| window == key)? + key.len();
    while offset < bytes.len() && bytes[offset] != b':' {
        offset += 1;
    }
    offset += 1;
    let mut value = 0usize;
    let mut has_digit = false;
    while offset < bytes.len() {
        let byte = bytes[offset];
        if byte.is_ascii_digit() {
            value = value
                .saturating_mul(10)
                .saturating_add((byte - b'0') as usize);
            has_digit = true;
        } else if has_digit {
            break;
        }
        offset += 1;
    }
    has_digit.then(|| value.max(1))
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
        let r = pareto_twodeck_compute_with_top_k(&deck_a, &deck_b, DEFAULT_TWODECK_TOP_K);
        assert_eq!(r.deck_a_frontier.len(), 1);
        assert_eq!(r.deck_b_frontier.len(), 1);
    }

    #[test]
    fn twodeck_constraints_accept_camel_and_snake_top_k() {
        assert_eq!(top_k_from_constraints_json(r#"{"topK":2}"#), 2);
        assert_eq!(top_k_from_constraints_json(r#"{"top_k":3}"#), 3);
        assert_eq!(top_k_from_constraints_json(r#"{"topK":0}"#), 1);
        assert_eq!(
            top_k_from_constraints_json("{not json"),
            DEFAULT_TWODECK_TOP_K
        );
    }
}
