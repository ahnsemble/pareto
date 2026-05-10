fn game_data_workflow() -> String {
    read_repo_file(".github/workflows/game-data-watch.yml")
}

fn wasm_size_workflow() -> String {
    read_repo_file(".github/workflows/wasm-size.yml")
}

fn regression_workflow() -> String {
    read_repo_file(".github/workflows/regression.yml")
}

fn read_repo_file(path: &str) -> String {
    let root = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .unwrap();
    std::fs::read_to_string(root.join(path)).unwrap()
}

#[test]
fn game_data_workflow_has_weekly_sunday_cron() {
    assert!(game_data_workflow().contains("0 0 * * 0"));
}

#[test]
fn game_data_workflow_has_manual_dispatch() {
    assert!(game_data_workflow().contains("workflow_dispatch"));
}

#[test]
fn game_data_workflow_runs_detector_script() {
    assert!(game_data_workflow().contains("scripts/detect_game_data_changes.py"));
}

#[test]
fn game_data_workflow_mentions_kst_timezone() {
    assert!(game_data_workflow().contains("Asia/Seoul"));
}

#[test]
fn game_data_workflow_can_send_telegram_brief() {
    let workflow = game_data_workflow();

    assert!(workflow.contains("TELEGRAM_BOT_TOKEN"));
    assert!(workflow.contains("TELEGRAM_CHAT_ID"));
}

#[test]
fn game_data_workflow_escalates_changed_data() {
    assert!(game_data_workflow().contains("BRAIN_ESCALATION_REQUIRED"));
}

#[test]
fn wasm_size_workflow_runs_on_pull_request() {
    assert!(wasm_size_workflow().contains("pull_request"));
}

#[test]
fn wasm_size_workflow_has_manual_dispatch() {
    assert!(wasm_size_workflow().contains("workflow_dispatch"));
}

#[test]
fn wasm_size_workflow_builds_default_production_wasm() {
    assert!(wasm_size_workflow().contains("wasm-pack build tttg_forge_wasm --target web --release"));
}

#[test]
fn wasm_size_workflow_enforces_g8_cap() {
    assert!(wasm_size_workflow().contains("225000"));
}

#[test]
fn wasm_size_workflow_records_wasm_byte_count() {
    assert!(wasm_size_workflow().contains("wc -c"));
}

#[test]
fn regression_pytest_battery_uses_compat_exports() {
    assert!(regression_workflow().contains("--features compat-exports"));
}

#[test]
fn regression_frontend_build_uses_default_wasm() {
    let workflow = regression_workflow();
    let frontend_index = workflow.find("frontend build").unwrap();
    let frontend_tail = &workflow[frontend_index..];

    assert!(frontend_tail.contains("wasm-pack build tttg_forge_wasm --target web --release"));
}

#[test]
fn game_data_workflow_uploads_detector_artifact() {
    assert!(game_data_workflow().contains("game-data-watch"));
}

#[test]
fn wasm_size_workflow_uploads_size_artifact() {
    assert!(wasm_size_workflow().contains("wasm-size"));
}
