//! Two-deck Pareto overlay (Sprint G.6 Session 1).
//!
//! Computes Pareto frontiers for two decks (A and B) and three comparison modes:
//! - `mode_pareto`: combined frontier across both decks (deduped)
//! - `mode_top5`: top 5 by score from each deck's frontier
//! - `mode_diff`: each combined-frontier point annotated with origin (only A / only B / both)

use crate::pareto_frontier::{pareto_frontier_strict, OptimizationResult};
use serde::{Deserialize, Serialize};

pub type FrontierPoint = OptimizationResult;
pub const DEFAULT_TWODECK_TOP_K: usize = 5;

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DiffOrigin {
    OnlyA,
    OnlyB,
    Both,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct DiffPoint {
    pub point: FrontierPoint,
    pub origin: DiffOrigin,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct TwoDeckResult {
    pub deck_a_frontier: Vec<FrontierPoint>,
    pub deck_b_frontier: Vec<FrontierPoint>,
    pub mode_pareto: Vec<FrontierPoint>,
    pub mode_top5: (Vec<FrontierPoint>, Vec<FrontierPoint>),
    pub mode_diff: Vec<DiffPoint>,
}

pub fn pareto_twodeck_compute(
    deck_a: &[OptimizationResult],
    deck_b: &[OptimizationResult],
) -> TwoDeckResult {
    pareto_twodeck_compute_with_top_k(deck_a, deck_b, DEFAULT_TWODECK_TOP_K)
}

pub fn pareto_twodeck_compute_with_top_k(
    deck_a: &[OptimizationResult],
    deck_b: &[OptimizationResult],
    top_k: usize,
) -> TwoDeckResult {
    let top_k = top_k.max(1);
    let deck_a_frontier = pareto_frontier_strict(deck_a);
    let deck_b_frontier = pareto_frontier_strict(deck_b);

    let mut combined: Vec<OptimizationResult> =
        Vec::with_capacity(deck_a_frontier.len() + deck_b_frontier.len());
    combined.extend_from_slice(&deck_a_frontier);
    combined.extend_from_slice(&deck_b_frontier);
    let mode_pareto = dedupe_frontier(pareto_frontier_strict(&combined));

    let top5_a: Vec<FrontierPoint> = deck_a_frontier.iter().take(top_k).cloned().collect();
    let top5_b: Vec<FrontierPoint> = deck_b_frontier.iter().take(top_k).cloned().collect();

    let mode_diff: Vec<DiffPoint> = mode_pareto
        .iter()
        .map(|point| {
            let in_a = deck_a_frontier.iter().any(|p| points_equal(p, point));
            let in_b = deck_b_frontier.iter().any(|p| points_equal(p, point));
            let origin = match (in_a, in_b) {
                (true, true) => DiffOrigin::Both,
                (true, false) => DiffOrigin::OnlyA,
                (false, true) => DiffOrigin::OnlyB,
                (false, false) => DiffOrigin::Both,
            };
            DiffPoint {
                point: point.clone(),
                origin,
            }
        })
        .collect();

    TwoDeckResult {
        deck_a_frontier,
        deck_b_frontier,
        mode_pareto,
        mode_top5: (top5_a, top5_b),
        mode_diff,
    }
}

fn points_equal(a: &OptimizationResult, b: &OptimizationResult) -> bool {
    a.label == b.label
        && a.score.to_bits() == b.score.to_bits()
        && a.damage_factor.to_bits() == b.damage_factor.to_bits()
}

fn dedupe_frontier(points: Vec<OptimizationResult>) -> Vec<OptimizationResult> {
    let mut seen: Vec<OptimizationResult> = Vec::with_capacity(points.len());
    for point in points {
        if !seen.iter().any(|existing| points_equal(existing, &point)) {
            seen.push(point);
        }
    }
    seen
}

#[cfg(test)]
mod tests {
    use super::*;

    fn p(label: &str, score: f64, damage: f64) -> OptimizationResult {
        OptimizationResult::new(label, score, damage)
    }

    #[test]
    fn test_twodeck_pareto_mode_basic() {
        let deck = vec![p("a", 1.0, 1.0), p("b", 2.0, 2.0), p("c", 0.5, 3.0)];
        let r = pareto_twodeck_compute(&deck, &deck);
        assert_eq!(r.deck_a_frontier.len(), r.deck_b_frontier.len());
        assert_eq!(r.mode_pareto.len(), r.deck_a_frontier.len());
        assert_eq!(r.deck_a_frontier.len(), 2);
        assert!(r.mode_diff.iter().all(|d| d.origin == DiffOrigin::Both));
    }

    #[test]
    fn test_twodeck_top5_mode() {
        let deck: Vec<OptimizationResult> = (0..10)
            .map(|i| p(&format!("a{i}"), i as f64, (10 - i) as f64))
            .collect();
        let r = pareto_twodeck_compute(&deck, &deck);
        assert_eq!(r.mode_top5.0.len(), 5);
        assert_eq!(r.mode_top5.1.len(), 5);
        let scores_a: Vec<f64> = r.mode_top5.0.iter().map(|p| p.score).collect();
        for window in scores_a.windows(2) {
            assert!(window[0] >= window[1]);
        }
    }

    #[test]
    fn test_twodeck_diff_mode() {
        let a = vec![p("a", 1.0, 1.0), p("b", 2.0, 0.5)];
        let b = vec![p("c", 1.5, 1.5), p("d", 0.5, 3.0)];
        let r = pareto_twodeck_compute(&a, &b);
        assert_eq!(r.mode_diff.len(), r.mode_pareto.len());
        let only_a_count = r
            .mode_diff
            .iter()
            .filter(|d| d.origin == DiffOrigin::OnlyA)
            .count();
        let only_b_count = r
            .mode_diff
            .iter()
            .filter(|d| d.origin == DiffOrigin::OnlyB)
            .count();
        assert!(
            only_a_count >= 1,
            "expected at least one OnlyA in disjoint decks"
        );
        assert!(
            only_b_count >= 1,
            "expected at least one OnlyB in disjoint decks"
        );
    }

    #[test]
    fn test_twodeck_empty_inputs() {
        let r = pareto_twodeck_compute(&[], &[]);
        assert!(r.deck_a_frontier.is_empty());
        assert!(r.deck_b_frontier.is_empty());
        assert!(r.mode_pareto.is_empty());
        assert_eq!(r.mode_top5.0.len(), 0);
        assert_eq!(r.mode_top5.1.len(), 0);
        assert!(r.mode_diff.is_empty());
    }

    #[test]
    fn test_twodeck_one_side_empty() {
        let a = vec![p("a", 1.0, 1.0), p("b", 2.0, 2.0)];
        let r = pareto_twodeck_compute(&a, &[]);
        assert_eq!(r.deck_a_frontier.len(), 1);
        assert!(r.deck_b_frontier.is_empty());
        assert!(r.mode_diff.iter().all(|d| d.origin == DiffOrigin::OnlyA));
        assert!(r.mode_top5.1.is_empty());

        let r2 = pareto_twodeck_compute(&[], &a);
        assert!(r2.deck_a_frontier.is_empty());
        assert_eq!(r2.deck_b_frontier.len(), 1);
        assert!(r2.mode_diff.iter().all(|d| d.origin == DiffOrigin::OnlyB));
    }

    #[test]
    fn test_twodeck_single_point_each_disjoint() {
        let a = vec![p("a", 1.0, 1.0)];
        let b = vec![p("b", 2.0, 2.0)];
        let r = pareto_twodeck_compute(&a, &b);
        assert_eq!(r.deck_a_frontier.len(), 1);
        assert_eq!(r.deck_b_frontier.len(), 1);
        // combined frontier dedupes and runs strict pareto: b dominates a
        assert_eq!(r.mode_pareto.len(), 1);
        assert_eq!(r.mode_pareto[0].label, "b");
        assert_eq!(r.mode_diff.len(), 1);
        assert_eq!(r.mode_diff[0].origin, DiffOrigin::OnlyB);
    }

    #[test]
    fn test_twodeck_top5_capped_when_frontier_larger() {
        // build a deck where ALL 8 points are mutually non-dominated (frontier of size 8)
        let deck: Vec<OptimizationResult> = (0..8)
            .map(|i| p(&format!("a{i}"), i as f64, (8 - i) as f64))
            .collect();
        let r = pareto_twodeck_compute(&deck, &deck);
        assert_eq!(r.deck_a_frontier.len(), 8);
        assert_eq!(r.deck_b_frontier.len(), 8);
        assert_eq!(r.mode_top5.0.len(), 5, "top5 must cap A at 5");
        assert_eq!(r.mode_top5.1.len(), 5, "top5 must cap B at 5");
    }

    #[test]
    fn test_twodeck_top_k_override_caps_each_frontier_side() {
        let deck: Vec<OptimizationResult> = (0..8)
            .map(|i| p(&format!("a{i}"), i as f64, (8 - i) as f64))
            .collect();

        let r = pareto_twodeck_compute_with_top_k(&deck, &deck, 2);

        assert_eq!(r.deck_a_frontier.len(), 8);
        assert_eq!(r.deck_b_frontier.len(), 8);
        assert_eq!(r.mode_top5.0.len(), 2);
        assert_eq!(r.mode_top5.1.len(), 2);
        assert_eq!(r.mode_top5.0[0].label, "a7");
        assert_eq!(r.mode_top5.1[1].label, "a6");
    }

    #[test]
    fn test_twodeck_identical_decks_yield_all_both_origin() {
        let deck = vec![p("a", 1.0, 1.0), p("b", 2.0, 0.5), p("c", 0.5, 2.0)];
        let r = pareto_twodeck_compute(&deck, &deck);
        assert_eq!(r.mode_pareto.len(), r.deck_a_frontier.len());
        assert!(
            r.mode_diff.iter().all(|d| d.origin == DiffOrigin::Both),
            "identical decks must produce all Both origin"
        );
        // and dedupe must collapse the doubled inputs to a single set
        assert_eq!(r.mode_pareto.len(), r.deck_b_frontier.len());
    }

    #[test]
    fn test_twodeck_dominance_filters_non_frontier() {
        // c is dominated by b (within deck a); should not appear in deck_a_frontier
        let a = vec![p("a", 1.0, 1.0), p("b", 3.0, 3.0), p("c", 2.0, 2.0)];
        let b = vec![p("d", 4.0, 4.0)];
        let r = pareto_twodeck_compute(&a, &b);
        assert!(
            r.deck_a_frontier.iter().all(|p| p.label != "c"),
            "dominated point c must not be in deck A frontier"
        );
        // d dominates everything; only d should be in mode_pareto
        assert_eq!(r.mode_pareto.len(), 1);
        assert_eq!(r.mode_pareto[0].label, "d");
    }
}
