use serde_json::{Map, Value};
use std::path::PathBuf;
use tttg_forge_core::calculate_score;

fn artifact_path() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../frontend/artifacts/td11/sio_lm_trace_summary_2026-05-20.json")
}

fn enabled_skills(names: &[Value]) -> Value {
    let mut map = Map::new();
    for name in names.iter().filter_map(Value::as_str) {
        map.insert(name.to_string(), Value::Bool(true));
    }
    Value::Object(map)
}

#[test]
fn live_lm_trace_score_product_matches_core_score_formula() {
    let path = artifact_path();
    if !path.exists() {
        eprintln!(
            "skipping live lm trace score check; artifact missing: {}",
            path.display()
        );
        return;
    }

    let payload: Value =
        serde_json::from_str(&std::fs::read_to_string(&path).expect("read lm trace artifact"))
            .expect("parse lm trace artifact");
    let cases = payload["cases"]
        .as_array()
        .expect("lm trace artifact cases array");

    for case in cases {
        let stats = case["nonZeroStats"].clone();
        let attack_meta = case["attackMeta"].clone();
        let damage_factor = case["damageFactor"].as_f64().expect("trace damage factor");
        let ce_damage = case["ceDamage"].clone();
        let calc_mode = case["calcMode"].as_str().expect("trace calc mode");
        let game_mode = case["gameMode"].as_str().expect("trace game mode");
        let skills = enabled_skills(
            case["enabledSkills"]
                .as_array()
                .expect("trace enabled skills"),
        );
        let passive_pools = case["passivePools"]
            .as_array()
            .expect("trace passive pools")
            .clone();
        let expected = case["tracedMultiplier"].as_f64().expect("trace multiplier");

        let actual = calculate_score(
            &stats,
            &attack_meta,
            damage_factor,
            &ce_damage,
            calc_mode,
            &skills,
            &passive_pools,
            game_mode,
        )
        .expect("core score");
        let relative_error = ((actual - expected) / expected).abs();
        assert!(
            relative_error <= 1e-12,
            "{} relative error {relative_error} actual {actual} expected {expected}",
            case["id"].as_str().unwrap_or("unknown")
        );
    }
}
