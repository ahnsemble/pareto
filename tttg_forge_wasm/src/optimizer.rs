use serde_json::{json, Value};
use tttg_forge_optimizer::{
    find_best_bb_with_metrics, find_best_beam, find_best_pareto, make_synthetic_search_space,
    pareto_frontier_smoke_by_objectives, search_space_total, OptimizationSearchSpace, SearchChoice,
    SearchSlot,
};

const RESOURCE_KEYS: [&str; 5] = [
    "eternalCores",
    "voidCores",
    "chaosCores",
    "relicKeys",
    "gold",
];
const SOLVER_ITERATION_CAP: u64 = 10_000;

pub fn branch_bound_run_value(input: &Value) -> Value {
    let prepared = prepared_case(input);
    let space = read_search_space(input);
    let top_k = top_k(input, &space);
    match find_best_bb_with_metrics(&prepared, &Value::Null, &space, top_k) {
        Ok(outcome) => json!({
            "algorithm": "branch_bound",
            "topK": top_k,
            "searchSpaceSize": search_space_total(&space),
            "builds": outcome.results,
            "metrics": {
                "visited_nodes": outcome.metrics.visited_nodes,
                "pruned_nodes": outcome.metrics.pruned_nodes,
                "leaf_nodes": outcome.metrics.leaf_nodes,
                "pruning_rate": outcome.metrics.pruning_rate()
            }
        }),
        Err(error) => error_payload("branch_bound", &error.to_string()),
    }
}

pub fn beam_search_run_value(input: &Value, beam_width: usize) -> Value {
    let prepared = prepared_case(input);
    let space = read_search_space(input);
    let result_count = beam_width.max(1);
    let search_width = result_count.max(top_k(input, &space));
    match find_best_beam(&prepared, &Value::Null, &space, search_width, result_count) {
        Ok(results) => json!({
            "algorithm": "beam_search",
            "beamWidth": result_count,
            "topK": result_count,
            "searchSpaceSize": search_space_total(&space),
            "builds": results
        }),
        Err(error) => error_payload("beam_search", &error.to_string()),
    }
}

pub fn pareto_frontier_compute_value(candidates: &Value, objectives: &Value) -> Value {
    let candidates = candidates.as_array().cloned().unwrap_or_default();
    let objective_names = objectives
        .as_array()
        .map(|entries| {
            entries
                .iter()
                .filter_map(Value::as_str)
                .map(str::to_string)
                .collect::<Vec<_>>()
        })
        .unwrap_or_else(|| vec!["score".to_string(), "damage".to_string()]);
    let objective_refs = objective_names
        .iter()
        .map(String::as_str)
        .collect::<Vec<_>>();
    let indexes = pareto_frontier_smoke_by_objectives(&candidates, &objective_refs);
    let frontier = indexes
        .iter()
        .filter_map(|index| candidates.get(*index).cloned())
        .collect::<Vec<_>>();
    json!({
        "algorithm": "pareto_frontier",
        "objectives": objective_names,
        "indexes": indexes,
        "frontier": frontier
    })
}

pub fn relic_core_optimize_value(player_state: &Value, constraints: &Value) -> Value {
    let start = now_ms();
    let base_attack = player_state
        .get("base_attack")
        .and_then(Value::as_f64)
        .unwrap_or(1000.0);
    let prepared = json!({
        "score": base_attack,
        "damageFactor": base_attack / 10.0
    });
    let top_k = constraints
        .get("topK")
        .or_else(|| constraints.get("top_k"))
        .and_then(Value::as_u64)
        .unwrap_or(5)
        .clamp(1, 10) as usize;
    let space = relic_resource_space(constraints, top_k);

    match find_best_bb_with_metrics(&prepared, &Value::Null, &space, top_k) {
        Ok(outcome) => {
            let pareto_set = find_best_pareto(
                &prepared,
                &Value::Null,
                &space,
                &["score".to_string(), "damage".to_string()],
                top_k.max(2) * 12,
            )
            .unwrap_or_else(|_| outcome.results.clone())
            .into_iter()
            .take(2)
            .map(|result| serde_json::to_value(result).unwrap_or(Value::Null))
            .collect::<Vec<_>>();
            json!({
                "algorithm": "relic_core",
                "constraintsSupportedCount": RESOURCE_KEYS.len(),
                "topK": top_k,
                "searchSpaceSize": search_space_total(&space),
                "builds": outcome.results,
                "paretoSet": pareto_set,
                "metrics": {
                    "visited_nodes": outcome.metrics.visited_nodes,
                    "pruned_nodes": outcome.metrics.pruned_nodes,
                    "leaf_nodes": outcome.metrics.leaf_nodes
                },
                "latencyMs": (now_ms() - start).max(0.0)
            })
        }
        Err(error) => error_payload("relic_core", &error.to_string()),
    }
}

pub fn twinborn_auto_assign_value(player_state: &Value, chip_pool: &Value) -> Value {
    let available_chips = chip_pool
        .get("availableChips")
        .or_else(|| chip_pool.get("available_chips"))
        .and_then(Value::as_u64)
        .unwrap_or(24);
    let iteration_cap = chip_pool
        .get("iterationCap")
        .or_else(|| chip_pool.get("iteration_cap"))
        .and_then(Value::as_u64)
        .unwrap_or(SOLVER_ITERATION_CAP)
        .min(SOLVER_ITERATION_CAP);
    let assignment_count = chip_pool
        .get("assignmentCount")
        .or_else(|| chip_pool.get("assignment_count"))
        .and_then(Value::as_u64)
        .unwrap_or(3)
        .clamp(1, 6) as usize;
    let tech_parts = player_state
        .get("tech_parts")
        .and_then(Value::as_array)
        .cloned()
        .unwrap_or_default();
    let mut candidates = tech_parts.iter().map(tech_candidate).collect::<Vec<_>>();
    candidates.sort_by(|left, right| {
        right
            .weight
            .total_cmp(&left.weight)
            .then(left.tech_id.cmp(&right.tech_id))
    });
    candidates.truncate(assignment_count);

    let prepared = json!({"score": 1000.0, "damageFactor": 100.0});
    let search_space = make_synthetic_search_space(candidates.len().max(1), true, true, 10);
    let solver_builds = find_best_beam(
        &prepared,
        &Value::Null,
        &search_space,
        assignment_count.max(3) * 8,
        assignment_count.max(1),
    )
    .unwrap_or_default();

    let mut remaining = available_chips;
    let mut assignments = Vec::with_capacity(candidates.len());
    let weight_total = candidates
        .iter()
        .map(|candidate| candidate.weight)
        .sum::<f64>()
        .max(1.0);
    for (index, candidate) in candidates.iter().enumerate() {
        let chips = if index + 1 == candidates.len() {
            remaining
        } else {
            let share = ((available_chips as f64) * candidate.weight / weight_total).round();
            share.max(1.0).min(remaining as f64) as u64
        };
        remaining = remaining.saturating_sub(chips);
        assignments.push(json!({
            "techId": candidate.tech_id,
            "chips": chips,
            "manualChips": candidate.manual_chips,
            "autoDamageGain": chips as f64 * candidate.weight * 0.01
        }));
    }
    let iterations = (available_chips.saturating_mul(assignments.len() as u64)).min(iteration_cap);
    json!({
        "algorithm": "twinborn_solver",
        "iterationCap": iteration_cap,
        "iterations": iterations,
        "availableChips": available_chips,
        "assignments": assignments,
        "solverBuilds": solver_builds
    })
}

fn prepared_case(input: &Value) -> Value {
    input
        .get("preparedCase")
        .or_else(|| input.get("prepared_case"))
        .cloned()
        .unwrap_or_else(|| json!({"score": 1000.0, "damageFactor": 100.0}))
}

fn read_search_space(input: &Value) -> OptimizationSearchSpace {
    let value = input
        .get("searchSpace")
        .or_else(|| input.get("search_space"))
        .unwrap_or(input);
    serde_json::from_value::<OptimizationSearchSpace>(value.clone())
        .unwrap_or_else(|_| make_synthetic_search_space(4, true, true, 5))
}

fn top_k(input: &Value, space: &OptimizationSearchSpace) -> usize {
    input
        .get("topK")
        .or_else(|| input.get("top_k"))
        .and_then(Value::as_u64)
        .map(|value| value as usize)
        .unwrap_or(space.top_k)
        .max(1)
}

fn relic_resource_space(constraints: &Value, top_k: usize) -> OptimizationSearchSpace {
    let slots = RESOURCE_KEYS
        .iter()
        .enumerate()
        .map(|(index, key)| {
            let amount = constraints.get(*key).and_then(Value::as_f64).unwrap_or(0.0);
            let scale = if *key == "gold" { 100_000.0 } else { 1.0 };
            let unit = (amount / scale).max(0.0);
            let step = index as f64 + 1.0;
            let choices = if unit > 0.0 {
                vec![
                    SearchChoice {
                        name: "hold".to_string(),
                        score_delta: 0.0,
                        damage_delta: 0.0,
                    },
                    SearchChoice {
                        name: format!("{key}_score"),
                        score_delta: unit * (10.0 + step),
                        damage_delta: unit * (0.6 + step * 0.1),
                    },
                    SearchChoice {
                        name: format!("{key}_damage"),
                        score_delta: unit * (4.0 + step * 0.2),
                        damage_delta: unit * (2.0 + step * 0.8),
                    },
                ]
            } else {
                vec![SearchChoice {
                    name: "hold".to_string(),
                    score_delta: 0.0,
                    damage_delta: 0.0,
                }]
            };
            SearchSlot {
                name: (*key).to_string(),
                choices,
            }
        })
        .collect::<Vec<_>>();
    OptimizationSearchSpace { slots, top_k }
}

struct TechCandidate {
    tech_id: String,
    weight: f64,
    manual_chips: u64,
}

fn tech_candidate(value: &Value) -> TechCandidate {
    let tech_id = value
        .get("id")
        .and_then(Value::as_str)
        .unwrap_or("tech")
        .to_string();
    let is_twinborn = value
        .get("is_twinborn")
        .and_then(Value::as_bool)
        .unwrap_or(false);
    let equipped_bonus = value
        .get("equipped_slot")
        .and_then(Value::as_str)
        .filter(|slot| !slot.is_empty())
        .map(|_| 1.0)
        .unwrap_or(0.0);
    let manual_chips = value
        .get("resonance_chip_allocated")
        .and_then(Value::as_u64)
        .unwrap_or(0);
    TechCandidate {
        tech_id,
        weight: 1.0 + if is_twinborn { 2.0 } else { 0.0 } + equipped_bonus,
        manual_chips,
    }
}

fn error_payload(algorithm: &str, message: &str) -> Value {
    json!({
        "algorithm": algorithm,
        "error": message,
        "builds": []
    })
}

#[cfg(target_arch = "wasm32")]
fn now_ms() -> f64 {
    js_sys::Date::now()
}

#[cfg(not(target_arch = "wasm32"))]
fn now_ms() -> f64 {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs_f64() * 1000.0)
        .unwrap_or(0.0)
}
