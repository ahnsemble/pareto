use serde_json::json;
use tttg_forge_optimizer::{
    analytics_event_names, analytics_spec_json, browser_compat_guard, friendly_error_message,
    memory_budget_guard, objective_score_guard, offline_cache_fallback,
    pareto_frontier_result_guard, safe_parse_json, schema_migration_summary,
    shared_array_buffer_guard, storage_quota_guard, wasm_init_guard, worker_concurrency_guard,
    AnalyticsEvent, AnalyticsEventPayload, AnalyticsEventType, BrowserRuntimeCapabilities,
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
        assert!(
            !friendly_error_message(ErrorLocale::En, key).is_empty(),
            "{key}"
        );
    }
}

#[test]
fn i18n_has_ten_korean_error_messages() {
    for key in expected_error_keys() {
        assert!(
            !friendly_error_message(ErrorLocale::Ko, key).is_empty(),
            "{key}"
        );
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
        vec![
            "optimize_run",
            "share_url",
            "build_diff_view",
            "heatmap_view"
        ]
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
    assert_eq!(
        ProductionErrorCode::WasmInitFailed.as_str(),
        "wasm_init_failed"
    );
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

#[test]
fn edge_schema_migration_summarizes_v17_to_v18_breaking_changes() {
    let summary = schema_migration_summary(
        "v17.1",
        "v18.0",
        &["relic_tier"],
        &["legacy_attack"],
        &[("atk", "attack")],
    )
    .unwrap();

    assert_eq!(summary.added_fields, 1);
    assert_eq!(summary.removed_fields, 1);
    assert_eq!(summary.renamed_fields, 1);
    assert!(summary.breaking_change);
}

#[test]
fn edge_browser_compat_rejects_lockdown_runtime_without_workers() {
    let err = browser_compat_guard(&BrowserRuntimeCapabilities {
        webassembly: true,
        web_workers: false,
        local_storage: true,
    })
    .unwrap_err();

    assert_eq!(err.code(), ProductionErrorCode::BrowserCompat);
}

#[test]
fn edge_offline_mode_uses_cached_json_when_network_fetch_fails() {
    let cached = offline_cache_fallback(false, Some(r#"{"cached":true}"#), 1024).unwrap();

    assert_eq!(cached, json!({"cached": true}));
}

#[test]
fn edge_offline_mode_reports_cache_miss_without_cached_payload() {
    let err = offline_cache_fallback(false, None, 1024).unwrap_err();

    assert_eq!(err.code(), ProductionErrorCode::OfflineCacheMiss);
}

#[test]
fn edge_shared_array_buffer_guard_reports_missing_coop_coep_support() {
    let err = shared_array_buffer_guard(false).unwrap_err();

    assert_eq!(
        err.code(),
        ProductionErrorCode::SharedArrayBufferUnsupported
    );
}

#[test]
fn edge_memory_budget_guard_rejects_hundred_mb_search_space() {
    let err = memory_budget_guard(101 * 1024 * 1024, 100 * 1024 * 1024).unwrap_err();

    assert_eq!(err.code(), ProductionErrorCode::MemoryLimitExceeded);
}

#[test]
fn edge_worker_concurrency_guard_rejects_parallel_race_window() {
    let err = worker_concurrency_guard(2, 2).unwrap_err();

    assert_eq!(err.code(), ProductionErrorCode::WorkerRace);
}

#[test]
fn edge_fetch_status_guard_distinguishes_401_403_500_branches() {
    assert_eq!(
        tttg_forge_optimizer::fetch_status_guard(401)
            .unwrap_err()
            .code(),
        ProductionErrorCode::FetchUnauthorized
    );
    assert_eq!(
        tttg_forge_optimizer::fetch_status_guard(403)
            .unwrap_err()
            .code(),
        ProductionErrorCode::FetchForbidden
    );
    assert_eq!(
        tttg_forge_optimizer::fetch_status_guard(500)
            .unwrap_err()
            .code(),
        ProductionErrorCode::FetchServerError
    );
}

#[test]
fn edge_objective_score_guard_rejects_nan_and_infinity() {
    assert_eq!(
        objective_score_guard(f64::NAN).unwrap_err().code(),
        ProductionErrorCode::ObjectiveNonFinite
    );
    assert_eq!(
        objective_score_guard(f64::INFINITY).unwrap_err().code(),
        ProductionErrorCode::ObjectiveNonFinite
    );
}

#[test]
fn edge_pareto_frontier_guard_reports_empty_result() {
    let err = pareto_frontier_result_guard(0).unwrap_err();

    assert_eq!(err.code(), ProductionErrorCode::ParetoFrontierEmpty);
}

#[test]
fn edge_storage_quota_guard_reports_private_mode_quota_failure() {
    let err = storage_quota_guard(1024, 2048).unwrap_err();

    assert_eq!(err.code(), ProductionErrorCode::StorageQuotaExceeded);
}

#[test]
fn edge_catalog_covers_all_fifteen_production_scenarios() {
    let scenarios = tttg_forge_optimizer::production_edge_case_catalog();

    assert_eq!(scenarios.len(), 15);
    assert!(scenarios.iter().any(|scenario| scenario.id == 15));
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
