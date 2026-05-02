use serde_json::{json, Value};
use tttg_forge_wasm::{pareto_frontier_smoke_wasm, run_full_pipeline};
use wasm_bindgen::JsValue;
use wasm_bindgen_test::*;

wasm_bindgen_test_configure!(run_in_browser);

const RAW_ALPHA: &str = "XQAAgAD__________wBdnsBF8sYQ-xiesOQ3JDtSTee8I9I6LS9uCHC8yA7XX_7-oAA";

fn to_js(value: Value) -> JsValue {
    serde_wasm_bindgen::to_value(&value).unwrap()
}

fn from_js(value: JsValue) -> Value {
    serde_wasm_bindgen::from_value(value).unwrap()
}

fn assert_number(value: &Value, path: &[&str], expected: f64) {
    let mut current = value;
    for key in path {
        current = &current[*key];
    }
    let actual = current.as_f64().unwrap();
    assert!(
        (actual - expected).abs() < f64::EPSILON,
        "{path:?}: {actual} != {expected}"
    );
}

#[wasm_bindgen_test]
fn run_full_pipeline_decodes_raw_and_uses_in_memory_data() {
    let input = to_js(json!({
        "raw": RAW_ALPHA,
        "data": {
            "cases": {
                "alpha": {
                    "compact": {"_V": 9, "a": {"id": "alpha"}},
                    "expanded": {"id": "alpha", "expanded": true},
                    "sanitized": {"id": "alpha", "expanded": true, "sanitized": true},
                    "stats": {"score": 10.0, "damageFactor": 2.0}
                }
            }
        }
    }));

    let actual = from_js(run_full_pipeline(input));

    assert_number(&actual, &["score"], 10.0);
    assert_number(&actual, &["damageFactor"], 2.0);
    assert_number(&actual, &["stats", "score"], 10.0);
    assert_number(&actual, &["stats", "damageFactor"], 2.0);
}

#[wasm_bindgen_test]
fn run_full_pipeline_aggregates_stat_parts_without_fixture_fallback() {
    let input = to_js(json!({
        "statParts": [
            {"score": 3.0, "damageFactor": 1.0},
            {"score": 4.0, "damageFactor": 2.5, "text": "zero"},
            ["ignored"]
        ]
    }));

    let actual = from_js(run_full_pipeline(input));

    assert_number(&actual, &["score"], 7.0);
    assert_number(&actual, &["damageFactor"], 3.5);
    assert_number(&actual, &["stats", "score"], 7.0);
    assert_number(&actual, &["stats", "damageFactor"], 3.5);
    assert_number(&actual, &["stats", "text"], 0.0);
}

#[wasm_bindgen_test]
fn pareto_frontier_smoke_wasm_valid_json_returns_frontier() {
    let points_json = r#"[
        {"label":"score-max","score":120.0,"damage":70.0},
        {"label":"balanced","score":100.0,"damage":100.0},
        {"label":"dominated","score":90.0,"damage":90.0}
    ]"#;

    let actual = from_js(pareto_frontier_smoke_wasm(points_json).unwrap());

    assert_eq!(actual, json!([0, 1]));
}

#[wasm_bindgen_test]
fn pareto_frontier_smoke_wasm_invalid_json_returns_js_error() {
    let error = pareto_frontier_smoke_wasm("{not json").unwrap_err();

    assert!(error.as_string().unwrap().contains("json:"));
}

#[wasm_bindgen_test]
fn browser_fixture_seed_manifest_preserves_sprint_g3_inventory() {
    let manifest: Value =
        serde_json::from_str(include_str!("browser_fixtures/manifest.json")).unwrap();
    let fixtures = manifest["fixtures"].as_array().unwrap();
    let categories = manifest["categories"].as_array().unwrap();

    assert_eq!(manifest["fixtureCount"], json!(60));
    assert!(fixtures.len() >= 60);
    assert!(categories
        .iter()
        .any(|category| category == "run_full_pipeline"));
}
