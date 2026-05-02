use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct OptimizationResult {
    pub label: String,
    pub score: f64,
    #[serde(rename = "damageFactor", alias = "damage_factor")]
    pub damage_factor: f64,
    pub build: Value,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct ParetoSmokeCandidate {
    pub label: Option<String>,
    pub score: f64,
    #[serde(rename = "damage", alias = "damageFactor", alias = "damage_factor")]
    pub damage_factor: f64,
}

pub type SmokeCandidate = ParetoSmokeCandidate;

impl OptimizationResult {
    pub fn new(label: &str, score: f64, damage_factor: f64) -> Self {
        Self {
            label: label.to_string(),
            score,
            damage_factor,
            build: json!({ "label": label }),
        }
    }
}

pub fn dominated_by_strict(
    frontier: &[OptimizationResult],
    candidate: &OptimizationResult,
) -> bool {
    frontier.iter().any(|element| dominates(element, candidate))
}

pub fn pareto_frontier_strict(results: &[OptimizationResult]) -> Vec<OptimizationResult> {
    let mut frontier: Vec<OptimizationResult> = Vec::new();
    for candidate in results {
        if dominated_by_strict(&frontier, candidate) {
            continue;
        }
        frontier.retain(|existing| !dominates(candidate, existing));
        frontier.push(candidate.clone());
    }
    frontier.sort_by(|left, right| {
        right
            .score
            .total_cmp(&left.score)
            .then(right.damage_factor.total_cmp(&left.damage_factor))
            .then(left.label.cmp(&right.label))
    });
    frontier
}

pub fn pareto_frontier_smoke(candidates: &[ParetoSmokeCandidate]) -> Vec<usize> {
    let indexed: Vec<(usize, OptimizationResult)> = candidates
        .iter()
        .enumerate()
        .map(|(index, candidate)| (index, candidate.as_optimization_result(index)))
        .collect();
    let mut frontier: Vec<(usize, OptimizationResult)> = Vec::new();

    for candidate in indexed {
        if frontier
            .iter()
            .any(|existing| dominates(&existing.1, &candidate.1))
        {
            continue;
        }
        frontier.retain(|existing| !dominates(&candidate.1, &existing.1));
        frontier.push(candidate);
    }

    frontier.sort_by(|left, right| {
        right
            .1
            .score
            .total_cmp(&left.1.score)
            .then(right.1.damage_factor.total_cmp(&left.1.damage_factor))
            .then(left.1.label.cmp(&right.1.label))
            .then(left.0.cmp(&right.0))
    });
    frontier
        .into_iter()
        .map(|(index, _candidate)| index)
        .collect()
}

pub(crate) fn dominates(left: &OptimizationResult, right: &OptimizationResult) -> bool {
    let not_worse_score = left.score >= right.score;
    let not_worse_damage = left.damage_factor >= right.damage_factor;
    let strictly_better_score = left.score > right.score;
    let strictly_better_damage = left.damage_factor > right.damage_factor;
    not_worse_score && not_worse_damage && (strictly_better_score || strictly_better_damage)
}

impl ParetoSmokeCandidate {
    fn as_optimization_result(&self, index: usize) -> OptimizationResult {
        let label = self.label.clone().unwrap_or_default();
        OptimizationResult {
            label: label.clone(),
            score: self.score,
            damage_factor: self.damage_factor,
            build: json!({ "label": label, "index": index }),
        }
    }
}

pub fn find_best_pareto(
    prepared_case: &serde_json::Value,
    _attack_meta: &serde_json::Value,
    search_space: &crate::search_space::OptimizationSearchSpace,
    _objectives: &[String],
    beam_width: usize,
) -> Result<Vec<OptimizationResult>, crate::OptimizerError> {
    let mut results = crate::branch_bound::find_best_brute(
        prepared_case,
        &Value::Null,
        search_space,
        usize::MAX,
    )?;
    results.truncate(beam_width.max(1));
    Ok(pareto_frontier_strict(&results))
}
