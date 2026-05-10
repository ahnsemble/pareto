use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::{BTreeMap, BTreeSet};

#[derive(Clone, Copy, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DiffDirection {
    Added,
    Removed,
    Changed,
    Increased,
    Decreased,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct BuildDiffEntry {
    pub path: String,
    pub before: Value,
    pub after: Value,
    pub direction: DiffDirection,
    pub magnitude: f64,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct BuildDiffSummary {
    pub changed_count: usize,
    pub added_count: usize,
    pub removed_count: usize,
    pub entries: Vec<BuildDiffEntry>,
}

pub fn build_diff(before: &Value, after: &Value) -> BuildDiffSummary {
    let before_flat = flatten_leaf_values(before);
    let after_flat = flatten_leaf_values(after);
    let paths = before_flat
        .keys()
        .chain(after_flat.keys())
        .cloned()
        .collect::<BTreeSet<_>>();
    let mut entries = Vec::new();

    for path in paths {
        let before_value = before_flat.get(&path);
        let after_value = after_flat.get(&path);
        if before_value == after_value {
            continue;
        }
        let (direction, magnitude) = classify_diff(before_value, after_value);
        entries.push(BuildDiffEntry {
            path,
            before: before_value.cloned().unwrap_or(Value::Null),
            after: after_value.cloned().unwrap_or(Value::Null),
            direction,
            magnitude,
        });
    }

    BuildDiffSummary {
        changed_count: entries.len(),
        added_count: entries
            .iter()
            .filter(|entry| entry.direction == DiffDirection::Added)
            .count(),
        removed_count: entries
            .iter()
            .filter(|entry| entry.direction == DiffDirection::Removed)
            .count(),
        entries,
    }
}

fn classify_diff(before: Option<&Value>, after: Option<&Value>) -> (DiffDirection, f64) {
    match (before, after) {
        (None, Some(value)) => (DiffDirection::Added, numeric_abs(value)),
        (Some(value), None) => (DiffDirection::Removed, numeric_abs(value)),
        (Some(before), Some(after)) => {
            if let (Some(left), Some(right)) = (before.as_f64(), after.as_f64()) {
                let direction = if right >= left {
                    DiffDirection::Increased
                } else {
                    DiffDirection::Decreased
                };
                (direction, (right - left).abs())
            } else {
                (DiffDirection::Changed, 0.0)
            }
        }
        (None, None) => (DiffDirection::Changed, 0.0),
    }
}

fn numeric_abs(value: &Value) -> f64 {
    value.as_f64().unwrap_or(0.0).abs()
}

fn flatten_leaf_values(value: &Value) -> BTreeMap<String, Value> {
    let mut flattened = BTreeMap::new();
    flatten_into("", value, &mut flattened);
    flattened
}

fn flatten_into(prefix: &str, value: &Value, flattened: &mut BTreeMap<String, Value>) {
    match value {
        Value::Object(object) => {
            for (key, entry) in object {
                let next = if prefix.is_empty() {
                    key.clone()
                } else {
                    format!("{prefix}.{key}")
                };
                flatten_into(&next, entry, flattened);
            }
        }
        _ => {
            let path = if prefix.is_empty() { "$" } else { prefix };
            flattened.insert(path.to_string(), value.clone());
        }
    }
}
