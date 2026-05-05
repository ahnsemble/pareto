use serde_json::{Map, Value};

pub const PET_STATES: &[&str] = &["early", "mid", "endgame"];

pub fn pet_state_multiplier(state: &str) -> f64 {
    match state {
        "early" => 1.0,
        "mid" => 1.45,
        "endgame" => 2.05,
        _ => 1.0,
    }
}

pub fn pet_delta(input: &Value) -> Value {
    let state = input
        .get("state")
        .and_then(Value::as_str)
        .unwrap_or("early");
    let mult = pet_state_multiplier(state);
    let mut out: Map<String, Value> = Map::new();
    if let Some(stats) = input.get("baseStats").and_then(Value::as_object) {
        for (key, value) in stats {
            let v = value.as_f64().unwrap_or(0.0);
            out.insert(key.clone(), Value::from(v * mult));
        }
    }
    Value::Object(out)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn approx(a: f64, b: f64) -> bool {
        (a - b).abs() < 1e-9
    }

    #[test]
    fn pet_states_constant_matches_codex_three_state_abstraction() {
        assert_eq!(PET_STATES.len(), 3);
        assert_eq!(PET_STATES, &["early", "mid", "endgame"]);
    }

    #[test]
    fn early_state_multiplier_is_unit() {
        assert!(approx(pet_state_multiplier("early"), 1.0));
    }

    #[test]
    fn mid_state_multiplier_is_calibrated() {
        assert!(approx(pet_state_multiplier("mid"), 1.45));
    }

    #[test]
    fn endgame_state_multiplier_is_calibrated() {
        assert!(approx(pet_state_multiplier("endgame"), 2.05));
    }

    #[test]
    fn pet_delta_scales_base_stats_by_state() {
        let input = json!({
            "state": "endgame",
            "baseStats": {"atk": 0.10, "hp": 0.06}
        });
        let result = pet_delta(&input);
        assert!(approx(result["atk"].as_f64().unwrap(), 0.205));
        assert!(approx(result["hp"].as_f64().unwrap(), 0.123));
    }

    #[test]
    fn pet_delta_unknown_state_falls_back_to_early() {
        let input = json!({"state": "ascended", "baseStats": {"hp": 0.08}});
        let result = pet_delta(&input);
        assert!(approx(result["hp"].as_f64().unwrap(), 0.08));
    }
}
