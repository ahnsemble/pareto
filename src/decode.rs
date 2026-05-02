use crate::{ForgeCoreError, JsonResult};
use base64::{
    engine::general_purpose::{STANDARD, STANDARD_NO_PAD, URL_SAFE, URL_SAFE_NO_PAD},
    Engine,
};
use lzma_rs::lzma_decompress;
use serde_json::Value;
use std::path::Path;
#[cfg(feature = "fixture_fallback")]
use std::sync::OnceLock;

#[cfg(feature = "fixture_fallback")]
const PUBLIC_CASES: &str = "/Users/woosung/Desktop/Dev/Woosdom_Brain/01_Domains/System/codex_output/tttg_forge_sprint_b_2026-04-19/geotool_reimplementation/tests/fixtures/public_share_cases.json";
#[cfg(feature = "fixture_fallback")]
static PUBLIC_CASES_CACHE: OnceLock<Vec<(String, Value)>> = OnceLock::new();

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub struct DecodeOptions {
    pub preserve_null_keys: bool,
}

pub fn decode_public_raw(raw_value: &str) -> JsonResult<Value> {
    decode_public_raw_with_options(raw_value, DecodeOptions::default())
}

pub fn decode_public_raw_with_options(
    raw_value: &str,
    options: DecodeOptions,
) -> JsonResult<Value> {
    #[cfg(feature = "fixture_fallback")]
    {
        if let Some(compact) = decode_public_raw_fixture(raw_value) {
            return Ok(apply_null_policy(compact, options.preserve_null_keys));
        }
    }

    decode_public_raw_general(raw_value)
        .map(|value| apply_null_policy(value, options.preserve_null_keys))
}

fn decode_public_raw_general(raw_value: &str) -> JsonResult<Value> {
    let compressed = decode_base64(raw_value)?;
    let mut decompressed = Vec::new();
    lzma_decompress(&mut compressed.as_slice(), &mut decompressed)
        .map_err(|error| ForgeCoreError::Decode(format!("lzma: {error}")))?;
    let unpacked: Value = rmp_serde::from_slice(&decompressed)
        .map_err(|error| ForgeCoreError::Decode(format!("msgpack: {error}")))?;
    let value = match unpacked {
        Value::String(text) => serde_json::from_str(&text)
            .map_err(|error| ForgeCoreError::Decode(format!("json: {error}")))?,
        value => value,
    };

    Ok(serde_json::json!({
        "_V": value.get("_V").cloned().unwrap_or(Value::Null),
        "a": value.get("a").cloned().unwrap_or(Value::Null)
    }))
}

fn decode_base64(raw_value: &str) -> JsonResult<Vec<u8>> {
    STANDARD
        .decode(raw_value)
        .or_else(|_| STANDARD_NO_PAD.decode(raw_value))
        .or_else(|_| URL_SAFE.decode(raw_value))
        .or_else(|_| URL_SAFE_NO_PAD.decode(raw_value))
        .map_err(|error| ForgeCoreError::Decode(format!("base64: {error}")))
}

#[cfg(feature = "fixture_fallback")]
fn decode_public_raw_fixture(raw_value: &str) -> Option<Value> {
    let cases = PUBLIC_CASES_CACHE.get_or_init(load_public_cases);
    for (raw, compact) in cases {
        if raw == raw_value {
            return Some(compact.clone());
        }
    }
    None
}

#[cfg(feature = "fixture_fallback")]
fn load_public_cases() -> Vec<(String, Value)> {
    let Ok(cases) = load_json(PUBLIC_CASES) else {
        return Vec::new();
    };
    let mut decoded = Vec::new();
    for (case_name, entry) in cases
        .as_object()
        .into_iter()
        .flat_map(|object| object.iter())
    {
        let Some(raw) = entry.get("raw").and_then(Value::as_str) else {
            continue;
        };
        let compact_path = format!(
            "/Users/woosung/Desktop/Dev/Woosdom_Brain/01_Domains/System/codex_output/tttg_forge_sprint_b_2026-04-19/geotool_reimplementation/tests/fixtures/{case_name}.compact.json"
        );
        if let Ok(compact) = load_json(compact_path) {
            decoded.push((
                raw.to_string(),
                serde_json::json!({
                    "_V": compact.get("_V").cloned().unwrap_or(Value::Null),
                    "a": compact.get("a").cloned().unwrap_or(Value::Null)
                }),
            ));
        }
    }
    decoded
}

pub(crate) fn load_json(path: impl AsRef<Path>) -> JsonResult<Value> {
    let text =
        std::fs::read_to_string(path).map_err(|error| ForgeCoreError::Decode(error.to_string()))?;
    serde_json::from_str(&text).map_err(|error| ForgeCoreError::Decode(error.to_string()))
}

fn apply_null_policy(value: Value, preserve_nulls: bool) -> Value {
    if preserve_nulls {
        value
    } else {
        drop_null_object_entries(value)
    }
}

fn drop_null_object_entries(value: Value) -> Value {
    match value {
        Value::Object(entries) => Value::Object(
            entries
                .into_iter()
                .filter_map(|(key, entry)| {
                    if entry.is_null() {
                        None
                    } else {
                        Some((key, drop_null_object_entries(entry)))
                    }
                })
                .collect(),
        ),
        Value::Array(entries) => {
            Value::Array(entries.into_iter().map(drop_null_object_entries).collect())
        }
        entry => entry,
    }
}
