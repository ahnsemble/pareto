use crate::{
    find_best_bb_with_strategy, find_best_brute, search_space_total, OptimizationResult,
    OptimizationSearchSpace, SearchChoice, SearchSlot, UpperBoundStrategy,
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::{fs, path::PathBuf, time::Instant};

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct BenchRegressionRow {
    pub sample: String,
    pub combinations: usize,
    pub top_k: usize,
    pub loose_visited_nodes: usize,
    pub loose_pruned_nodes: usize,
    pub loose_pruning_rate: f64,
    pub loose_mean_ms: f64,
    #[serde(default)]
    pub loose_stddev_ms: f64,
    pub tight_visited_nodes: usize,
    pub tight_pruned_nodes: usize,
    pub tight_pruning_rate: f64,
    pub tight_mean_ms: f64,
    #[serde(default)]
    pub tight_stddev_ms: f64,
    pub exact_match: bool,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct BenchRegressionReport {
    pub generated_by: String,
    pub iterations: usize,
    #[serde(default)]
    pub machine_id: String,
    #[serde(default)]
    pub warm_up_iterations: usize,
    pub rows: Vec<BenchRegressionRow>,
    pub average_pruning_delta: f64,
    pub average_wall_clock_delta: f64,
    pub all_exact_match: bool,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq, Serialize, Deserialize)]
pub enum BenchMachineProfileKind {
    #[serde(rename = "local-mac-m1")]
    LocalMacM1,
    #[serde(rename = "local-mac-m2")]
    LocalMacM2,
    #[serde(rename = "ci-ubuntu-latest")]
    CIUbuntuLatest,
    #[serde(rename = "ci-macos-latest")]
    CIMacosLatest,
    #[serde(rename = "ci-windows-latest")]
    CIWindowsLatest,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct BenchMachineProfile {
    pub kind: BenchMachineProfileKind,
    pub machine_id: String,
    pub iterations: usize,
    pub warm_up_iterations: usize,
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct BenchRegressionPolicy {
    pub wall_clock_regression_limit: f64,
    pub min_wall_clock_abs_floor_ms: f64,
    pub pruning_rate_regression_limit: f64,
    pub max_relative_stddev: f64,
    pub minimum_pass_rate: f64,
}

impl Default for BenchMachineProfile {
    fn default() -> Self {
        let kind = detect_bench_profile();
        Self {
            machine_id: std::env::var("PARETO_BENCH_MACHINE_ID")
                .ok()
                .filter(|value| !value.trim().is_empty())
                .unwrap_or_else(|| kind.as_str().to_string()),
            kind,
            iterations: 50,
            warm_up_iterations: 3,
        }
    }
}

impl Default for BenchRegressionPolicy {
    fn default() -> Self {
        Self {
            wall_clock_regression_limit: 1.50,
            min_wall_clock_abs_floor_ms: 0.050,
            pruning_rate_regression_limit: 0.05,
            max_relative_stddev: 1.0,
            minimum_pass_rate: 0.95,
        }
    }
}

pub fn benchmark_regression_report(iterations: usize) -> BenchRegressionReport {
    let profile = BenchMachineProfile {
        iterations: iterations.max(1),
        ..BenchMachineProfile::default()
    };
    let rows = benchmark_regression_rows_with_profile(&profile);
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
        iterations: profile.iterations,
        machine_id: profile.machine_id,
        warm_up_iterations: profile.warm_up_iterations,
        rows,
        average_pruning_delta,
        average_wall_clock_delta,
        all_exact_match,
    }
}

pub fn compare_bench_reports(
    baseline: &BenchRegressionReport,
    current: &BenchRegressionReport,
    policy: &BenchRegressionPolicy,
) -> Vec<String> {
    let mut failures = Vec::new();
    for baseline_row in &baseline.rows {
        let Some(current_row) = current
            .rows
            .iter()
            .find(|row| row.sample == baseline_row.sample)
        else {
            failures.push(format!("missing sample {}", baseline_row.sample));
            continue;
        };
        if !current_row.exact_match {
            failures.push(format!("{} exact_match=false", current_row.sample));
        }
        let allowed_ms = (baseline_row.tight_mean_ms * policy.wall_clock_regression_limit)
            .max(baseline_row.tight_mean_ms + policy.min_wall_clock_abs_floor_ms);
        if current_row.tight_mean_ms > allowed_ms {
            failures.push(format!(
                "{} wall-clock {:.6}ms > allowed {:.6}ms (baseline {:.6}ms, limit {:.2}, floor {:.3}ms)",
                current_row.sample,
                current_row.tight_mean_ms,
                allowed_ms,
                baseline_row.tight_mean_ms,
                policy.wall_clock_regression_limit,
                policy.min_wall_clock_abs_floor_ms
            ));
        }
        if current_row.tight_pruning_rate + policy.pruning_rate_regression_limit
            < baseline_row.tight_pruning_rate
        {
            failures.push(format!(
                "{} pruning {:.2}% < baseline {:.2}% - {:.2}pp",
                current_row.sample,
                current_row.tight_pruning_rate * 100.0,
                baseline_row.tight_pruning_rate * 100.0,
                policy.pruning_rate_regression_limit * 100.0
            ));
        }
        if current_row.tight_mean_ms > f64::EPSILON {
            let relative_stddev = current_row.tight_stddev_ms / current_row.tight_mean_ms;
            if relative_stddev > policy.max_relative_stddev {
                failures.push(format!(
                    "{} variance {:.2} > max {:.2}",
                    current_row.sample, relative_stddev, policy.max_relative_stddev
                ));
            }
        }
    }
    failures
}

pub fn benchmark_regression_rows(iterations: usize) -> Vec<BenchRegressionRow> {
    let profile = BenchMachineProfile {
        iterations: iterations.max(1),
        ..BenchMachineProfile::default()
    };
    benchmark_regression_rows_with_profile(&profile)
}

impl BenchMachineProfileKind {
    pub fn all() -> Vec<Self> {
        vec![
            Self::LocalMacM1,
            Self::LocalMacM2,
            Self::CIUbuntuLatest,
            Self::CIMacosLatest,
            Self::CIWindowsLatest,
        ]
    }

    pub fn as_str(self) -> &'static str {
        match self {
            Self::LocalMacM1 => "local-mac-m1",
            Self::LocalMacM2 => "local-mac-m2",
            Self::CIUbuntuLatest => "ci-ubuntu-latest",
            Self::CIMacosLatest => "ci-macos-latest",
            Self::CIWindowsLatest => "ci-windows-latest",
        }
    }

    pub fn from_label(value: &str) -> Option<Self> {
        match value.trim().to_ascii_lowercase().as_str() {
            "local-mac-m1" | "mac-m1" | "m1" => Some(Self::LocalMacM1),
            "local-mac-m2" | "mac-m2" | "m2" => Some(Self::LocalMacM2),
            "ci-ubuntu-latest" | "ubuntu-latest" | "linux" => Some(Self::CIUbuntuLatest),
            "ci-macos-latest" | "macos-latest" | "macos" => Some(Self::CIMacosLatest),
            "ci-windows-latest" | "windows-latest" | "windows" => Some(Self::CIWindowsLatest),
            _ => None,
        }
    }
}

pub fn detect_bench_profile() -> BenchMachineProfileKind {
    let explicit = std::env::var("BENCH_PROFILE").ok();
    let github_actions = std::env::var("GITHUB_ACTIONS").ok();
    let runner_os = std::env::var("RUNNER_OS").ok();
    detect_bench_profile_from_env(
        explicit.as_deref(),
        github_actions.as_deref(),
        runner_os.as_deref(),
        std::env::consts::OS,
        std::env::consts::ARCH,
    )
}

pub fn detect_bench_profile_from_env(
    explicit_profile: Option<&str>,
    github_actions: Option<&str>,
    runner_os: Option<&str>,
    local_os: &str,
    local_arch: &str,
) -> BenchMachineProfileKind {
    if let Some(profile) = explicit_profile.and_then(BenchMachineProfileKind::from_label) {
        return profile;
    }
    if github_actions
        .map(|value| value.eq_ignore_ascii_case("true"))
        .unwrap_or(false)
    {
        return match runner_os
            .and_then(BenchMachineProfileKind::from_label)
            .unwrap_or(BenchMachineProfileKind::CIUbuntuLatest)
        {
            BenchMachineProfileKind::CIMacosLatest => BenchMachineProfileKind::CIMacosLatest,
            BenchMachineProfileKind::CIWindowsLatest => BenchMachineProfileKind::CIWindowsLatest,
            _ => BenchMachineProfileKind::CIUbuntuLatest,
        };
    }
    match (local_os, local_arch) {
        ("macos", "aarch64") => BenchMachineProfileKind::LocalMacM2,
        ("macos", _) => BenchMachineProfileKind::LocalMacM1,
        _ => BenchMachineProfileKind::CIUbuntuLatest,
    }
}

pub fn bench_profile_baseline_path(profile: BenchMachineProfileKind) -> PathBuf {
    PathBuf::from("target")
        .join("bench_profiles")
        .join(format!("{}.json", profile.as_str()))
}

pub fn load_bench_baseline_for_profile(
    profile: BenchMachineProfileKind,
) -> Result<BenchRegressionReport, Box<dyn std::error::Error>> {
    let path = bench_profile_baseline_path(profile);
    let text = fs::read_to_string(resolve_repo_relative_path(&path))?;
    let baseline = serde_json::from_str(&text)?;
    Ok(baseline)
}

fn resolve_repo_relative_path(path: &PathBuf) -> PathBuf {
    if path.exists() {
        return path.clone();
    }
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("..")
        .join(path)
}

pub fn benchmark_regression_rows_with_profile(
    profile: &BenchMachineProfile,
) -> Vec<BenchRegressionRow> {
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
                profile,
            );
            let tight = measure_strategy(
                &prepared,
                &space,
                top_k,
                UpperBoundStrategy::TightSeparate,
                profile,
            );
            BenchRegressionRow {
                sample: sample.to_string(),
                combinations: search_space_total(&space),
                top_k,
                loose_visited_nodes: loose.visited_nodes,
                loose_pruned_nodes: loose.pruned_nodes,
                loose_pruning_rate: loose.pruning_rate,
                loose_mean_ms: loose.mean_ms,
                loose_stddev_ms: loose.stddev_ms,
                tight_visited_nodes: tight.visited_nodes,
                tight_pruned_nodes: tight.pruned_nodes,
                tight_pruning_rate: tight.pruning_rate,
                tight_mean_ms: tight.mean_ms,
                tight_stddev_ms: tight.stddev_ms,
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
    stddev_ms: f64,
}

fn measure_strategy(
    prepared: &serde_json::Value,
    space: &OptimizationSearchSpace,
    top_k: usize,
    strategy: UpperBoundStrategy,
    profile: &BenchMachineProfile,
) -> StrategyMeasurement {
    let iterations = profile.iterations.max(1);
    for _ in 0..profile.warm_up_iterations {
        let _ = find_best_bb_with_strategy(prepared, &json!({}), space, top_k, strategy)
            .expect("benchmark warm-up sample must be valid");
    }
    let mut total_ms = 0.0;
    let mut measurements = Vec::with_capacity(iterations);
    let mut latest = None;
    for _ in 0..iterations {
        let started = Instant::now();
        let outcome = find_best_bb_with_strategy(prepared, &json!({}), space, top_k, strategy)
            .expect("benchmark sample must be valid");
        let elapsed_ms = started.elapsed().as_secs_f64() * 1000.0;
        total_ms += elapsed_ms;
        measurements.push(elapsed_ms);
        latest = Some(outcome);
    }
    let outcome = latest.expect("at least one iteration");
    StrategyMeasurement {
        results: outcome.results,
        visited_nodes: outcome.metrics.visited_nodes,
        pruned_nodes: outcome.metrics.pruned_nodes,
        pruning_rate: outcome.metrics.pruning_rate(),
        mean_ms: total_ms / iterations as f64,
        stddev_ms: sample_stddev_ms(&measurements),
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

pub fn sample_stddev_ms(values: &[f64]) -> f64 {
    if values.len() <= 1 {
        return 0.0;
    }
    let mean = values.iter().sum::<f64>() / values.len() as f64;
    let variance = values
        .iter()
        .map(|value| {
            let delta = value - mean;
            delta * delta
        })
        .sum::<f64>()
        / values.len() as f64;
    variance.sqrt()
}

pub fn bench_pass_rate(total_runs: usize, failed_runs: usize) -> f64 {
    if total_runs == 0 {
        return 1.0;
    }
    let failed = failed_runs.min(total_runs);
    (total_runs - failed) as f64 / total_runs as f64
}
