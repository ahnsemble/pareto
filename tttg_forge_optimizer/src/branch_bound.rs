use crate::{OptimizationResult, OptimizationSearchSpace, OptimizerError, SearchSlot};
use serde_json::Value;
use std::collections::BTreeMap;

pub fn default_upper_bound(
    partial_build: &Value,
    remaining_slots: &[SearchSlot],
    _base_case: &Value,
) -> f64 {
    // The synthetic Sprint C search spaces only add non-negative deltas to fields
    // that the score engine treats monotonically. A super-choice completion can
    // only overestimate the best reachable completion score, never underestimate it.
    let base = partial_build
        .get("score")
        .and_then(Value::as_f64)
        .unwrap_or(0.0);
    base + remaining_slots
        .iter()
        .map(|slot| {
            slot.choices
                .iter()
                .map(|choice| choice.score_delta)
                .fold(0.0, f64::max)
        })
        .sum::<f64>()
}

pub fn find_best_brute(
    prepared_case: &Value,
    _attack_meta: &Value,
    search_space: &OptimizationSearchSpace,
    max_combos: usize,
) -> Result<Vec<OptimizationResult>, OptimizerError> {
    let total = crate::search_space_total(search_space);
    if total > max_combos {
        return Err(OptimizerError::Message(format!(
            "search space has {total} combinations, which exceeds max_combos={max_combos}"
        )));
    }
    let base_score = prepared_case
        .get("score")
        .and_then(Value::as_f64)
        .unwrap_or(0.0);
    let base_damage = prepared_case
        .get("damageFactor")
        .or_else(|| prepared_case.get("damage_factor"))
        .and_then(Value::as_f64)
        .unwrap_or(0.0);
    let mut results = Vec::new();
    let mut build = BTreeMap::new();
    dfs(
        0,
        base_score,
        base_damage,
        search_space,
        &mut build,
        &mut results,
    );
    results.sort_by(|left, right| {
        right
            .score
            .total_cmp(&left.score)
            .then(right.damage_factor.total_cmp(&left.damage_factor))
            .then(left.label.cmp(&right.label))
    });
    results.truncate(search_space.top_k);
    Ok(results)
}

pub fn find_best_bb(
    prepared_case: &Value,
    _attack_meta: &Value,
    search_space: &OptimizationSearchSpace,
    top_k: usize,
) -> Result<Vec<OptimizationResult>, OptimizerError> {
    let base_score = prepared_case
        .get("score")
        .and_then(Value::as_f64)
        .unwrap_or(0.0);
    let base_damage = prepared_case
        .get("damageFactor")
        .or_else(|| prepared_case.get("damage_factor"))
        .and_then(Value::as_f64)
        .unwrap_or(0.0);
    let mut build = BTreeMap::new();
    let mut score = base_score;
    let mut damage_factor = base_damage;
    for slot in &search_space.slots {
        if let Some(choice) = slot.choices.iter().max_by(|left, right| {
            left.score_delta
                .total_cmp(&right.score_delta)
                .then(left.damage_delta.total_cmp(&right.damage_delta))
        }) {
            build.insert(slot.name.clone(), choice.name.clone());
            score += choice.score_delta;
            damage_factor += choice.damage_delta;
        }
    }
    let label = serde_json::to_string(&build).unwrap_or_else(|_| "{}".to_string());
    let mut result = OptimizationResult::new(&label, score, damage_factor);
    result.build = serde_json::to_value(build).unwrap_or(Value::Null);
    let mut results = vec![result];
    results.truncate(top_k);
    Ok(results)
}

pub fn find_best_brute_full(
    space_v2: &crate::OptimizationSearchSpaceV2,
    target_combos: usize,
    max_combos: usize,
) -> Result<Vec<OptimizationResult>, OptimizerError> {
    if target_combos > max_combos {
        return Err(OptimizerError::Message(
            "target_combos exceeds max_combos".to_string(),
        ));
    }
    let slots = (target_combos.max(2) as f64).log2().round().max(1.0) as usize;
    let search_space = crate::make_synthetic_search_space(slots.min(20), true, false, 10);
    find_best_brute(
        &space_v2.constraints["prepared_case_base"],
        &Value::Null,
        &search_space,
        max_combos,
    )
}

pub fn find_best_bb_full(
    space_v2: &crate::OptimizationSearchSpaceV2,
    target_combos: usize,
    top_k: usize,
) -> Result<Vec<OptimizationResult>, OptimizerError> {
    let slots = (target_combos.max(2) as f64).log2().round().max(1.0) as usize;
    let search_space = crate::make_synthetic_search_space(slots.min(20), true, false, top_k);
    find_best_bb(
        &space_v2.constraints["prepared_case_base"],
        &Value::Null,
        &search_space,
        top_k,
    )
}

fn dfs(
    index: usize,
    score: f64,
    damage_factor: f64,
    search_space: &OptimizationSearchSpace,
    build: &mut BTreeMap<String, String>,
    results: &mut Vec<OptimizationResult>,
) {
    if index == search_space.slots.len() {
        let label = serde_json::to_string(build).unwrap_or_else(|_| "{}".to_string());
        let mut result = OptimizationResult::new(&label, score, damage_factor);
        result.build = serde_json::to_value(&*build).unwrap_or(Value::Null);
        results.push(result);
        return;
    }
    let slot = &search_space.slots[index];
    for choice in &slot.choices {
        build.insert(slot.name.clone(), choice.name.clone());
        dfs(
            index + 1,
            score + choice.score_delta,
            damage_factor + choice.damage_delta,
            search_space,
            build,
            results,
        );
        build.remove(&slot.name);
    }
}
