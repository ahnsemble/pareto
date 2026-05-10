use std::{env, fs, path::PathBuf, process};
use tttg_forge_optimizer::{
    bench_profile_baseline_path, benchmark_regression_report, compare_bench_reports,
    detect_bench_profile, BenchRegressionPolicy, BenchRegressionReport,
};

const BASELINE_PATH: &str = "tttg_forge_optimizer/benches/baseline.json";
const CURRENT_PATH: &str = "target/bench_regression_current.json";

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

    let baseline_path = selected_baseline_path();
    if env::args().any(|arg| arg == "--write-baseline") {
        if let Some(parent) = baseline_path.parent() {
            fs::create_dir_all(parent).expect("baseline profile directory");
        }
        fs::write(
            &baseline_path,
            serde_json::to_string_pretty(&current).expect("serialize baseline report"),
        )
        .expect("write baseline report");
        println!("wrote {}", baseline_path.display());
        return;
    }

    let baseline: BenchRegressionReport =
        serde_json::from_str(&fs::read_to_string(&baseline_path).expect("read benchmark baseline"))
            .expect("parse benchmark baseline");
    let policy = BenchRegressionPolicy::default();
    let failures = compare_bench_reports(&baseline, &current, &policy);
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

fn selected_baseline_path() -> PathBuf {
    if let Ok(path) = env::var("BENCH_BASELINE_PATH") {
        return PathBuf::from(path);
    }
    let profile_path = bench_profile_baseline_path(detect_bench_profile());
    if profile_path.exists() {
        profile_path
    } else {
        PathBuf::from(BASELINE_PATH)
    }
}
