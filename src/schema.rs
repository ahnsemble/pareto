use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::BTreeSet;
use thiserror::Error;

#[derive(Debug, Error, PartialEq)]
pub enum LegalityError {
    #[error("{0}")]
    Message(String),
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct OptimizationSearchSpaceV2 {
    pub hero_candidates: Vec<String>,
    pub collectible_inventory: Value,
    pub tech_deployed: Vec<String>,
    pub custom_set_fills: Vec<Vec<String>>,
    pub skill_toggles: Value,
    pub pet_slots: Value,
    pub evo_tree: Vec<String>,
    pub constraints: Value,
}

impl OptimizationSearchSpaceV2 {
    pub fn validate(&self) -> Result<(), LegalityError> {
        require(!self.hero_candidates.is_empty(), "hero_candidates must not be empty")?;
        require_unique(&self.hero_candidates, "hero_candidates")?;
        require_unique(&self.tech_deployed, "tech_deployed")?;
        let inventory = self
            .collectible_inventory
            .as_object()
            .ok_or_else(|| LegalityError::Message("collectible_inventory must be an object".to_string()))?;
        require(!inventory.is_empty(), "collectible_inventory must not be empty")?;
        require(self.custom_set_fills.len() == 3, "custom_set_fills must contain exactly 3 groups")?;
        let sizes = self
            .constraints
            .get("custom_set_sizes")
            .and_then(Value::as_array)
            .map(|items| items.iter().map(|value| value.as_u64().unwrap_or(0) as usize).collect::<Vec<_>>())
            .unwrap_or_else(|| vec![4, 8, 8]);
        require(sizes.len() == 3, "constraints.custom_set_sizes must contain 3 sizes")?;
        for (index, expected_size) in sizes.iter().enumerate() {
            let fill = &self.custom_set_fills[index];
            require(
                fill.len() == *expected_size,
                &format!("custom_set_fills[{index}] must contain exactly {expected_size} collectibles"),
            )?;
            let mut seen = BTreeSet::new();
            for name in fill {
                if name == "None" {
                    continue;
                }
                require(inventory.contains_key(name), &format!("unknown collectible in custom_set_fills[{index}]: {name}"))?;
                require(seen.insert(name), &format!("custom_set_fills[{index}] cannot contain duplicates: {name}"))?;
            }
        }
        let pet_slot_keys = self
            .constraints
            .get("pet_slot_keys")
            .and_then(Value::as_array)
            .map(|items| items.iter().filter_map(Value::as_str).map(str::to_string).collect::<BTreeSet<_>>())
            .unwrap_or_else(|| {
                let mut keys = BTreeSet::from(["active".to_string()]);
                for index in 1..8 {
                    keys.insert(format!("support_{index}"));
                }
                keys
            });
        let actual_slots = self
            .pet_slots
            .as_object()
            .map(|object| object.keys().cloned().collect::<BTreeSet<_>>())
            .unwrap_or_default();
        require(actual_slots == pet_slot_keys, "pet_slots must contain active + 7 support slots")?;
        require(self.evo_tree.len() == 4, "evo_tree must contain exactly 4 nodes")?;
        require_unique(&self.evo_tree, "evo_tree")?;
        Ok(())
    }
}

pub fn valid_minimal_constraints() -> Value {
    json!({
        "custom_set_sizes": [4, 8, 8],
        "pet_slot_keys": ["active", "support_1", "support_2", "support_3", "support_4", "support_5", "support_6", "support_7"],
        "prepared_case_base": {
            "score": 1000.0,
            "damageFactor": 100.0,
            "stats": {},
            "damageStats": {},
            "ceDamageTechs": {},
            "attackMeta": {},
            "skills": {},
            "passivePools": [],
            "calcMode": "damage",
            "gameMode": ""
        }
    })
}

fn require(condition: bool, message: &str) -> Result<(), LegalityError> {
    if condition {
        Ok(())
    } else {
        Err(LegalityError::Message(message.to_string()))
    }
}

fn require_unique(values: &[String], label: &str) -> Result<(), LegalityError> {
    let set = values.iter().collect::<BTreeSet<_>>();
    require(set.len() == values.len(), &format!("{label} entries must be unique"))
}
