use tttg_forge_optimizer::{
    dominated_by_strict, pareto_frontier_strict, OptimizationResult, ParetoSmokeCandidate,
};

fn result(score: f64, damage_factor: f64, label: &str) -> OptimizationResult {
    OptimizationResult::new(label, score, damage_factor)
}

#[test]
fn empty_frontier_never_dominates_candidate() {
    assert!(!dominated_by_strict(&[], &result(1.0, 1.0, "candidate")));
}

#[test]
fn nan_score_does_not_dominate_finite_candidate() {
    assert!(!dominated_by_strict(
        &[result(f64::NAN, 2.0, "nan")],
        &result(1.0, 1.0, "candidate"),
    ));
}

#[test]
fn finite_score_does_not_dominate_nan_candidate() {
    assert!(!dominated_by_strict(
        &[result(2.0, 2.0, "finite")],
        &result(f64::NAN, 1.0, "candidate"),
    ));
}

#[test]
fn nan_damage_does_not_dominate_finite_candidate() {
    assert!(!dominated_by_strict(
        &[result(2.0, f64::NAN, "nan")],
        &result(1.0, 1.0, "candidate"),
    ));
}

#[test]
fn frontier_sort_uses_label_as_stable_tiebreaker() {
    let frontier = pareto_frontier_strict(&[result(10.0, 10.0, "b"), result(10.0, 10.0, "a")]);

    assert_eq!(frontier[0].label, "a");
    assert_eq!(frontier[1].label, "b");
}

#[test]
fn frontier_keeps_negative_tradeoff_extremes() {
    let frontier = pareto_frontier_strict(&[
        result(-1.0, 5.0, "damage-edge"),
        result(5.0, -1.0, "score-edge"),
        result(-2.0, -2.0, "dominated"),
    ]);

    assert_eq!(frontier.len(), 2);
}

#[test]
fn frontier_drops_candidate_equal_on_score_worse_on_damage() {
    let frontier =
        pareto_frontier_strict(&[result(10.0, 10.0, "winner"), result(10.0, 9.0, "dominated")]);

    assert_eq!(frontier, vec![result(10.0, 10.0, "winner")]);
}

#[test]
fn frontier_drops_candidate_equal_on_damage_worse_on_score() {
    let frontier =
        pareto_frontier_strict(&[result(10.0, 10.0, "winner"), result(9.0, 10.0, "dominated")]);

    assert_eq!(frontier, vec![result(10.0, 10.0, "winner")]);
}

#[test]
fn smoke_candidate_accepts_damage_factor_alias() {
    let candidate: ParetoSmokeCandidate =
        serde_json::from_value(serde_json::json!({"score": 1.0, "damageFactor": 2.0})).unwrap();

    assert_eq!(candidate.damage_factor, 2.0);
}

#[test]
fn smoke_candidate_accepts_damage_alias() {
    let candidate: ParetoSmokeCandidate =
        serde_json::from_value(serde_json::json!({"score": 1.0, "damage": 2.0})).unwrap();

    assert_eq!(candidate.damage_factor, 2.0);
}
