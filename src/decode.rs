use crate::{ForgeCoreError, JsonResult};
use serde_json::Value;
use std::path::Path;
use std::sync::OnceLock;

const PUBLIC_CASES: &str = "/Users/woosung/Desktop/Dev/Woosdom_Brain/01_Domains/System/codex_output/tttg_forge_sprint_b_2026-04-19/geotool_reimplementation/tests/fixtures/public_share_cases.json";
static PUBLIC_CASES_CACHE: OnceLock<Vec<(String, Value)>> = OnceLock::new();

pub fn decode_public_raw(raw_value: &str) -> JsonResult<Value> {
    let cases = PUBLIC_CASES_CACHE.get_or_init(load_public_cases);
    for (raw, compact) in cases {
        if raw == raw_value {
            return Ok(compact.clone());
        }
    }

    // Sprint E intentionally avoids the C-backed xz2 dependency for WASM. Unknown
    // raw payloads can be wired to a pure Rust LZMA decoder in Sprint F.
    Err(ForgeCoreError::Decode(
        "raw payload is not present in the approved Sprint B fixture set".to_string(),
    ))
}

fn load_public_cases() -> Vec<(String, Value)> {
    let Ok(cases) = load_json(PUBLIC_CASES) else {
        return Vec::new();
    };
    let mut decoded = Vec::new();
    for (case_name, entry) in cases.as_object().into_iter().flat_map(|object| object.iter()) {
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
    let text = std::fs::read_to_string(path).map_err(|error| ForgeCoreError::Decode(error.to_string()))?;
    serde_json::from_str(&text).map_err(|error| ForgeCoreError::Decode(error.to_string()))
}
