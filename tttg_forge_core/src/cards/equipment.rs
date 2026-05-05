use serde_json::{Map, Value};

pub const EQUIPMENT_TOP3_SLOTS: &[&str] = &["weapon", "ring", "necklace"];

pub fn equipment_delta(input: &Value) -> Value {
    let mut merged: Map<String, Value> = Map::new();
    for slot in EQUIPMENT_TOP3_SLOTS {
        let Some(stats) = input.get(slot).and_then(Value::as_object) else {
            continue;
        };
        for (key, value) in stats {
            let v = value.as_f64().unwrap_or(0.0);
            let current = merged.get(key).and_then(Value::as_f64).unwrap_or(0.0);
            merged.insert(key.clone(), Value::from(current + v));
        }
    }
    Value::Object(merged)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn top3_slots_constant_matches_codex_recommendation() {
        assert_eq!(EQUIPMENT_TOP3_SLOTS.len(), 3);
        assert_eq!(EQUIPMENT_TOP3_SLOTS, &["weapon", "ring", "necklace"]);
    }

    #[test]
    fn empty_input_yields_empty_object() {
        assert_eq!(equipment_delta(&json!({})), json!({}));
    }

    #[test]
    fn single_weapon_stat_passthrough() {
        let input = json!({"weapon": {"atk": 0.15}});
        assert_eq!(equipment_delta(&input), json!({"atk": 0.15}));
    }

    #[test]
    fn three_slot_sum_combines_overlapping_keys() {
        let input = json!({
            "weapon": {"atk": 0.10},
            "ring": {"atk": 0.05, "critRate": 0.08},
            "necklace": {"critRate": 0.06}
        });
        let result = equipment_delta(&input);
        let approx = |a: f64, b: f64| (a - b).abs() < 1e-9;
        assert!(approx(result["atk"].as_f64().unwrap(), 0.15));
        assert!(approx(result["critRate"].as_f64().unwrap(), 0.14));
    }

    #[test]
    fn non_top3_slot_ignored() {
        let input = json!({
            "armor": {"def": 0.99},
            "gloves": {"atkSpeed": 0.20},
            "boots": {"moveSpeed": 0.15},
            "weapon": {"atk": 0.10}
        });
        let result = equipment_delta(&input);
        assert!(result.get("def").is_none());
        assert!(result.get("atkSpeed").is_none());
        assert!(result.get("moveSpeed").is_none());
        assert_eq!(result["atk"].as_f64().unwrap(), 0.10);
    }

    #[test]
    fn non_numeric_value_treated_as_zero() {
        let input = json!({"ring": {"atk": "not a number"}});
        let result = equipment_delta(&input);
        assert_eq!(result["atk"].as_f64().unwrap(), 0.0);
    }
}
