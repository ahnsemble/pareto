fn read(path: &str) -> String {
    let root = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .unwrap();
    std::fs::read_to_string(root.join(path)).unwrap()
}

#[test]
fn readme_contains_korean_and_english_sections() {
    let readme = read("README.md");

    assert!(readme.contains("## 한국어"));
    assert!(readme.contains("## English"));
}

#[test]
fn readme_lists_five_screenshot_placeholders() {
    let readme = read("README.md");

    assert!(readme.matches("screenshot-placeholder").count() >= 5);
}

#[test]
fn readme_mentions_wasm_and_pareto_frontier() {
    let readme = read("README.md");

    assert!(readme.contains("WASM"));
    assert!(readme.contains("Pareto frontier"));
}

#[test]
fn license_is_mit() {
    assert!(read("LICENSE").contains("MIT License"));
}

#[test]
fn notice_contains_required_disclaimer() {
    let notice = read("NOTICE");

    assert!(notice.contains("Habby"));
    assert!(notice.contains("Survivor.io"));
    assert!(notice.contains("unofficial"));
}

#[test]
fn launch_checklist_has_at_least_thirty_items() {
    let checklist = read("docs/LAUNCH_VERIFICATION.md");

    assert!(checklist.matches("- [ ]").count() >= 30);
}

#[test]
fn launch_checklist_mentions_lighthouse_and_accessibility() {
    let checklist = read("docs/LAUNCH_VERIFICATION.md");

    assert!(checklist.contains("Lighthouse"));
    assert!(checklist.contains("accessibility"));
}

#[test]
fn launch_verify_script_declares_twenty_automated_checks() {
    let script = read("scripts/launch_verify.sh");

    assert_eq!(script.matches("run_check \"AUTO-").count(), 20);
}

#[test]
fn launch_verify_workflow_runs_script_nightly() {
    let workflow = read(".github/workflows/launch_verify.yml");

    assert!(workflow.contains("cron: '0 17 * * *'"));
    assert!(workflow.contains("scripts/launch_verify.sh"));
    assert!(workflow.contains("BENCH_REGRESSION_ITERATIONS: \"50\""));
}

#[test]
fn launch_verification_uses_s29_wasm_size_caps() {
    let script = read("scripts/launch_verify.sh");
    let workflow = read(".github/workflows/launch_verify.yml");

    assert!(script.contains("LAUNCH_WASM_CAP_BYTES:-145000"));
    assert!(script.contains("LAUNCH_WASM_GZIP_CAP_BYTES:-60000"));
    assert!(workflow.contains("LAUNCH_WASM_CAP_BYTES: \"145000\""));
    assert!(workflow.contains("LAUNCH_WASM_GZIP_CAP_BYTES: \"60000\""));
}

#[test]
fn root_launch_checklist_splits_twenty_auto_and_ten_manual_items() {
    let checklist = read("LAUNCH_CHECKLIST.md");

    assert_eq!(checklist.matches("- [ ] AUTO-").count(), 20);
    assert_eq!(checklist.matches("- [ ] MANUAL-").count(), 10);
}

#[test]
fn launch_static_assets_include_manifest_and_headers() {
    let manifest = read("frontend/public/manifest.json");
    let headers = read("frontend/public/_headers");

    assert!(manifest.contains("\"name\""));
    assert!(headers.contains("Content-Security-Policy"));
}

#[test]
fn changelog_covers_g1_through_g10() {
    let changelog = read("docs/CHANGELOG.md");

    for sprint in [
        "G.1", "G.2", "G.3", "G.4", "G.5", "G.6", "G.7", "G.8", "G.9", "G.10",
    ] {
        assert!(changelog.contains(sprint), "{sprint}");
    }
}

#[test]
fn notice_mentions_mit_dependency_compatibility() {
    assert!(read("NOTICE").contains("MIT-compatible"));
}

#[test]
fn readme_faq_exists_in_both_languages() {
    let readme = read("README.md");

    assert!(readme.contains("### FAQ"));
    assert!(readme.contains("### 자주 묻는 질문"));
}
