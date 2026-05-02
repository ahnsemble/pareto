//! Two-deck Pareto overlay (Sprint G.6 Session 1).
//!
//! Computes Pareto frontiers for two decks (A and B) and three comparison modes:
//! - `mode_pareto`: combined frontier across both decks (deduped)
//! - `mode_top5`: top 5 by score from each deck's frontier
//! - `mode_diff`: each combined-frontier point annotated with origin (only A / only B / both)

use crate::pareto_frontier::{pareto_frontier_strict, OptimizationResult};
use serde::{Deserialize, Serialize};

pub type FrontierPoint = OptimizationResult;

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
    let deck_a_frontier = pareto_frontier_strict(deck_a);
    let deck_b_frontier = pareto_frontier_strict(deck_b);

    let mut combined: Vec<OptimizationResult> = Vec::with_capacity(deck_a_frontier.len() + deck_b_frontier.len());
    combined.extend_from_slice(&deck_a_frontier);
    combined.extend_from_slice(&deck_b_frontier);
    let mode_pareto = dedupe_frontier(pareto_frontier_strict(&combined));

    let top5_a: Vec<FrontierPoint> = deck_a_frontier.iter().take(5).cloned().collect();
    let top5_b: Vec<FrontierPoint> = deck_b_frontier.iter().take(5).cloned().collect();

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
    a.label == b.label && a.score.to_bits() == b.score.to_bits() && a.damage_factor.to_bits() == b.damage_factor.to_bits()
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
        assert!(r
            .mode_diff
            .iter()
            .all(|d| d.origin == DiffOrigin::Both));
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
        let only_a_count = r.mode_diff.iter().filter(|d| d.origin == DiffOrigin::OnlyA).count();
        let only_b_count = r.mode_diff.iter().filter(|d| d.origin == DiffOrigin::OnlyB).count();
        assert!(only_a_count >= 1, "expected at least one OnlyA in disjoint decks");
        assert!(only_b_count >= 1, "expected at least one OnlyB in disjoint decks");
    }
}
