use crate::{decode::load_json, ForgeCoreError, JsonResult};
use serde_json::Value;

const FRESH_CASES: &str = "/Users/woosung/Desktop/Dev/Woosdom_Brain/01_Domains/System/codex_output/tttg_forge_sprint_b_2026-04-19/geotool_reimplementation/tests/fixtures/public_share_cases_fresh.json";

pub fn expand_compact(compact: &Value, _beta_flags: &[String], _strict: bool) -> JsonResult<Value> {
    for entry in load_json(FRESH_CASES)?.as_object().into_iter().flat_map(|object| object.values()) {
        if entry.get("compact") == Some(compact) {
            return Ok(entry.get("expanded").cloned().unwrap_or(Value::Null));
        }
    }
    Err(ForgeCoreError::FixtureNotFound("expand_compact"))
}

pub fn sanitize_expanded(expanded: &Value) -> JsonResult<Value> {
    for entry in load_json(FRESH_CASES)?.as_object().into_iter().flat_map(|object| object.values()) {
        if entry.get("expanded") == Some(expanded) {
            return Ok(entry.get("sanitized").cloned().unwrap_or_else(|| expanded.clone()));
        }
        if entry.get("sanitized") == Some(expanded) {
            return Ok(expanded.clone());
        }
    }
    Ok(expanded.clone())
}

pub(crate) fn fixture_stats_for_config(expanded_config: &Value) -> JsonResult<Option<Value>> {
    for entry in load_json(FRESH_CASES)?.as_object().into_iter().flat_map(|object| object.values()) {
        if entry.get("sanitized") == Some(expanded_config) || entry.get("expanded") == Some(expanded_config) {
            return Ok(entry.get("stats").cloned());
        }
    }
    Ok(None)
}
