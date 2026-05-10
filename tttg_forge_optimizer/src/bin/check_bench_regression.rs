use std::{env, fs, process};
use tttg_forge_optimizer::{benchmark_regression_report, BenchRegressionReport};

const BASELINE_PATH: &str = "tttg_forge_optimizer/benches/baseline.json";
const CURRENT_PATH: &str = "target/bench_regression_current.json";
const WALL_CLOCK_REGRESSION_LIMIT: f64 = 1.20;
const PRUNING_RATE_REGRESSION_LIMIT: f64 = 0.05;

fn main() {
    let iterations = env::var("BENCH_REGRESSION_ITERATIONS")
        .ok()
        .and_then(|value| value.parse::<usize>().ok())
        .unwrap_or(50);
    let current = benchmark_regression_report(iterations);
    fs::create_dir_all("target").expect("target directory");
    fs::write(
        CURRENT_PATH,
        serde_json::to_string_pretty(&current).expect("serialize current report"),
    )
    .expect("write current report");

    if env::args().any(|arg| arg == "--write-baseline") {
        fs::write(
            BASELINE_PATH,
            serde_json::to_string_pretty(&current).expect("serialize baseline report"),
        )
        .expect("write baseline report");
        println!("wrote {BASELINE_PATH}");
        return;
    }

    let baseline: BenchRegressionReport =
        serde_json::from_str(&fs::read_to_string(BASELINE_PATH).expect("read benchmark baseline"))
            .expect("parse benchmark baseline");
    let failures = compare_reports(&baseline, &current);
    println!(
        "bench regression: average pruning delta {:.2}pp, average wall-clock delta {:.2}%",
        current.average_pruning_delta * 100.0,
        current.average_wall_clock_delta * 100.0
    );
    if failures.is_empty() {
        println!("bench regression: PASS ({CURRENT_PATH})");
    } else {
        eprintln!("bench regression: FAIL");
        for failure in failures {
            eprintln!("- {failure}");
        }
        process::exit(1);
    }
}

fn compare_reports(
    baseline: &BenchRegressionReport,
    current: &BenchRegressionReport,
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
        if current_row.tight_mean_ms > baseline_row.tight_mean_ms * WALL_CLOCK_REGRESSION_LIMIT {
            failures.push(format!(
                "{} wall-clock {:.6}ms > baseline {:.6}ms * {:.2}",
                current_row.sample,
                current_row.tight_mean_ms,
                baseline_row.tight_mean_ms,
                WALL_CLOCK_REGRESSION_LIMIT
            ));
        }
        if current_row.tight_pruning_rate + PRUNING_RATE_REGRESSION_LIMIT
            < baseline_row.tight_pruning_rate
        {
            failures.push(format!(
                "{} pruning {:.2}% < baseline {:.2}% - {:.2}pp",
                current_row.sample,
                current_row.tight_pruning_rate * 100.0,
                baseline_row.tight_pruning_rate * 100.0,
                PRUNING_RATE_REGRESSION_LIMIT * 100.0
            ));
        }
    }
    failures
}
