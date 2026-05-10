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
