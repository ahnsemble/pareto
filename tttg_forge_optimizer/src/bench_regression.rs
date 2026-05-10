use crate::{
    find_best_bb_with_strategy, find_best_brute, search_space_total, OptimizationResult,
    OptimizationSearchSpace, SearchChoice, SearchSlot, UpperBoundStrategy,
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::time::Instant;

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct BenchRegressionRow {
    pub sample: String,
    pub combinations: usize,
    pub top_k: usize,
    pub loose_visited_nodes: usize,
    pub loose_pruned_nodes: usize,
    pub loose_pruning_rate: f64,
    pub loose_mean_ms: f64,
    pub tight_visited_nodes: usize,
    pub tight_pruned_nodes: usize,
    pub tight_pruning_rate: f64,
    pub tight_mean_ms: f64,
    pub exact_match: bool,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct BenchRegressionReport {
    pub generated_by: String,
    pub iterations: usize,
    pub rows: Vec<BenchRegressionRow>,
    pub average_pruning_delta: f64,
    pub average_wall_clock_delta: f64,
    pub all_exact_match: bool,
}

pub fn benchmark_regression_report(iterations: usize) -> BenchRegressionReport {
    let rows = benchmark_regression_rows(iterations);
    let average_pruning_delta = average(
        rows.iter()
            .map(|row| row.tight_pruning_rate - row.loose_pruning_rate),
    );
    let average_wall_clock_delta = average(rows.iter().map(|row| {
        if row.loose_mean_ms <= f64::EPSILON {
            0.0
        } else {
            (row.loose_mean_ms - row.tight_mean_ms) / row.loose_mean_ms
        }
    }));
    let all_exact_match = rows.iter().all(|row| row.exact_match);
    BenchRegressionReport {
        generated_by: "tttg_forge_optimizer::bench_regression".to_string(),
        iterations: iterations.max(1),
        rows,
        average_pruning_delta,
        average_wall_clock_delta,
        all_exact_match,
    }
}

pub fn benchmark_regression_rows(iterations: usize) -> Vec<BenchRegressionRow> {
    let prepared = json!({"score": 1000.0, "damageFactor": 100.0});
    sample_spaces()
        .into_iter()
        .map(|(sample, space, top_k)| {
            let brute = find_best_brute(&prepared, &json!({}), &space, usize::MAX)
                .unwrap_or_else(|_| Vec::new());
            let loose = measure_strategy(
                &prepared,
                &space,
                top_k,
                UpperBoundStrategy::LooseCombined,
                iterations,
            );
            let tight = measure_strategy(
                &prepared,
                &space,
                top_k,
                UpperBoundStrategy::TightSeparate,
                iterations,
            );
            BenchRegressionRow {
                sample: sample.to_string(),
                combinations: search_space_total(&space),
                top_k,
                loose_visited_nodes: loose.visited_nodes,
                loose_pruned_nodes: loose.pruned_nodes,
                loose_pruning_rate: loose.pruning_rate,
                loose_mean_ms: loose.mean_ms,
                tight_visited_nodes: tight.visited_nodes,
                tight_pruned_nodes: tight.pruned_nodes,
                tight_pruning_rate: tight.pruning_rate,
                tight_mean_ms: tight.mean_ms,
                exact_match: tight.results == brute && loose.results == brute,
            }
        })
        .collect()
}

fn sample_spaces() -> Vec<(&'static str, OptimizationSearchSpace, usize)> {
    vec![
        (
            "small_tradeoff",
            crate::make_synthetic_search_space(8, true, true, 10),
            10,
        ),
        (
            "medium_tradeoff",
            crate::make_synthetic_search_space(10, true, true, 5),
            5,
        ),
        (
            "large_tradeoff",
            crate::make_synthetic_search_space(12, true, true, 5),
            5,
        ),
        ("special_mode", mode_space(8, 5), 5),
        ("mixed_three_choice", mixed_space(7, 5), 5),
    ]
}

#[derive(Clone, Debug)]
struct StrategyMeasurement {
    results: Vec<OptimizationResult>,
    visited_nodes: usize,
    pruned_nodes: usize,
    pruning_rate: f64,
    mean_ms: f64,
}

fn measure_strategy(
    prepared: &serde_json::Value,
    space: &OptimizationSearchSpace,
    top_k: usize,
    strategy: UpperBoundStrategy,
    iterations: usize,
) -> StrategyMeasurement {
    let iterations = iterations.max(1);
    let mut total_ms = 0.0;
    let mut latest = None;
    for _ in 0..iterations {
        let started = Instant::now();
        let outcome = find_best_bb_with_strategy(prepared, &json!({}), space, top_k, strategy)
            .expect("benchmark sample must be valid");
        total_ms += started.elapsed().as_secs_f64() * 1000.0;
        latest = Some(outcome);
    }
    let outcome = latest.expect("at least one iteration");
    StrategyMeasurement {
        results: outcome.results,
        visited_nodes: outcome.metrics.visited_nodes,
        pruned_nodes: outcome.metrics.pruned_nodes,
        pruning_rate: outcome.metrics.pruning_rate(),
        mean_ms: total_ms / iterations as f64,
    }
}

fn mode_space(slot_count: usize, top_k: usize) -> OptimizationSearchSpace {
    let mut slots = Vec::with_capacity(slot_count);
    for index in 0..slot_count {
        let step = index as f64 + 1.0;
        slots.push(SearchSlot {
            name: format!("mode_{index:02}"),
            choices: vec![
                SearchChoice {
                    name: "normal".to_string(),
                    score_delta: 25.0 + step,
                    damage_delta: 2.0,
                },
                SearchChoice {
                    name: "special".to_string(),
                    score_delta: 1.0,
                    damage_delta: 35.0 + step,
                },
            ],
        });
    }
    OptimizationSearchSpace { slots, top_k }
}

fn mixed_space(slot_count: usize, top_k: usize) -> OptimizationSearchSpace {
    let mut slots = Vec::with_capacity(slot_count);
    for index in 0..slot_count {
        let step = index as f64 + 1.0;
        slots.push(SearchSlot {
            name: format!("mixed_{index:02}"),
            choices: vec![
                SearchChoice {
                    name: "score".to_string(),
                    score_delta: 20.0 + step,
                    damage_delta: 1.0,
                },
                SearchChoice {
                    name: "balanced".to_string(),
                    score_delta: 11.0 + step * 0.5,
                    damage_delta: 11.0 + step * 0.5,
                },
                SearchChoice {
                    name: "damage".to_string(),
                    score_delta: 1.0,
                    damage_delta: 20.0 + step,
                },
            ],
        });
    }
    OptimizationSearchSpace { slots, top_k }
}

fn average(values: impl Iterator<Item = f64>) -> f64 {
    let mut sum = 0.0;
    let mut count = 0usize;
    for value in values {
        sum += value;
        count += 1;
    }
    if count == 0 {
        0.0
    } else {
        sum / count as f64
    }
}
