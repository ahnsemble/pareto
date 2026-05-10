use serde_json::Value;
use std::collections::{BTreeMap, BTreeSet};
use std::fs;
use std::path::Path;

#[test]
fn frontend_locale_files_have_identical_flat_key_sets() {
    let en = flattened_locale("en.json");
    let ko = flattened_locale("ko.json");

    assert_eq!(en.keys().collect::<BTreeSet<_>>(), ko.keys().collect());
}

#[test]
fn frontend_locale_catalog_has_at_least_fifty_keys() {
    let en = flattened_locale("en.json");
    let ko = flattened_locale("ko.json");

    assert!(en.len() >= 50, "en key count: {}", en.len());
    assert!(ko.len() >= 50, "ko key count: {}", ko.len());
}

#[test]
fn frontend_locale_catalog_covers_required_error_keys() {
    let en = flattened_locale("en.json");

    for key in REQUIRED_ERROR_KEYS {
        assert!(en.contains_key(*key), "missing {key}");
    }
}

#[test]
fn frontend_locale_catalog_covers_required_actions_tooltips_status_and_meta() {
    let en = flattened_locale("en.json");

    for key in REQUIRED_NON_ERROR_KEYS {
        assert!(en.contains_key(*key), "missing {key}");
    }
}

#[test]
fn frontend_locale_values_are_nonempty_strings() {
    for locale in ["en.json", "ko.json"] {
        let flattened = flattened_locale(locale);
        for (key, value) in flattened {
            assert!(!value.trim().is_empty(), "{locale}:{key}");
        }
    }
}

const REQUIRED_ERROR_KEYS: &[&str] = &[
    "error.network",
    "error.timeout",
    "error.parse",
    "error.validation",
    "error.auth",
    "error.quota",
    "error.browserCompat",
    "error.offline",
    "error.wasmInit",
    "error.versionMismatch",
    "error.malformedJson",
    "error.emptyInput",
    "error.inputTooLarge",
    "error.sharedArrayBuffer",
    "error.objectiveNonFinite",
    "error.paretoEmpty",
    "error.storageQuota",
];

const REQUIRED_NON_ERROR_KEYS: &[&str] = &[
    "action.retry",
    "action.cancel",
    "action.share",
    "action.undo",
    "action.redo",
    "action.detail",
    "action.collapse",
    "tooltip.performanceTip",
    "tooltip.versionInfo",
    "tooltip.dataSource",
    "tooltip.privacy",
    "tooltip.analyticsOptin",
    "tooltip.cookieConsent",
    "tooltip.wasmRuntime",
    "tooltip.cacheStatus",
    "tooltip.keyboardMode",
    "tooltip.compareMode",
    "status.processing",
    "status.complete",
    "status.empty",
    "meta.appName",
    "meta.tagline",
    "meta.description",
    "meta.author",
    "meta.version",
];

fn flattened_locale(file_name: &str) -> BTreeMap<String, String> {
    let path = Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("../frontend/messages")
        .join(file_name);
    let text = fs::read_to_string(path).unwrap();
    let value: Value = serde_json::from_str(&text).unwrap();
    let mut flattened = BTreeMap::new();
    flatten_value("", &value, &mut flattened);
    flattened
}

fn flatten_value(prefix: &str, value: &Value, flattened: &mut BTreeMap<String, String>) {
    match value {
        Value::Object(map) => {
            for (key, child) in map {
                let next = if prefix.is_empty() {
                    key.to_string()
                } else {
                    format!("{prefix}.{key}")
                };
                flatten_value(&next, child, flattened);
            }
        }
        Value::String(text) => {
            flattened.insert(prefix.to_string(), text.to_string());
        }
        _ => {}
    }
}
