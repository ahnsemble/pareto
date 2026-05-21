use serde_json::{json, Value};
fn sample_space() -> Value {
    json!({
        "preparedCase": {
            "score": 1000.0,
            "damageFactor": 100.0
        },
        "searchSpace": {
            "top_k": 3,
            "slots": [
                {
                    "name": "necklace_core",
                    "choices": [
                        {"name": "hold", "score_delta": 0.0, "damage_delta": 0.0},
                        {"name": "eaf_1", "score_delta": 12.0, "damage_delta": 4.0}
                    ]
                },
                {
                    "name": "weapon_core",
                    "choices": [
                        {"name": "hold", "score_delta": 0.0, "damage_delta": 0.0},
                        {"name": "vaf_1", "score_delta": 7.0, "damage_delta": 11.0}
                    ]
                }
            ]
        }
    })
}

#[test]
fn branch_bound_run_js_returns_ranked_builds_and_metrics() {
    let actual = tttg_forge_wasm::optimizer::branch_bound_run_value(&sample_space());

    assert_eq!(actual["algorithm"], json!("branch_bound"));
    assert_eq!(actual["builds"].as_array().unwrap().len(), 3);
    assert_eq!(actual["builds"][0]["score"], json!(1019.0));
    assert_eq!(actual["builds"][0]["damageFactor"], json!(115.0));
    assert!(actual["metrics"]["visited_nodes"].as_u64().unwrap() > 0);
}

#[test]
fn beam_search_run_js_returns_requested_top_k() {
    let actual = tttg_forge_wasm::optimizer::beam_search_run_value(&sample_space(), 2);

    assert_eq!(actual["algorithm"], json!("beam_search"));
    assert_eq!(actual["beamWidth"], json!(2));
    assert_eq!(actual["builds"].as_array().unwrap().len(), 2);
}

#[test]
fn pareto_frontier_compute_js_preserves_non_dominated_points() {
    let actual = tttg_forge_wasm::optimizer::pareto_frontier_compute_value(
        &json!([
            {"label": "score", "score": 130.0, "damageFactor": 80.0},
            {"label": "balanced", "score": 110.0, "damageFactor": 110.0},
            {"label": "weak", "score": 90.0, "damageFactor": 90.0}
        ]),
        &json!(["score", "damage"]),
    );

    assert_eq!(actual["algorithm"], json!("pareto_frontier"));
    assert_eq!(actual["frontier"].as_array().unwrap().len(), 2);
    assert_eq!(actual["frontier"][0]["label"], json!("score"));
    assert_eq!(actual["frontier"][1]["label"], json!("balanced"));
}

#[test]
fn relic_core_optimize_js_uses_resource_constraints() {
    let player_state = json!({
        "base_attack": 1000.0,
        "tech_parts": [],
        "ss_equipment": []
    });
    let constraints = json!({
        "eternalCores": 2,
        "voidCores": 1,
        "chaosCores": 1,
        "relicKeys": 2,
        "gold": 250000,
        "topK": 4
    });

    let actual = tttg_forge_wasm::optimizer::relic_core_optimize_value(&player_state, &constraints);

    assert_eq!(actual["algorithm"], json!("relic_core"));
    assert_eq!(actual["constraintsSupportedCount"], json!(5));
    assert_eq!(actual["builds"].as_array().unwrap().len(), 4);
    assert!(actual["latencyMs"].as_f64().unwrap() <= 500.0);
}

#[test]
fn twinborn_auto_assign_js_caps_iterations_and_assigns_chips() {
    let player_state = json!({
        "tech_parts": [
            {"id": "drone", "equipped_slot": "attack_1", "is_twinborn": true, "resonance_chip_allocated": 0},
            {"id": "molotov", "equipped_slot": "attack_2", "is_twinborn": false, "resonance_chip_allocated": 0}
        ]
    });
    let chip_pool = json!({
        "availableChips": 12,
        "iterationCap": 10000
    });

    let actual = tttg_forge_wasm::optimizer::twinborn_auto_assign_value(&player_state, &chip_pool);

    assert_eq!(actual["algorithm"], json!("twinborn_solver"));
    assert_eq!(actual["iterationCap"], json!(10000));
    assert!(actual["iterations"].as_u64().unwrap() <= 10000);
    assert_eq!(actual["assignments"][0]["techId"], json!("drone"));
    assert!(actual["assignments"][0]["chips"].as_u64().unwrap() > 0);
}
