use serde_json::json;
use tttg_forge_optimizer::{
    analytics_event_names, analytics_spec_json, friendly_error_message, safe_parse_json,
    wasm_init_guard, AnalyticsEvent, AnalyticsEventPayload, AnalyticsEventType,
    ErrorLocale, ProductionErrorCode,
};

#[test]
fn safe_parse_json_rejects_malformed_json_without_panic() {
    let err = safe_parse_json("{not json", 1024).unwrap_err();

    assert_eq!(err.code(), ProductionErrorCode::MalformedJson);
}

#[test]
fn safe_parse_json_rejects_empty_input_without_panic() {
    let err = safe_parse_json("   ", 1024).unwrap_err();

    assert_eq!(err.code(), ProductionErrorCode::EmptyInput);
}

#[test]
fn safe_parse_json_rejects_large_input_without_panic() {
    let err = safe_parse_json(r#"{"ok":true}"#, 4).unwrap_err();

    assert_eq!(err.code(), ProductionErrorCode::InputTooLarge);
}

#[test]
fn safe_parse_json_accepts_valid_json() {
    let parsed = safe_parse_json(r#"{"ok":true}"#, 1024).unwrap();

    assert_eq!(parsed, json!({"ok": true}));
}

#[test]
fn wasm_init_guard_reports_initialization_failure() {
    let err = wasm_init_guard(false).unwrap_err();

    assert_eq!(err.code(), ProductionErrorCode::WasmInitFailed);
}

#[test]
fn wasm_init_guard_accepts_initialized_runtime() {
    assert!(wasm_init_guard(true).is_ok());
}

#[test]
fn production_error_serializes_code_and_i18n_key() {
    let err = safe_parse_json("", 1024).unwrap_err();
    let value = serde_json::to_value(err).unwrap();

    assert_eq!(value["code"], json!("empty_input"));
    assert_eq!(value["i18nKey"], json!("error.empty_input"));
}

#[test]
fn i18n_has_ten_english_error_messages() {
    for key in expected_error_keys() {
        assert!(!friendly_error_message(ErrorLocale::En, key).is_empty(), "{key}");
    }
}

#[test]
fn i18n_has_ten_korean_error_messages() {
    for key in expected_error_keys() {
        assert!(!friendly_error_message(ErrorLocale::Ko, key).is_empty(), "{key}");
    }
}

#[test]
fn i18n_unknown_key_uses_generic_message() {
    assert_eq!(
        friendly_error_message(ErrorLocale::En, "error.unknown_key"),
        friendly_error_message(ErrorLocale::En, "error.unknown")
    );
}

#[test]
fn analytics_event_names_cover_four_events() {
    assert_eq!(
        analytics_event_names(),
        vec!["optimize_run", "share_url", "build_diff_view", "heatmap_view"]
    );
}

#[test]
fn analytics_optimize_run_serializes_without_user_identifier() {
    let event = AnalyticsEvent::new(
        AnalyticsEventType::OptimizeRun,
        AnalyticsEventPayload::optimize_run(128, 10, 42),
    );
    let value = serde_json::to_value(event).unwrap();

    assert_eq!(value["eventType"], json!("optimize_run"));
    assert!(value.get("userId").is_none());
}

#[test]
fn analytics_share_url_serializes_without_raw_payload() {
    let event = AnalyticsEvent::new(
        AnalyticsEventType::ShareUrl,
        AnalyticsEventPayload::share_url("frontier"),
    );
    let value = serde_json::to_value(event).unwrap();

    assert_eq!(value["payload"]["surface"], json!("frontier"));
    assert!(value["payload"].get("raw").is_none());
}

#[test]
fn analytics_build_diff_view_serializes_changed_count() {
    let event = AnalyticsEvent::new(
        AnalyticsEventType::BuildDiffView,
        AnalyticsEventPayload::build_diff_view(7),
    );
    let value = serde_json::to_value(event).unwrap();

    assert_eq!(value["payload"]["changedCount"], json!(7));
}

#[test]
fn analytics_heatmap_view_serializes_cell_count() {
    let event = AnalyticsEvent::new(
        AnalyticsEventType::HeatmapView,
        AnalyticsEventPayload::heatmap_view(12),
    );
    let value = serde_json::to_value(event).unwrap();

    assert_eq!(value["payload"]["cellCount"], json!(12));
}

#[test]
fn analytics_spec_declares_opt_out() {
    let spec = analytics_spec_json();

    assert_eq!(spec["privacy"]["optOut"], json!(true));
}

#[test]
fn analytics_spec_declares_no_pii() {
    let spec = analytics_spec_json();

    assert_eq!(spec["privacy"]["pii"], json!(false));
}

#[test]
fn analytics_payload_rejects_negative_counts_by_clamping() {
    let payload = AnalyticsEventPayload::build_diff_view(-1);
    let value = serde_json::to_value(payload).unwrap();

    assert_eq!(value["changedCount"], json!(0));
}

#[test]
fn analytics_payload_uses_millisecond_duration_field() {
    let payload = AnalyticsEventPayload::optimize_run(16, 5, 123);
    let value = serde_json::to_value(payload).unwrap();

    assert_eq!(value["durationMs"], json!(123));
}

#[test]
fn production_error_code_maps_to_stable_i18n_key() {
    assert_eq!(
        ProductionErrorCode::InputTooLarge.i18n_key(),
        "error.input_too_large"
    );
}

#[test]
fn production_error_code_maps_to_serializable_code() {
    assert_eq!(ProductionErrorCode::WasmInitFailed.as_str(), "wasm_init_failed");
}

#[test]
fn safe_parse_json_allows_exact_limit_size() {
    let parsed = safe_parse_json("{}", 2).unwrap();

    assert_eq!(parsed, json!({}));
}

#[test]
fn safe_parse_json_rejects_non_object_but_valid_json_as_invalid_input() {
    let err = safe_parse_json("[]", 1024).unwrap_err();

    assert_eq!(err.code(), ProductionErrorCode::InvalidInput);
}

#[test]
fn i18n_korean_and_english_have_same_key_count() {
    let en_count = expected_error_keys()
        .iter()
        .filter(|key| !friendly_error_message(ErrorLocale::En, key).is_empty())
        .count();
    let ko_count = expected_error_keys()
        .iter()
        .filter(|key| !friendly_error_message(ErrorLocale::Ko, key).is_empty())
        .count();

    assert_eq!(en_count, ko_count);
}

#[test]
fn analytics_event_type_serializes_as_snake_case() {
    assert_eq!(
        serde_json::to_value(AnalyticsEventType::HeatmapView).unwrap(),
        json!("heatmap_view")
    );
}

#[test]
fn analytics_event_payload_optimize_run_clamps_counts() {
    let payload = AnalyticsEventPayload::optimize_run(-1, -2, 0);
    let value = serde_json::to_value(payload).unwrap();

    assert_eq!(value["candidateCount"], json!(0));
    assert_eq!(value["frontierCount"], json!(0));
}

#[test]
fn analytics_spec_lists_only_allowed_events() {
    let spec = analytics_spec_json();

    assert_eq!(
        spec["events"].as_array().unwrap().len(),
        analytics_event_names().len()
    );
}

#[test]
fn production_error_display_is_user_safe() {
    let err = safe_parse_json("{", 1024).unwrap_err();

    assert!(err.to_string().contains("malformed_json"));
}

#[test]
fn i18n_locales_use_different_copy_for_empty_input() {
    assert_ne!(
        friendly_error_message(ErrorLocale::En, "error.empty_input"),
        friendly_error_message(ErrorLocale::Ko, "error.empty_input")
    );
}

#[test]
fn analytics_event_default_opt_out_field_is_absent_from_event() {
    let event = AnalyticsEvent::new(
        AnalyticsEventType::HeatmapView,
        AnalyticsEventPayload::heatmap_view(1),
    );
    let value = serde_json::to_value(event).unwrap();

    assert!(value.get("optOut").is_none());
}

fn expected_error_keys() -> Vec<&'static str> {
    vec![
        "error.malformed_json",
        "error.empty_input",
        "error.input_too_large",
        "error.wasm_init_failed",
        "error.invalid_input",
        "error.objective_unsupported",
        "error.search_space_empty",
        "error.timeout",
        "error.network",
        "error.unknown",
    ]
}
