use tttg_forge_core::tech_modifier::{compute_tech_modifier, tech_modifier_matrix_entries};

#[test]
fn exo_bracer_drill_uses_gt_coefficient() {
    let value = compute_tech_modifier("Exo Bracer", "Drill", 5.0);

    assert!((value - (1.0 + 0.3636 * 5.0)).abs() < 0.000001);
}

#[test]
fn ammo_thruster_drone_uses_gt_coefficient() {
    let value = compute_tech_modifier("Ammo Thruster", "Drone", 5.0);

    assert!((value - (1.0 + 0.1111 * 5.0)).abs() < 0.000001);
}

#[test]
fn energy_cube_modes_return_level_multiplier() {
    let value = compute_tech_modifier("Energy Cube", "Laser Mode", 3.0);

    assert!((value - 3.0).abs() < 0.000001);
}

#[test]
fn tech_modifier_matrix_exports_all_gt_entries() {
    let entries = tech_modifier_matrix_entries();

    assert_eq!(entries.len(), 37);
    for entry in entries {
        let expected = if entry.returns_level {
            5.0
        } else {
            1.0 + entry.coefficient * 5.0
        };
        assert!(
            (compute_tech_modifier(entry.base_tech, entry.target, 5.0) - expected).abs() < 0.000001,
            "{entry:?}"
        );
    }
}
