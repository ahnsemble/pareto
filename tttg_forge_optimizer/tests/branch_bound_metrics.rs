use serde_json::json;
use tttg_forge_optimizer::{
    find_best_bb, find_best_bb_with_metrics, find_best_bb_with_strategy, find_best_brute,
    make_synthetic_search_space, BranchBoundMetrics, OptimizationSearchSpace, SearchChoice,
    SearchSlot, UpperBoundStrategy,
};

fn prepared() -> serde_json::Value {
    json!({"score": 1000.0, "damageFactor": 100.0})
}

fn tradeoff_space() -> OptimizationSearchSpace {
    OptimizationSearchSpace {
        top_k: 3,
        slots: vec![
            SearchSlot {
                name: "weapon".to_string(),
                choices: vec![
                    SearchChoice {
                        name: "score".to_string(),
                        score_delta: 40.0,
                        damage_delta: 1.0,
                    },
                    SearchChoice {
                        name: "damage".to_string(),
                        score_delta: 4.0,
                        damage_delta: 30.0,
                    },
                ],
            },
            SearchSlot {
                name: "necklace".to_string(),
                choices: vec![
                    SearchChoice {
                        name: "score".to_string(),
                        score_delta: 30.0,
                        damage_delta: 1.0,
                    },
                    SearchChoice {
                        name: "damage".to_string(),
                        score_delta: 3.0,
                        damage_delta: 25.0,
                    },
                ],
            },
            SearchSlot {
                name: "gloves".to_string(),
                choices: vec![
                    SearchChoice {
                        name: "score".to_string(),
                        score_delta: 20.0,
                        damage_delta: 1.0,
                    },
                    SearchChoice {
                        name: "damage".to_string(),
                        score_delta: 2.0,
                        damage_delta: 20.0,
                    },
                ],
            },
        ],
    }
}

#[test]
fn bb_with_metrics_matches_brute_top_k_exactly() {
    let space = make_synthetic_search_space(8, true, true, 10);
    let brute = find_best_brute(&prepared(), &json!({}), &space, 1 << 20).unwrap();
    let outcome = find_best_bb_with_metrics(&prepared(), &json!({}), &space, 10).unwrap();

    assert_eq!(outcome.results, brute);
}

#[test]
fn public_bb_uses_exact_branch_bound_results() {
    let space = make_synthetic_search_space(7, true, true, 5);
    let brute = find_best_brute(&prepared(), &json!({}), &space, 1 << 20).unwrap();
    let bb = find_best_bb(&prepared(), &json!({}), &space, 5).unwrap();

    assert_eq!(bb, brute);
}

#[test]
fn tight_bound_prunes_more_than_loose_combined_bound() {
    let space = make_synthetic_search_space(10, true, true, 5);
    let loose = find_best_bb_with_strategy(
        &prepared(),
        &json!({}),
        &space,
        5,
        UpperBoundStrategy::LooseCombined,
    )
    .unwrap();
    let tight = find_best_bb_with_strategy(
        &prepared(),
        &json!({}),
        &space,
        5,
        UpperBoundStrategy::TightSeparate,
    )
    .unwrap();

    assert_eq!(tight.results, loose.results);
    assert!(
        tight.metrics.pruning_rate() >= loose.metrics.pruning_rate() + 0.10,
        "loose={:?} tight={:?}",
        loose.metrics,
        tight.metrics
    );
}

#[test]
fn metrics_count_visited_pruned_and_leaf_nodes() {
    let outcome = find_best_bb_with_metrics(&prepared(), &json!({}), &tradeoff_space(), 2).unwrap();

    assert!(outcome.metrics.visited_nodes > 0);
    assert!(outcome.metrics.leaf_nodes > 0);
    assert!(outcome.metrics.pruned_nodes > 0);
    assert!(outcome.metrics.pruning_rate() > 0.0);
}

#[test]
fn pruning_rate_is_zero_when_no_nodes_are_visited() {
    let metrics = BranchBoundMetrics::default();

    assert_eq!(metrics.pruning_rate(), 0.0);
}

#[test]
fn empty_space_returns_base_candidate_with_metrics() {
    let space = OptimizationSearchSpace {
        slots: Vec::new(),
        top_k: 10,
    };
    let outcome = find_best_bb_with_metrics(&prepared(), &json!({}), &space, 10).unwrap();

    assert_eq!(outcome.results.len(), 1);
    assert_eq!(outcome.results[0].score, 1000.0);
    assert_eq!(outcome.metrics.leaf_nodes, 1);
}

#[test]
fn top_k_zero_is_clamped_to_one() {
    let space = make_synthetic_search_space(5, true, false, 10);
    let outcome = find_best_bb_with_metrics(&prepared(), &json!({}), &space, 0).unwrap();

    assert_eq!(outcome.results.len(), 1);
}

#[test]
fn exactness_holds_for_score_only_synthetic_space() {
    let space = make_synthetic_search_space(9, true, false, 10);
    let brute = find_best_brute(&prepared(), &json!({}), &space, 1 << 20).unwrap();
    let outcome = find_best_bb_with_metrics(&prepared(), &json!({}), &space, 10).unwrap();

    assert_eq!(outcome.results, brute);
}

#[test]
fn exactness_holds_for_custom_tradeoff_space() {
    let space = tradeoff_space();
    let brute = find_best_brute(&prepared(), &json!({}), &space, 100).unwrap();
    let outcome = find_best_bb_with_metrics(&prepared(), &json!({}), &space, 3).unwrap();

    assert_eq!(outcome.results, brute);
}

#[test]
fn tight_bound_visits_no_more_nodes_than_loose_bound() {
    let space = make_synthetic_search_space(11, true, true, 5);
    let loose = find_best_bb_with_strategy(
        &prepared(),
        &json!({}),
        &space,
        5,
        UpperBoundStrategy::LooseCombined,
    )
    .unwrap();
    let tight = find_best_bb_with_strategy(
        &prepared(),
        &json!({}),
        &space,
        5,
        UpperBoundStrategy::TightSeparate,
    )
    .unwrap();

    assert!(tight.metrics.visited_nodes <= loose.metrics.visited_nodes);
}
