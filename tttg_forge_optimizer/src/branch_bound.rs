use crate::{OptimizationResult, OptimizationSearchSpace, OptimizerError, SearchSlot};
use serde_json::Value;
use std::cmp::Ordering;
use std::collections::BTreeMap;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum UpperBoundStrategy {
    LooseCombined,
    TightSeparate,
}

#[derive(Clone, Debug, Default, Eq, PartialEq)]
pub struct BranchBoundMetrics {
    pub visited_nodes: usize,
    pub pruned_nodes: usize,
    pub leaf_nodes: usize,
}

#[derive(Clone, Debug, PartialEq)]
pub struct BranchBoundOutcome {
    pub results: Vec<OptimizationResult>,
    pub metrics: BranchBoundMetrics,
}

impl BranchBoundMetrics {
    pub fn pruning_rate(&self) -> f64 {
        let total = self.visited_nodes.saturating_add(self.pruned_nodes);
        if total == 0 {
            0.0
        } else {
            self.pruned_nodes as f64 / total as f64
        }
    }
}

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
    attack_meta: &Value,
    search_space: &OptimizationSearchSpace,
    top_k: usize,
) -> Result<Vec<OptimizationResult>, OptimizerError> {
    Ok(find_best_bb_with_metrics(prepared_case, attack_meta, search_space, top_k)?.results)
}

pub fn find_best_bb_with_metrics(
    prepared_case: &Value,
    attack_meta: &Value,
    search_space: &OptimizationSearchSpace,
    top_k: usize,
) -> Result<BranchBoundOutcome, OptimizerError> {
    find_best_bb_with_strategy(
        prepared_case,
        attack_meta,
        search_space,
        top_k,
        UpperBoundStrategy::TightSeparate,
    )
}

pub fn find_best_bb_with_strategy(
    prepared_case: &Value,
    _attack_meta: &Value,
    search_space: &OptimizationSearchSpace,
    top_k: usize,
    strategy: UpperBoundStrategy,
) -> Result<BranchBoundOutcome, OptimizerError> {
    let base_score = prepared_case
        .get("score")
        .and_then(Value::as_f64)
        .unwrap_or(0.0);
    let base_damage = prepared_case
        .get("damageFactor")
        .or_else(|| prepared_case.get("damage_factor"))
        .and_then(Value::as_f64)
        .unwrap_or(0.0);
    let mut search_space = search_space.clone();
    for slot in &mut search_space.slots {
        slot.choices.sort_by(|left, right| {
            right
                .score_delta
                .total_cmp(&left.score_delta)
                .then(right.damage_delta.total_cmp(&left.damage_delta))
                .then(left.name.cmp(&right.name))
        });
    }
    let mut build = BTreeMap::new();
    let mut results = Vec::new();
    let mut metrics = BranchBoundMetrics::default();
    dfs_bb(
        0,
        base_score,
        base_damage,
        &search_space,
        top_k.max(1),
        strategy,
        &mut build,
        &mut results,
        &mut metrics,
    );
    Ok(BranchBoundOutcome { results, metrics })
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

fn dfs_bb(
    index: usize,
    score: f64,
    damage_factor: f64,
    search_space: &OptimizationSearchSpace,
    top_k: usize,
    strategy: UpperBoundStrategy,
    build: &mut BTreeMap<String, String>,
    results: &mut Vec<OptimizationResult>,
    metrics: &mut BranchBoundMetrics,
) {
    metrics.visited_nodes += 1;
    if can_prune(
        score,
        damage_factor,
        &search_space.slots[index..],
        results,
        top_k,
        strategy,
    ) {
        metrics.pruned_nodes = metrics
            .pruned_nodes
            .saturating_add(skipped_descendant_nodes(&search_space.slots[index..]));
        return;
    }

    if index == search_space.slots.len() {
        metrics.leaf_nodes += 1;
        let label = serde_json::to_string(build).unwrap_or_else(|_| "{}".to_string());
        let mut result = OptimizationResult::new(&label, score, damage_factor);
        result.build = serde_json::to_value(&*build).unwrap_or(Value::Null);
        push_top_result(results, result, top_k);
        return;
    }

    let slot = &search_space.slots[index];
    if slot.choices.is_empty() {
        dfs_bb(
            index + 1,
            score,
            damage_factor,
            search_space,
            top_k,
            strategy,
            build,
            results,
            metrics,
        );
        return;
    }

    for choice in &slot.choices {
        build.insert(slot.name.clone(), choice.name.clone());
        dfs_bb(
            index + 1,
            score + choice.score_delta,
            damage_factor + choice.damage_delta,
            search_space,
            top_k,
            strategy,
            build,
            results,
            metrics,
        );
        build.remove(&slot.name);
    }
}

fn can_prune(
    score: f64,
    damage_factor: f64,
    remaining_slots: &[SearchSlot],
    results: &[OptimizationResult],
    top_k: usize,
    strategy: UpperBoundStrategy,
) -> bool {
    if results.len() < top_k {
        return false;
    }
    let Some(worst) = results.last() else {
        return false;
    };
    let (upper_score, upper_damage) =
        upper_bound_pair(score, damage_factor, remaining_slots, strategy);
    upper_score < worst.score || (upper_score == worst.score && upper_damage < worst.damage_factor)
}

fn upper_bound_pair(
    score: f64,
    damage_factor: f64,
    remaining_slots: &[SearchSlot],
    strategy: UpperBoundStrategy,
) -> (f64, f64) {
    match strategy {
        UpperBoundStrategy::LooseCombined => {
            let bonus = remaining_slots
                .iter()
                .map(|slot| {
                    slot.choices
                        .iter()
                        .map(|choice| choice.score_delta + choice.damage_delta)
                        .fold(0.0, f64::max)
                })
                .sum::<f64>();
            (score + bonus, damage_factor + bonus)
        }
        UpperBoundStrategy::TightSeparate => {
            let score_bonus = remaining_slots
                .iter()
                .map(|slot| {
                    slot.choices
                        .iter()
                        .map(|choice| choice.score_delta)
                        .fold(0.0, f64::max)
                })
                .sum::<f64>();
            let damage_bonus = remaining_slots
                .iter()
                .map(|slot| {
                    slot.choices
                        .iter()
                        .map(|choice| choice.damage_delta)
                        .fold(0.0, f64::max)
                })
                .sum::<f64>();
            (score + score_bonus, damage_factor + damage_bonus)
        }
    }
}

fn push_top_result(
    results: &mut Vec<OptimizationResult>,
    result: OptimizationResult,
    top_k: usize,
) {
    results.push(result);
    results.sort_by(result_order);
    results.truncate(top_k);
}

fn skipped_descendant_nodes(remaining_slots: &[SearchSlot]) -> usize {
    let mut nodes = 1usize;
    let mut layer = 1usize;
    for slot in remaining_slots {
        layer = layer.saturating_mul(slot.choices.len().max(1));
        nodes = nodes.saturating_add(layer);
    }
    nodes.saturating_sub(1)
}

fn result_order(left: &OptimizationResult, right: &OptimizationResult) -> Ordering {
    right
        .score
        .total_cmp(&left.score)
        .then(right.damage_factor.total_cmp(&left.damage_factor))
        .then(left.label.cmp(&right.label))
}
