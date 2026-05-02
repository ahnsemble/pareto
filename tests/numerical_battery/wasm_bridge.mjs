import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  initSync,
  bridge_set,
  calculate_damage_factor,
  coerce_pool_vector,
  coerce_stat_dict,
  decode_public_raw,
  decode_public_raw_js,
  aggregate_in_memory_js,
  expand_compact_js,
  get_base_stats,
  invoke_export,
  make_synthetic_search_space,
  merge_stat_dicts,
  pareto_frontier_smoke_js,
  pareto_frontier_smoke_wasm,
  run_full_pipeline_in_memory,
  run_full_pipeline,
} from "../../tttg_forge_wasm/pkg/tttg_forge_wasm.js";

const wasmPath = new URL("../../tttg_forge_wasm/pkg/tttg_forge_wasm_bg.wasm", import.meta.url);
initSync({ module: readFileSync(fileURLToPath(wasmPath)) });

function normalize(value) {
  if (value instanceof Map) {
    const object = {};
    for (const [key, entry] of value.entries()) {
      object[String(key)] = normalize(entry);
    }
    return object;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => normalize(entry));
  }
  if (typeof value === "bigint") {
    return Number(value);
  }
  if (value && typeof value === "object") {
    const object = {};
    for (const [key, entry] of Object.entries(value)) {
      object[key] = normalize(entry);
    }
    return object;
  }
  return value;
}

function dispatch(call) {
  const args = call.args || [];
  switch (call.exportName) {
    case "bridge_set":
      return bridge_set(args[0]);
    case "calculate_damage_factor":
      return calculate_damage_factor(args[0], args[1]);
    case "coerce_pool_vector":
      return coerce_pool_vector(args[0]);
    case "coerce_stat_dict":
      return coerce_stat_dict(args[0]);
    case "decode_public_raw":
      return decode_public_raw(args[0]);
    case "decode_public_raw_js":
      return decode_public_raw_js(args[0], Boolean(args[1]));
    case "aggregate_in_memory_js":
      return aggregate_in_memory_js(args[0], args[1]);
    case "expand_compact_js":
      return expand_compact_js(args[0], args[1], args[2] || [], Boolean(args[3]));
    case "get_base_stats":
      return get_base_stats();
    case "invoke_export":
      return invoke_export(args[0], args[1], args[2]);
    case "make_synthetic_search_space":
      return make_synthetic_search_space(args[0], args[1], args[2], args[3]);
    case "merge_stat_dicts":
      return merge_stat_dicts(args[0]);
    case "pareto_frontier_smoke_js":
      return pareto_frontier_smoke_js(args[0]);
    case "pareto_frontier_smoke_wasm":
      return pareto_frontier_smoke_wasm(args[0]);
    case "run_full_pipeline_in_memory":
      return run_full_pipeline_in_memory(args[0], args[1]);
    case "run_full_pipeline":
      return run_full_pipeline(args[0]);
    default:
      throw new Error(`unknown export: ${call.exportName}`);
  }
}

const input = JSON.parse(readFileSync(0, "utf8"));
try {
  const calls = Array.isArray(input) ? input : [input];
  const results = calls.map((call) => normalize(dispatch(call)));
  process.stdout.write(JSON.stringify(Array.isArray(input) ? results : results[0]));
} catch (error) {
  process.stdout.write(JSON.stringify({ __thrown: String(error && error.message ? error.message : error) }));
  process.exitCode = 1;
}
