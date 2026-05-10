use serde_json::Value;

const DEFAULT_OBJECTIVES: [&str; 2] = ["score", "damage"];

pub fn resolve_pareto_objectives(constraints: &Value) -> Vec<String> {
    let Some(entries) = constraints.get("objectives").and_then(Value::as_array) else {
        return default_objectives();
    };
    let mut objectives = Vec::new();
    for entry in entries.iter().filter_map(Value::as_str) {
        let normalized = normalize_objective(entry);
        match normalized {
            "normal" => {
                push_unique(&mut objectives, "score");
                push_unique(&mut objectives, "damage");
            }
            "score" | "damage" | "boss" | "lme1" | "ee" | "turf" => {
                push_unique(&mut objectives, normalized);
            }
            "" => {}
            _ => {}
        }
    }
    if objectives.is_empty() {
        default_objectives()
    } else {
        objectives
    }
}

pub fn objective_value(candidate: &Value, objective: &str) -> f64 {
    let keys: &[&str] = match objective {
        "score" => &["score"],
        "damage" => &["damageFactor", "damage_factor", "damage"],
        "boss" => &["bossDamage", "boss_damage", "damageBoss"],
        "lme1" => &["lme1Damage", "lme1_damage"],
        "ee" => &[
            "eeScore",
            "ee_score",
            "eeDamage",
            "ee_damage",
            "endlessEchelonScore",
            "endless_echelon_score",
            "endlessEchelonDamage",
            "endless_echelon_damage",
        ],
        "turf" => &[
            "turfScore",
            "turf_score",
            "turfDamage",
            "turf_damage",
            "turfWarScore",
            "turf_war_score",
            "turfWarDamage",
            "turf_war_damage",
        ],
        _ => &[],
    };
    first_number(candidate, keys).unwrap_or(0.0)
}

fn normalize_objective(entry: &str) -> &'static str {
    match entry
        .trim()
        .to_ascii_lowercase()
        .replace([' ', '-'], "_")
        .as_str()
    {
        "normal" => "normal",
        "score" => "score",
        "damage" => "damage",
        "boss" | "boss_damage" => "boss",
        "lme1" | "lme_1" | "lme1_damage" => "lme1",
        "ee" | "endless_echelon" | "endless_echelon_score" | "endless_echelon_damage" => "ee",
        "turf" | "turf_war" | "turf_score" | "turf_damage" | "turf_war_score"
        | "turf_war_damage" => "turf",
        _ => "",
    }
}

pub fn pareto_frontier_smoke_with_constraints(
    candidates: &[Value],
    constraints: &Value,
) -> Vec<usize> {
    let objectives = resolve_pareto_objectives(constraints);
    let objective_refs = objectives.iter().map(String::as_str).collect::<Vec<_>>();
    pareto_frontier_smoke_by_objectives(candidates, &objective_refs)
}

pub fn pareto_frontier_smoke_by_objectives(
    candidates: &[Value],
    objectives: &[&str],
) -> Vec<usize> {
    let normalized = if objectives.is_empty() {
        DEFAULT_OBJECTIVES.as_slice()
    } else {
        objectives
    };
    let mut frontier: Vec<usize> = Vec::new();

    for candidate_index in 0..candidates.len() {
        if frontier.iter().any(|existing_index| {
            dominates_by_objectives(
                &candidates[*existing_index],
                &candidates[candidate_index],
                normalized,
            )
        }) {
            continue;
        }
        frontier.retain(|existing_index| {
            !dominates_by_objectives(
                &candidates[candidate_index],
                &candidates[*existing_index],
                normalized,
            )
        });
        frontier.push(candidate_index);
    }

    frontier.sort_by(|left_index, right_index| {
        let left = &candidates[*left_index];
        let right = &candidates[*right_index];
        for objective in normalized {
            let ordering =
                objective_value(right, objective).total_cmp(&objective_value(left, objective));
            if !ordering.is_eq() {
                return ordering;
            }
        }
        label(left)
            .cmp(label(right))
            .then_with(|| left_index.cmp(right_index))
    });
    frontier
}

pub(crate) fn pareto_frontier_results_by_objectives(
    results: &[crate::OptimizationResult],
    objectives: &[String],
) -> Vec<crate::OptimizationResult> {
    if objectives.is_empty()
        || objectives
            .iter()
            .all(|objective| objective == "score" || objective == "damage")
    {
        return crate::pareto_frontier_strict(results);
    }
    let values = results
        .iter()
        .map(|result| serde_json::to_value(result).unwrap_or(Value::Null))
        .collect::<Vec<_>>();
    pareto_frontier_smoke_by_objectives(
        &values,
        &objectives.iter().map(String::as_str).collect::<Vec<_>>(),
    )
    .into_iter()
    .map(|index| results[index].clone())
    .collect()
}

fn default_objectives() -> Vec<String> {
    DEFAULT_OBJECTIVES
        .iter()
        .map(|objective| (*objective).to_string())
        .collect()
}

fn push_unique(objectives: &mut Vec<String>, objective: &str) {
    if !objectives.iter().any(|existing| existing == objective) {
        objectives.push(objective.to_string());
    }
}

fn dominates_by_objectives(left: &Value, right: &Value, objectives: &[&str]) -> bool {
    let mut strictly_better = false;
    for objective in objectives {
        let left_value = objective_value(left, objective);
        let right_value = objective_value(right, objective);
        if left_value < right_value {
            return false;
        }
        strictly_better |= left_value > right_value;
    }
    strictly_better
}

fn first_number(candidate: &Value, keys: &[&str]) -> Option<f64> {
    for key in keys {
        if let Some(value) = number_at(candidate, key) {
            return Some(value);
        }
        if let Some(value) = candidate
            .get("stats")
            .and_then(|stats| number_at(stats, key))
        {
            return Some(value);
        }
    }
    None
}

fn number_at(value: &Value, key: &str) -> Option<f64> {
    value
        .as_object()
        .and_then(|object| object.get(key))
        .and_then(Value::as_f64)
        .filter(|number| number.is_finite())
}

fn label(value: &Value) -> &str {
    value
        .get("label")
        .and_then(Value::as_str)
        .unwrap_or_default()
}
