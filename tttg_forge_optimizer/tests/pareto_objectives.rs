use serde_json::{json, Value};
use tttg_forge_optimizer::{
    objective_value, pareto_frontier_smoke_by_objectives, pareto_frontier_smoke_with_constraints,
    resolve_pareto_objectives,
};

fn candidate(
    label: &str,
    score: f64,
    damage_factor: f64,
    boss_damage: f64,
    lme1_damage: f64,
) -> Value {
    json!({
        "label": label,
        "score": score,
        "damageFactor": damage_factor,
        "bossDamage": boss_damage,
        "lme1Damage": lme1_damage
    })
}

#[test]
fn resolve_objectives_defaults_to_existing_score_damage_axes() {
    assert_eq!(
        resolve_pareto_objectives(&json!({})),
        vec!["score".to_string(), "damage".to_string()]
    );
}

#[test]
fn resolve_objectives_expands_normal_and_dedupes_selected_axes() {
    assert_eq!(
        resolve_pareto_objectives(&json!({
            "objectives": ["normal", "boss", "lme1", "boss", "unsupported"]
        })),
        vec![
            "score".to_string(),
            "damage".to_string(),
            "boss".to_string(),
            "lme1".to_string()
        ]
    );
}

#[test]
fn resolve_objectives_accepts_endless_echelon_aliases() {
    assert_eq!(
        resolve_pareto_objectives(&json!({
            "objectives": ["Endless Echelon", "endless_echelon", "ee"]
        })),
        vec!["ee".to_string()]
    );
}

#[test]
fn resolve_objectives_accepts_turf_war_aliases() {
    assert_eq!(
        resolve_pareto_objectives(&json!({
            "objectives": ["Turf War", "turf_war", "Turf"]
        })),
        vec!["turf".to_string()]
    );
}

#[test]
fn resolve_objectives_falls_back_when_array_has_no_valid_axes() {
    assert_eq!(
        resolve_pareto_objectives(&json!({"objectives": ["unknown"]})),
        vec!["score".to_string(), "damage".to_string()]
    );
}

#[test]
fn objective_value_reads_boss_aliases_from_top_level_and_stats() {
    assert_eq!(objective_value(&json!({"boss_damage": 12.5}), "boss"), 12.5);
    assert_eq!(
        objective_value(&json!({"stats": {"damageBoss": 9.0}}), "boss"),
        9.0
    );
}

#[test]
fn objective_value_reads_lme1_aliases_and_treats_missing_as_zero() {
    assert_eq!(
        objective_value(&json!({"stats": {"lme1Damage": 7.0}}), "lme1"),
        7.0
    );
    assert_eq!(objective_value(&json!({"score": 1.0}), "lme1"), 0.0);
}

#[test]
fn objective_value_reads_ee_score_aliases() {
    assert_eq!(
        objective_value(&json!({"stats": {"endlessEchelonScore": 42.0}}), "ee"),
        42.0
    );
    assert_eq!(objective_value(&json!({"ee_score": 11.0}), "ee"), 11.0);
}

#[test]
fn objective_value_reads_turf_score_aliases() {
    assert_eq!(
        objective_value(&json!({"stats": {"turfWarScore": 19.0}}), "turf"),
        19.0
    );
    assert_eq!(objective_value(&json!({"turf_damage": 8.0}), "turf"), 8.0);
}

#[test]
fn ee_axis_preserves_endless_echelon_specialist() {
    let candidates = vec![
        json!({"label": "normal", "score": 120.0, "damageFactor": 110.0, "eeScore": 5.0}),
        json!({"label": "ee", "score": 100.0, "damageFactor": 95.0, "eeScore": 40.0}),
    ];

    let frontier = pareto_frontier_smoke_by_objectives(&candidates, &["score", "damage", "ee"]);

    assert_eq!(frontier, vec![0, 1]);
}

#[test]
fn turf_axis_preserves_turf_war_specialist() {
    let candidates = vec![
        json!({"label": "normal", "score": 120.0, "damageFactor": 110.0, "turfScore": 5.0}),
        json!({"label": "turf", "score": 100.0, "damageFactor": 95.0, "turfScore": 40.0}),
    ];

    let frontier = pareto_frontier_smoke_by_objectives(&candidates, &["score", "damage", "turf"]);

    assert_eq!(frontier, vec![0, 1]);
}

#[test]
fn objective_value_reads_endless_echelon_damage_alias() {
    assert_eq!(
        objective_value(&json!({"endlessEchelonDamage": 23.0}), "ee"),
        23.0
    );
}

#[test]
fn objective_value_reads_turf_war_damage_alias() {
    assert_eq!(
        objective_value(&json!({"turfWarDamage": 17.0}), "turf"),
        17.0
    );
}

#[test]
fn resolve_objectives_dedupes_mixed_case_mode_aliases() {
    assert_eq!(
        resolve_pareto_objectives(&json!({"objectives": ["EE", "ee", "TURF", "turf"]})),
        vec!["ee".to_string(), "turf".to_string()]
    );
}

#[test]
fn resolve_objectives_accepts_hyphenated_mode_aliases() {
    assert_eq!(
        resolve_pareto_objectives(&json!({"objectives": ["endless-echelon", "turf-war"]})),
        vec!["ee".to_string(), "turf".to_string()]
    );
}

#[test]
fn ee_axis_can_drop_candidate_dominated_on_mode_score() {
    let candidates = vec![
        json!({"label": "winner", "score": 120.0, "damageFactor": 100.0, "eeScore": 30.0}),
        json!({"label": "loser", "score": 110.0, "damageFactor": 95.0, "eeScore": 20.0}),
    ];

    let frontier = pareto_frontier_smoke_by_objectives(&candidates, &["score", "damage", "ee"]);

    assert_eq!(frontier, vec![0]);
}

#[test]
fn turf_axis_can_drop_candidate_dominated_on_mode_score() {
    let candidates = vec![
        json!({"label": "winner", "score": 120.0, "damageFactor": 100.0, "turfScore": 30.0}),
        json!({"label": "loser", "score": 110.0, "damageFactor": 95.0, "turfScore": 20.0}),
    ];

    let frontier = pareto_frontier_smoke_by_objectives(&candidates, &["score", "damage", "turf"]);

    assert_eq!(frontier, vec![0]);
}

#[test]
fn ee_and_turf_can_be_combined_with_normal_axes() {
    assert_eq!(
        resolve_pareto_objectives(&json!({"objectives": ["normal", "ee", "turf"]})),
        vec![
            "score".to_string(),
            "damage".to_string(),
            "ee".to_string(),
            "turf".to_string()
        ]
    );
}

#[test]
fn missing_ee_and_turf_values_are_zero() {
    let candidate = json!({"score": 1.0});

    assert_eq!(objective_value(&candidate, "ee"), 0.0);
    assert_eq!(objective_value(&candidate, "turf"), 0.0);
}

#[test]
fn frontier_with_default_objectives_matches_existing_two_axis_behavior() {
    let candidates = vec![
        candidate("score-max", 120.0, 70.0, 0.0, 0.0),
        candidate("balanced", 100.0, 100.0, 0.0, 0.0),
        candidate("dominated", 90.0, 90.0, 1000.0, 1000.0),
    ];

    let frontier = pareto_frontier_smoke_with_constraints(&candidates, &json!({}));

    assert_eq!(frontier, vec![0, 1]);
}

#[test]
fn boss_axis_preserves_boss_specialist_that_default_frontier_drops() {
    let candidates = vec![
        candidate("normal-winner", 120.0, 100.0, 10.0, 0.0),
        candidate("boss-specialist", 100.0, 95.0, 40.0, 0.0),
    ];

    let default_frontier = pareto_frontier_smoke_by_objectives(&candidates, &["score", "damage"]);
    let boss_frontier =
        pareto_frontier_smoke_by_objectives(&candidates, &["score", "damage", "boss"]);

    assert_eq!(default_frontier, vec![0]);
    assert_eq!(boss_frontier, vec![0, 1]);
}

#[test]
fn lme1_axis_preserves_special_mode_specialist() {
    let candidates = vec![
        candidate("normal-winner", 130.0, 100.0, 0.0, 3.0),
        candidate("lme1-specialist", 100.0, 90.0, 0.0, 30.0),
    ];

    let frontier = pareto_frontier_smoke_by_objectives(&candidates, &["score", "damage", "lme1"]);

    assert_eq!(frontier, vec![0, 1]);
}

#[test]
fn selected_objective_can_make_candidate_strictly_dominated() {
    let candidates = vec![
        candidate("strict-winner", 130.0, 100.0, 50.0, 30.0),
        candidate("dominated-all-axes", 120.0, 100.0, 40.0, 20.0),
        candidate("lme1-edge", 100.0, 80.0, 10.0, 35.0),
    ];

    let frontier =
        pareto_frontier_smoke_by_objectives(&candidates, &["score", "damage", "boss", "lme1"]);

    assert_eq!(frontier, vec![0, 2]);
}

#[test]
fn objective_frontier_keeps_full_ties_on_selected_axes() {
    let candidates = vec![
        candidate("tie-a", 100.0, 100.0, 20.0, 5.0),
        candidate("tie-b", 100.0, 100.0, 20.0, 5.0),
    ];

    let frontier =
        pareto_frontier_smoke_by_objectives(&candidates, &["score", "damage", "boss", "lme1"]);

    assert_eq!(frontier, vec![0, 1]);
}
