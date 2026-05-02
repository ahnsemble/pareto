use serde_json::Value;
use tttg_forge_core::{aggregate_in_memory, expand_in_memory};

const FIXTURE_ROOT: &str =
    "/Users/woosung/Desktop/Dev/Projects/pareto/tests/numerical_battery/fixtures/aggregate_expand";

fn load_fixture(name: &str) -> Value {
    let path = std::path::Path::new(FIXTURE_ROOT).join(format!("{name}.json"));
    serde_json::from_str(&std::fs::read_to_string(path).unwrap()).unwrap()
}

fn assert_fixture(name: &str) {
    let fixture = load_fixture(name);
    let actual = match fixture["operation"].as_str().unwrap() {
        "expand" => expand_in_memory(
            &fixture["input"],
            &fixture["data"],
            &[],
            fixture
                .get("strict")
                .and_then(Value::as_bool)
                .unwrap_or(true),
        )
        .unwrap(),
        "aggregate" => aggregate_in_memory(&fixture["input"], &fixture["data"]).unwrap(),
        operation => panic!("unknown aggregate/expand fixture operation: {operation}"),
    };
    assert_eq!(actual, fixture["expected"]);
}

macro_rules! aggregate_expand_fixture {
    ($test_name:ident, $fixture_name:literal) => {
        #[test]
        fn $test_name() {
            assert_fixture($fixture_name);
        }
    };
}

aggregate_expand_fixture!(expand_compact_alpha, "expand_compact_alpha");
aggregate_expand_fixture!(expand_compact_beta, "expand_compact_beta");
aggregate_expand_fixture!(expand_missing_non_strict, "expand_missing_non_strict");
aggregate_expand_fixture!(expand_list_data, "expand_list_data");
aggregate_expand_fixture!(aggregate_expanded_alpha, "aggregate_expanded_alpha");
aggregate_expand_fixture!(aggregate_sanitized_alpha, "aggregate_sanitized_alpha");
aggregate_expand_fixture!(aggregate_inline_stats, "aggregate_inline_stats");
aggregate_expand_fixture!(aggregate_stat_parts, "aggregate_stat_parts");
aggregate_expand_fixture!(aggregate_unknown_empty, "aggregate_unknown_empty");
aggregate_expand_fixture!(aggregate_list_data, "aggregate_list_data");
