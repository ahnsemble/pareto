use tttg_forge_optimizer::{
    collectible_to_bits, compute_bitmask_v2, decode_bitmask_v2, dominated_by_strict,
    pareto_frontier_smoke, pareto_frontier_strict, OptimizationResult, ParetoSmokeCandidate,
};

fn result(score: f64, damage_factor: f64, label: &str) -> OptimizationResult {
    OptimizationResult::new(label, score, damage_factor)
}

fn smoke_candidate(label: &str, score: f64, damage: f64) -> ParetoSmokeCandidate {
    ParetoSmokeCandidate {
        label: Some(label.to_string()),
        score,
        damage_factor: damage,
    }
}

#[test]
fn pareto_dominance_strict_score_only_strictly_better() {
    let frontier = vec![result(120.0, 10.0, "A")];
    let candidate = result(100.0, 10.0, "B");
    assert!(dominated_by_strict(&frontier, &candidate));
}

#[test]
fn pareto_dominance_strict_damage_only_strictly_better() {
    let frontier = vec![result(100.0, 12.0, "A")];
    let candidate = result(100.0, 10.0, "B");
    assert!(dominated_by_strict(&frontier, &candidate));
}

#[test]
fn pareto_dominance_strict_full_tie_is_not_dominated() {
    let frontier = vec![result(100.0, 10.0, "A")];
    let candidate = result(100.0, 10.0, "B");
    assert!(!dominated_by_strict(&frontier, &candidate));
}

#[test]
fn pareto_frontier_strict_rebuilds_non_dominated_frontier() {
    let frontier = pareto_frontier_strict(&[
        result(100.0, 10.0, "dominated-both"),
        result(120.0, 10.0, "score-edge"),
        result(100.0, 12.0, "damage-edge"),
        result(120.0, 12.0, "winner"),
        result(110.0, 11.0, "dominated-mid"),
    ]);
    assert_eq!(frontier, vec![result(120.0, 12.0, "winner")]);
}

#[test]
fn pareto_frontier_smoke_keeps_single_point() {
    let frontier = pareto_frontier_smoke(&[smoke_candidate("solo", 100.0, 10.0)]);
    assert_eq!(frontier, vec![0]);
}

#[test]
fn pareto_frontier_smoke_keeps_full_ties() {
    let frontier = pareto_frontier_smoke(&[
        smoke_candidate("A", 100.0, 10.0),
        smoke_candidate("B", 100.0, 10.0),
    ]);
    assert_eq!(frontier, vec![0, 1]);
}

#[test]
fn pareto_frontier_smoke_drops_score_only_strict_dominated() {
    let frontier = pareto_frontier_smoke(&[
        smoke_candidate("score-edge", 120.0, 10.0),
        smoke_candidate("dominated", 100.0, 10.0),
    ]);
    assert_eq!(frontier, vec![0]);
}

#[test]
fn pareto_frontier_smoke_drops_damage_only_strict_dominated() {
    let frontier = pareto_frontier_smoke(&[
        smoke_candidate("damage-edge", 100.0, 12.0),
        smoke_candidate("dominated", 100.0, 10.0),
    ]);
    assert_eq!(frontier, vec![0]);
}

#[test]
fn pareto_frontier_smoke_orders_multi_point_frontier_like_shadow() {
    let frontier = pareto_frontier_smoke(&[
        smoke_candidate("balanced", 100.0, 100.0),
        smoke_candidate("score-max", 120.0, 70.0),
        smoke_candidate("damage-max", 70.0, 120.0),
        smoke_candidate("dominated-low", 90.0, 90.0),
        smoke_candidate("dominated-score-side", 110.0, 60.0),
    ]);
    assert_eq!(frontier, vec![1, 0, 2]);
}

#[test]
fn bitmask_64_collectible_no_collision() {
    let low = compute_bitmask_v2(7, 0, 33).unwrap();
    let high = compute_bitmask_v2(7, 1_u64 << 60, 33).unwrap();
    assert_ne!(low, high);

    let ids = vec![
        "slot-58".to_string(),
        "slot-60".to_string(),
        "slot-63".to_string(),
    ];
    let mask = collectible_to_bits(&ids).unwrap();
    let key = compute_bitmask_v2(63, mask, 1023).unwrap();
    let decoded = decode_bitmask_v2(key);
    assert_eq!(decoded.hero_id, 63);
    assert_eq!(decoded.tech_mask, 1023);
    assert_eq!(decoded.collectible_mask, mask);
}
