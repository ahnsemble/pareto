use base64::{engine::general_purpose::STANDARD, Engine};
use serde_json::{json, Value};
use tttg_forge_core::{decode_public_raw, decode_public_raw_with_options, DecodeOptions};

const FIXTURE_ROOT: &str = "/Users/woosung/Desktop/Dev/Woosdom_Brain/01_Domains/System/codex_output/tttg_forge_sprint_b_2026-04-19/geotool_reimplementation/tests/fixtures";

fn encode_lzma_msgpack(value: &Value) -> String {
    let packed = rmp_serde::to_vec(value).unwrap();
    let mut compressed = Vec::new();
    lzma_rs::lzma_compress(&mut packed.as_slice(), &mut compressed).unwrap();
    STANDARD.encode(compressed)
}

fn encode_lzma_bytes(mut bytes: &[u8]) -> String {
    let mut compressed = Vec::new();
    lzma_rs::lzma_compress(&mut bytes, &mut compressed).unwrap();
    STANDARD.encode(compressed)
}

fn load_fixture(name: &str) -> Value {
    let path = std::path::Path::new(FIXTURE_ROOT).join(name);
    serde_json::from_str(&std::fs::read_to_string(path).unwrap()).unwrap()
}

#[test]
fn decode_general_lzma_roundtrip() {
    let raw = encode_lzma_msgpack(&json!({
        "_V": 9,
        "a": {"I": "roundtrip", "$": 42},
        "ignored": true
    }));

    let decoded = decode_public_raw(&raw).unwrap();

    assert_eq!(decoded, json!({"_V": 9, "a": {"I": "roundtrip", "$": 42}}));
}

#[test]
fn decode_public_raw_default_drops_object_null_entries() {
    let raw = encode_lzma_msgpack(&json!({
        "_V": 9,
        "a": {
            "ba": null,
            "bb": 0,
            "items": [null, {"x": null, "y": 2}]
        }
    }));

    let decoded = decode_public_raw(&raw).unwrap();

    assert_eq!(
        decoded,
        json!({"_V": 9, "a": {"bb": 0, "items": [null, {"y": 2}]}})
    );
}

#[test]
fn decode_public_raw_with_options_preserves_object_null_entries() {
    let raw = encode_lzma_msgpack(&json!({
        "_V": 9,
        "a": {
            "ba": null,
            "bb": 0,
            "items": [null, {"x": null, "y": 2}]
        }
    }));

    let decoded = decode_public_raw_with_options(
        &raw,
        DecodeOptions {
            preserve_null_keys: true,
        },
    )
    .unwrap();

    assert_eq!(
        decoded,
        json!({"_V": 9, "a": {"ba": null, "bb": 0, "items": [null, {"x": null, "y": 2}]}})
    );
}

#[test]
fn decode_options_struct_defaults_to_absent_null_policy() {
    let raw = encode_lzma_msgpack(&json!({
        "_V": 9,
        "a": {
            "ba": null,
            "bb": 0,
            "items": [null, {"x": null, "y": 2}]
        }
    }));

    let default_decoded = decode_public_raw_with_options(&raw, DecodeOptions::default()).unwrap();
    let preserved_decoded = decode_public_raw_with_options(
        &raw,
        DecodeOptions {
            preserve_null_keys: true,
        },
    )
    .unwrap();

    assert_eq!(
        default_decoded,
        json!({"_V": 9, "a": {"bb": 0, "items": [null, {"y": 2}]}})
    );
    assert_eq!(preserved_decoded["a"]["ba"], Value::Null);
    assert_eq!(preserved_decoded["a"]["items"][1]["x"], Value::Null);
}

#[test]
fn decode_invalid_base64_reports_decode_error() {
    let error = decode_public_raw("not base64 ***").unwrap_err().to_string();

    assert!(error.contains("base64:"), "{error}");
}

#[test]
fn decode_invalid_lzma_reports_decode_error() {
    let error = decode_public_raw(&STANDARD.encode(b"not lzma"))
        .unwrap_err()
        .to_string();

    assert!(error.contains("lzma:"), "{error}");
}

#[test]
fn decode_invalid_msgpack_reports_decode_error() {
    let raw = encode_lzma_bytes(&[0xc1]);
    let error = decode_public_raw(&raw).unwrap_err().to_string();

    assert!(error.contains("msgpack:"), "{error}");
}

#[test]
fn decode_fixture_payload_matches_compact_json() {
    let cases = load_fixture("public_share_cases.json");
    let raw = cases["wCrs4v"]["raw"].as_str().unwrap();
    let compact = load_fixture("wCrs4v.compact.json");

    let decoded = decode_public_raw(raw).unwrap();

    assert_eq!(decoded["_V"], compact["_V"]);
    assert_eq!(decoded["a"], compact["a"]);
}
