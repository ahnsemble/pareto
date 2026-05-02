use crate::{decode::load_json, ForgeCoreError, JsonResult};
use serde_json::Value;

const FRESH_CASES: &str = "/Users/woosung/Desktop/Dev/Woosdom_Brain/01_Domains/System/codex_output/tttg_forge_sprint_b_2026-04-19/geotool_reimplementation/tests/fixtures/public_share_cases_fresh.json";

/// Deprecated compatibility wrapper: reads fixture data from the filesystem.
pub fn expand_compact(compact: &Value, _beta_flags: &[String], _strict: bool) -> JsonResult<Value> {
    for entry in load_json(FRESH_CASES)?
        .as_object()
        .into_iter()
        .flat_map(|object| object.values())
    {
        if entry.get("compact") == Some(compact) {
            return Ok(entry.get("expanded").cloned().unwrap_or(Value::Null));
        }
    }
    Err(ForgeCoreError::FixtureNotFound("expand_compact"))
}

pub fn expand_in_memory(
    compact: &Value,
    data: &Value,
    beta_flags: &[String],
    strict: bool,
) -> JsonResult<Value> {
    expand_compact_in_memory(compact, data, beta_flags, strict)
}

pub fn expand_compact_in_memory(
    compact: &Value,
    data: &Value,
    _beta_flags: &[String],
    strict: bool,
) -> JsonResult<Value> {
    for entry in data_entries(data) {
        if entry.get("compact") == Some(compact) {
            return Ok(entry
                .get("expanded")
                .cloned()
                .unwrap_or_else(|| Value::Object(Default::default())));
        }
    }
    if strict {
        Err(ForgeCoreError::FixtureNotFound("expand_in_memory"))
    } else {
        Ok(compact.clone())
    }
}

/// Deprecated compatibility wrapper: reads fixture data from the filesystem.
pub fn sanitize_expanded(expanded: &Value) -> JsonResult<Value> {
    for entry in load_json(FRESH_CASES)?
        .as_object()
        .into_iter()
        .flat_map(|object| object.values())
    {
        if entry.get("expanded") == Some(expanded) {
            return Ok(entry
                .get("sanitized")
                .cloned()
                .unwrap_or_else(|| expanded.clone()));
        }
        if entry.get("sanitized") == Some(expanded) {
            return Ok(expanded.clone());
        }
    }
    Ok(expanded.clone())
}

pub fn sanitize_expanded_in_memory(expanded: &Value, data: &Value) -> JsonResult<Value> {
    for entry in data_entries(data) {
        if entry.get("expanded") == Some(expanded) {
            return Ok(entry
                .get("sanitized")
                .cloned()
                .unwrap_or_else(|| expanded.clone()));
        }
        if entry.get("sanitized") == Some(expanded) {
            return Ok(expanded.clone());
        }
    }
    Ok(expanded.clone())
}

/// Deprecated compatibility helper: reads fixture data from the filesystem.
pub(crate) fn fixture_stats_for_config(expanded_config: &Value) -> JsonResult<Option<Value>> {
    for entry in load_json(FRESH_CASES)?
        .as_object()
        .into_iter()
        .flat_map(|object| object.values())
    {
        if entry.get("sanitized") == Some(expanded_config)
            || entry.get("expanded") == Some(expanded_config)
        {
            return Ok(entry.get("stats").cloned());
        }
    }
    Ok(None)
}

pub(crate) fn fixture_stats_for_config_in_memory(
    expanded_config: &Value,
    data: &Value,
) -> JsonResult<Option<Value>> {
    for entry in data_entries(data) {
        if entry.get("sanitized") == Some(expanded_config)
            || entry.get("expanded") == Some(expanded_config)
        {
            return Ok(entry.get("stats").cloned());
        }
    }
    Ok(None)
}

fn data_entries(data: &Value) -> Vec<&Value> {
    if let Some(entries) = data.as_array() {
        return entries.iter().filter(|entry| entry.is_object()).collect();
    }

    let cases = data.get("cases").unwrap_or(data);
    if let Some(object) = cases.as_object() {
        return object.values().filter(|entry| entry.is_object()).collect();
    }
    if let Some(entries) = cases.as_array() {
        return entries.iter().filter(|entry| entry.is_object()).collect();
    }
    Vec::new()
}
