use tttg_forge_core::tech_parts::{default_tech_parts, TechMode, TechRarity, TwinbornCategory};

#[test]
fn default_tech_parts_cover_sio_gt_counts() {
    let parts = default_tech_parts();

    assert_eq!(parts.len(), 10);
    let energy = parts
        .iter()
        .find(|part| part.id == TwinbornCategory::EnergyGuidanceSystem)
        .unwrap();
    assert_eq!(energy.mode, Some(TechMode::DroneMode));
    assert_eq!(energy.resonance, 3000);
    assert!(energy.equipped);

    let quantum = parts
        .iter()
        .find(|part| part.id == TwinbornCategory::QuantumNanobot)
        .unwrap();
    assert_eq!(quantum.mode, Some(TechMode::DurianMode));
    assert_eq!(quantum.resonance, 3000);
}

#[test]
fn tech_rarity_has_ten_gt_steps() {
    assert_eq!(TechRarity::ALL.len(), 10);
}

#[test]
fn tech_part_validation_rejects_out_of_range_twinborn_level() {
    let mut part = default_tech_parts()[0].clone();
    part.twinborn_level = 6;

    assert!(part.validate().is_err());
}
