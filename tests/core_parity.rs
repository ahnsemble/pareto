use approx::assert_relative_eq;
use serde_json::Value;
use tttg_forge_core::{
    aggregate_all, build_filtered_skills, calculate_damage_factor, calculate_score, decode_public_raw,
    expand_compact, get_upgraded_collectibles, sanitize_expanded,
};

const FIXTURE_ROOT: &str = "/Users/woosung/Desktop/Dev/Woosdom_Brain/01_Domains/System/codex_output/tttg_forge_sprint_b_2026-04-19/geotool_reimplementation/tests/fixtures";

fn load_fixture(name: &str) -> Value {
    let path = std::path::Path::new(FIXTURE_ROOT).join(name);
    serde_json::from_str(&std::fs::read_to_string(path).unwrap()).unwrap()
}

#[test]
fn decode_public_raw_matches_expected_compact_keys() {
    let cases = load_fixture("public_share_cases.json");
    let raw = cases["wCrs4v"]["raw"].as_str().unwrap();
    let decoded = decode_public_raw(raw).unwrap();
    assert_eq!(decoded["_V"], 4);
    assert_eq!(decoded["a"]["I"], "lme1");
    assert_eq!(decoded["a"]["$"], 85410);
}

#[test]
fn expand_and_sanitize_match_public_case_wcrs4v() {
    let case = &load_fixture("public_share_cases_fresh.json")["wCrs4v"];
    let expanded = expand_compact(&case["compact"], &[], true).unwrap();
    assert_eq!(expanded, case["expanded"]);
    let sanitized = sanitize_expanded(&expanded).unwrap();
    assert_eq!(sanitized, case["sanitized"]);
}

#[test]
fn aggregate_all_matches_fresh_js_stats_wcrs4v() {
    let case = &load_fixture("public_share_cases_fresh.json")["wCrs4v"];
    let sanitized = sanitize_expanded(&expand_compact(&case["compact"], &[], true).unwrap()).unwrap();
    assert_eq!(aggregate_all(&sanitized).unwrap(), case["stats"]);
}

#[test]
fn score_helpers_match_synthetic_damage_a() {
    let case = load_fixture("synthetic_damage_a.json");
    let damage = calculate_damage_factor(&case["stats"], &case["ceDamageTechs"]).unwrap();
    assert_relative_eq!(damage.damage_factor, case["expected"]["damageFactor"].as_f64().unwrap(), epsilon = 1e-9);
    assert_relative_eq!(
        damage.ce_damage["ssWeapon"].as_f64().unwrap(),
        case["expected"]["ceDamage"]["ssWeapon"].as_f64().unwrap(),
        epsilon = 1e-9
    );
    let score = calculate_score(
        &case["stats"],
        &case["meta"],
        damage.damage_factor,
        &damage.ce_damage,
        case["calcMode"].as_str().unwrap(),
        &case["skills"],
        case["passivePools"].as_array().unwrap(),
        case["gameMode"].as_str().unwrap(),
    )
    .unwrap();
    assert_relative_eq!(score, case["expected"]["score"].as_f64().unwrap(), epsilon = 1e-9);
}

#[test]
fn filtered_skills_and_upgraded_collectibles_match_public_case() {
    let expanded = load_fixture("wCrs4v.expanded.json");
    let summary = load_fixture("public_case_summary.json");
    let upgraded = get_upgraded_collectibles(&expanded["customSets"], &[4, 8, 8]).unwrap();
    assert!(upgraded.is_empty());
    let filtered = build_filtered_skills(&expanded["skills"], &expanded["techs"], false).unwrap();
    assert_eq!(filtered, summary["wCrs4v"]["filteredSkills"]);
}
