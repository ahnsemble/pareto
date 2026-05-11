# Coercion Semantics

This document records the current Rust/WASM coercion behavior so frontend validation can reject ambiguous inputs before calling the module. The behavior below is covered by the numerical battery and Rust core tests listed in each section.

## Input Coercion Table

| Input edge case | Output behavior | Coverage |
| --- | --- | --- |
| Object null entries in decoded public raw payloads | Dropped by default so explicit null object keys behave as absent keys | `tests/numerical_battery/test_decode_preserve_null.py::test_wasm_decode_public_raw_default_keeps_absent_null_policy`; `tttg_forge_core/tests/decode_general.rs::decode_public_raw_default_drops_object_null_entries` |
| Object null entries with opt-in preserve | Preserved when `decode_public_raw_js(raw, true)` or `DecodeOptions { preserve_null_keys: true }` is used | `tests/numerical_battery/test_decode_preserve_null.py::test_wasm_decode_public_raw_js_preserves_nulls_when_opted_in`; `tttg_forge_core/tests/decode_general.rs::decode_options_struct_defaults_to_absent_null_policy` |
| Array null entries | Preserved as array slots; only object entries with null values are removed by the absent policy | `tests/numerical_battery/test_decode_preserve_null.py::test_wasm_decode_public_raw_default_keeps_absent_null_policy` |
| Invalid base64 / LZMA / MessagePack | Converted to decode error objects at the WASM boundary | `tests/numerical_battery/test_wasm_random_battery.py::test_decode_public_raw_random_and_error_battery`; `tttg_forge_core/tests/decode_general.rs::decode_invalid_base64_reports_decode_error` |

## Numeric Coercion

| Input edge case | Output behavior | Coverage |
| --- | --- | --- |
| Integer and float values in stat dictionaries | Coerced to JSON numbers and summed as `f64` | `tests/numerical_battery/test_wasm_random_battery.py::test_numeric_exports_random_battery`; `tttg_forge_core/tests/coercion_semantics.rs::coerce_stat_dict_keeps_numeric_and_converts_null_to_zero` |
| Null numeric values in stat dictionaries | Converted to `0.0` | `tttg_forge_core/tests/coercion_semantics.rs::coerce_stat_dict_keeps_numeric_and_converts_null_to_zero` |
| Non-numeric strings in stat dictionaries | Converted to `0.0`, not parsed as numbers | `tests/numerical_battery/fixtures/aggregate_expand/aggregate_stat_parts.json`; `tests/numerical_battery/test_aggregate_expand.py::test_aggregate_expand_wasm_exports_match_fixture_free_cases` |
| Very large finite values | Kept as finite `f64`; callers should validate ranges before display or ranking | `tests/numerical_battery/test_wasm_random_battery.py::test_numeric_exports_random_battery` damage-factor case `numeric-damage-factor-09` |

## Array / Map Coercion

| Input edge case | Output behavior | Coverage |
| --- | --- | --- |
| Non-array pool vectors | Coerced to an empty vector | `tests/numerical_battery/test_wasm_random_battery.py::test_numeric_exports_random_battery`; `tttg_forge_core/tests/core_api_matrix.rs::core_coercion_helpers_are_stable` |
| Null or string entries inside pool vectors | Converted to `0.0` while numeric entries are preserved | `tttg_forge_core/tests/coercion_semantics.rs::coerce_pool_vector_keeps_numeric_and_converts_other_entries_to_zero` |
| Arrays passed to stat merge helpers | Ignored when an object is required | `tests/numerical_battery/fixtures/aggregate_expand/aggregate_stat_parts.json`; `tttg_forge_wasm/tests/browser.rs::run_full_pipeline_aggregates_stat_parts_without_fixture_fallback` |
| Empty or missing data maps for in-memory aggregate | Produce empty stats rather than fixture fallback stats | `tests/numerical_battery/test_aggregate_expand.py::test_run_full_pipeline_in_memory_wasm_matches_fixture_stats`; `tttg_forge_wasm/tests/browser.rs::run_full_pipeline_aggregates_stat_parts_without_fixture_fallback` |

## String Coercion

| Input edge case | Output behavior | Coverage |
| --- | --- | --- |
| Base64 variants for raw decode | Standard, no-pad, URL-safe, and URL-safe no-pad inputs are attempted | `tests/numerical_battery/test_wasm_random_battery.py::test_decode_public_raw_random_and_error_battery`; `tttg_forge_core/tests/decode_general.rs::decode_general_lzma_roundtrip` |
| JSON-string MessagePack payloads | Parsed as JSON after LZMA decompression | `tttg_forge_core/tests/decode_general.rs::decode_general_lzma_roundtrip`; `tests/numerical_battery/test_decode_preserve_null.py::encode_raw_payload` callers |
| Frontier API JSON strings | Parsed strictly; malformed JSON returns a JS error instead of an empty frontier | `tttg_forge_wasm/tests/browser.rs::pareto_frontier_smoke_wasm_invalid_json_returns_js_error` |
| Case sensitivity and Unicode normalization | No case folding or Unicode normalization is applied by Rust; strings are compared exactly where used as keys | `tests/numerical_battery/test_wasm_random_battery.py::test_make_synthetic_search_space_random_battery`; `tttg_forge_core/tests/core_parity.rs::decode_public_raw_matches_expected_compact_keys` |

## Frontend Validation Pattern

| Frontend edge case | Recommended response | Coverage |
| --- | --- | --- |
| User-entered raw share strings | Trim only surrounding UI whitespace, then pass the exact raw string to `decode_public_raw`; reject empty strings before WASM | `tests/numerical_battery/test_wasm_random_battery.py::test_decode_public_raw_random_and_error_battery` |
| Optional null-key preservation | Expose as an explicit advanced option; default to absent/null-dropped behavior | `tests/numerical_battery/test_decode_preserve_null.py::test_wasm_decode_public_raw_default_and_opt_in_are_differential` |
| Numeric form fields | Validate finite numbers in TypeScript before creating stat dictionaries; do not rely on WASM to parse numeric strings | `tests/numerical_battery/test_wasm_random_battery.py::test_numeric_exports_random_battery` |
| Array inputs | Normalize sparse arrays to dense arrays or reject them before WASM; Rust sees only serialized values | `tttg_forge_core/tests/coercion_semantics.rs::coerce_pool_vector_keeps_numeric_and_converts_other_entries_to_zero` |

## Carryover

Frontend wrappers should add a Zod or manual schema layer after the design-system cleanup lands. Suggested Sprint G.6 checks: finite numeric fields, exact string-key enums, explicit null-preserve toggle, dense arrays, and malformed frontier JSON response.
