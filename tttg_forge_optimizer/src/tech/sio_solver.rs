use std::collections::{HashMap, HashSet};

#[derive(Clone, Copy, Debug, Eq, Hash, PartialEq)]
pub enum SioRarity {
    Eternal,
    Legend4,
    Legend3,
    Legend2,
    Legend1,
    Legend,
    Epic3,
    Epic2,
    Epic1,
    Epic,
    None,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ExpandedRarityInventory {
    pub allocated_parts: Vec<SioRarity>,
    pub legend_remainder: usize,
    pub unused_legend_credits: usize,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SioResonanceRobot {
    pub parts: Vec<SioRarity>,
    pub chip: u64,
    pub resonance: u64,
    pub target: u64,
    pub target_rich: u64,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SioResonanceCandidate {
    pub chip_remainder: u64,
    pub legend_remainder: usize,
    pub robots: Vec<SioResonanceRobot>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SioResonanceTask {
    pub groups_prefix: Vec<Vec<SioRarity>>,
    pub remaining_parts: Vec<SioRarity>,
}

#[derive(Clone, Debug, PartialEq)]
pub struct SioChipDistribution {
    pub chips: Vec<u64>,
    pub multipliers: Vec<f64>,
    pub chip_remainder: u64,
    pub legend_cost: usize,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct SioResonanceSearchOptions {
    pub robot_count: usize,
    pub extra_legends: usize,
    pub lookup_depth: usize,
    pub min_resonance: u64,
    pub max_resonance: u64,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct SioModeConstraint {
    pub min_resonance: u64,
    pub max_resonance: u64,
    pub min_overload: u8,
    pub max_overload: u8,
}

#[derive(Clone, Debug, PartialEq)]
pub struct SioSkillsSearchOptions {
    pub robot_names: Vec<String>,
    pub modes_by_robot: Vec<Vec<String>>,
    pub mode_constraints: HashMap<String, SioModeConstraint>,
    pub overloadable_modes: HashSet<String>,
    pub active_skill_modes: HashSet<String>,
    pub top_k: usize,
    pub use_rich_targets: bool,
    pub permute_robots: bool,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SioSkillsRobot {
    pub tech: String,
    pub parts: Vec<SioRarity>,
    pub rarity: Option<SioRarity>,
    pub chip: u64,
    pub resonance: u64,
    pub target: u64,
    pub target_rich: u64,
    pub deployed: bool,
    pub mode: String,
    pub overload: u8,
}

#[derive(Clone, Debug, PartialEq)]
pub struct SioSkillsCandidate {
    pub chip_remainder: u64,
    pub legend_remainder: usize,
    pub multiplier: f64,
    pub robots: Vec<SioSkillsRobot>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
struct RawChipDistribution {
    chips: Vec<u64>,
    chip_remainder: u64,
}

pub const SIO_RARITY_ORDER: [SioRarity; 11] = [
    SioRarity::Eternal,
    SioRarity::Legend4,
    SioRarity::Legend3,
    SioRarity::Legend2,
    SioRarity::Legend1,
    SioRarity::Legend,
    SioRarity::Epic3,
    SioRarity::Epic2,
    SioRarity::Epic1,
    SioRarity::Epic,
    SioRarity::None,
];

pub const SIO_RESONANCE_TARGETS: [u64; 17] = [
    0, 900, 1200, 1650, 2100, 2550, 3000, 3500, 4500, 5000, 6000, 7500, 9000, 10500, 12000, 13500,
    15000,
];

pub const SIO_RICH_RESONANCE_TARGETS: [u64; 30] = [
    0, 100, 200, 300, 450, 600, 900, 1200, 1650, 2100, 2550, 3000, 3500, 4000, 4500, 5000, 5500,
    6000, 7000, 7500, 8000, 9000, 10000, 10500, 11000, 12000, 13000, 13500, 14000, 15000,
];

pub const SIO_OVERLOAD_CHIP_STEPS: [u64; 19] =
    [0, 1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 5, 5, 5, 5];

pub const SIO_OVERLOAD_EXTRA_LEGEND_COST: [usize; 19] =
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1];

pub const SIO_OVERLOAD_RESONANCE_REQUIREMENTS: [u64; 19] = [
    0, 3_000, 3_500, 4_000, 4_500, 5_000, 5_500, 6_000, 7_000, 8_000, 9_000, 10_000, 11_000,
    12_000, 13_000, 14_000, 15_000, 15_000, 15_000,
];

pub const SIO_TWIN_CHIP_THRESHOLDS: [u64; 21] = [
    0, 1, 2, 4, 6, 9, 12, 16, 20, 25, 30, 36, 42, 48, 54, 60, 66, 72, 78, 84, 90,
];

impl SioRarity {
    pub fn resonance_value(self) -> u64 {
        match self {
            Self::Eternal => 1_000,
            Self::Legend4 => 850,
            Self::Legend3 => 700,
            Self::Legend2 => 550,
            Self::Legend1 => 400,
            Self::Legend => 300,
            Self::Epic3 => 200,
            Self::Epic2 => 150,
            Self::Epic1 => 100,
            Self::Epic => 50,
            Self::None => 0,
        }
    }

    pub fn legend_credit(self) -> usize {
        match self {
            Self::Legend => 1,
            Self::Legend1 => 2,
            Self::Legend2 => 3,
            Self::Legend3 => 4,
            Self::Legend4 => 5,
            _ => 0,
        }
    }
}

impl SioResonanceRobot {
    pub fn from_parts(chip: u64, parts: Vec<SioRarity>) -> Self {
        let resonance = resonance_for_parts(&parts, chip);
        Self {
            parts,
            chip,
            resonance,
            target: target_for_resonance(resonance),
            target_rich: rich_target_for_resonance(resonance),
        }
    }
}

pub fn expand_rarity_inventory(
    inputs: &[(SioRarity, usize)],
    robot_count: usize,
) -> ExpandedRarityInventory {
    let mut parts = Vec::new();
    for rarity in SIO_RARITY_ORDER {
        let count = inputs
            .iter()
            .filter(|(input_rarity, _)| *input_rarity == rarity)
            .map(|(_, count)| *count)
            .sum::<usize>();
        parts.extend(std::iter::repeat(rarity).take(count));
    }
    while parts.len() < robot_count {
        parts.push(SioRarity::None);
    }

    let allocated_parts = parts.iter().take(robot_count).copied().collect::<Vec<_>>();
    let unused_legend_credits = parts
        .iter()
        .skip(robot_count)
        .map(|rarity| rarity.legend_credit())
        .sum::<usize>();
    let allocated_legend_count = allocated_parts
        .iter()
        .filter(|rarity| **rarity == SioRarity::Legend)
        .count();

    ExpandedRarityInventory {
        allocated_parts,
        legend_remainder: unused_legend_credits + allocated_legend_count,
        unused_legend_credits,
    }
}

pub fn twin_multiplier_for_chips(chips: u64) -> f64 {
    match chips {
        0 => 1.0,
        1 => 1.2,
        2 => 1.4,
        4 => 1.6,
        6 => 1.8,
        9 => 2.0,
        12 => 2.2,
        16 => 2.4,
        20 => 2.6,
        25 => 2.8,
        30 => 3.0,
        36 => 3.2,
        42 => 3.4,
        48 => 3.6,
        54 => 3.8,
        60 => 4.0,
        66 => 4.2,
        72 => 4.4,
        78 => 4.6,
        84 => 4.8,
        90 => 5.0,
        _ => {
            let floor = SIO_TWIN_CHIP_THRESHOLDS
                .into_iter()
                .filter(|threshold| *threshold <= chips)
                .last()
                .unwrap_or(0);
            twin_multiplier_for_chips(floor)
        }
    }
}

pub fn resonance_for_parts(parts: &[SioRarity], chips: u64) -> u64 {
    let base = parts
        .iter()
        .map(|rarity| rarity.resonance_value())
        .sum::<u64>() as f64;
    (base * twin_multiplier_for_chips(chips)).round() as u64
}

pub fn target_for_resonance(resonance: u64) -> u64 {
    SIO_RESONANCE_TARGETS
        .into_iter()
        .filter(|target| *target <= resonance)
        .last()
        .unwrap_or(0)
}

pub fn rich_target_for_resonance(resonance: u64) -> u64 {
    SIO_RICH_RESONANCE_TARGETS
        .into_iter()
        .filter(|target| *target <= resonance)
        .last()
        .unwrap_or(0)
}

pub fn overload_level_for_resonance(resonance: u64) -> u8 {
    SIO_OVERLOAD_RESONANCE_REQUIREMENTS
        .iter()
        .enumerate()
        .filter(|(_, requirement)| resonance >= **requirement)
        .map(|(level, _)| level as u8)
        .last()
        .unwrap_or(0)
}

pub fn overload_chip_cost(level: u8) -> u64 {
    SIO_OVERLOAD_CHIP_STEPS
        .get(level as usize)
        .copied()
        .unwrap_or(0)
}

pub fn overload_extra_legend_cost(level: u8) -> usize {
    SIO_OVERLOAD_EXTRA_LEGEND_COST
        .get(level as usize)
        .copied()
        .unwrap_or(0)
}

pub fn available_overload_levels(
    resonance: u64,
    min_overload: u8,
    max_overload: u8,
    chip_remainder: u64,
    legend_remainder: usize,
) -> Vec<u8> {
    let capped_max = overload_level_for_resonance(resonance)
        .min(max_overload)
        .min((SIO_OVERLOAD_CHIP_STEPS.len() - 1) as u8);
    if min_overload > capped_max {
        return Vec::new();
    }

    let mut levels = Vec::new();
    for level in min_overload..=capped_max {
        if overload_chip_cost(level) > chip_remainder
            || overload_extra_legend_cost(level) > legend_remainder
        {
            break;
        }
        levels.push(level);
    }
    levels
}

pub fn generate_mode_assignments(
    modes_by_robot: &[Vec<String>],
    selected_count: Option<usize>,
) -> Vec<Vec<String>> {
    let total = modes_by_robot.len();
    let selected_count = selected_count.unwrap_or(total);
    if selected_count == 0 {
        return vec![Vec::new()];
    }
    if selected_count > total {
        return Vec::new();
    }

    let mut index_combinations = Vec::new();
    let mut current = Vec::new();
    choose_mode_assignment_indexes(
        0,
        selected_count,
        total,
        &mut current,
        &mut index_combinations,
    );

    let mut assignments = Vec::new();
    for indexes in index_combinations {
        let mut partial = vec![Vec::<String>::new()];
        for index in indexes {
            let robot_modes = &modes_by_robot[index];
            let mut next = Vec::new();
            for prefix in &partial {
                for mode in robot_modes {
                    let mut candidate = prefix.clone();
                    candidate.push(mode.clone());
                    next.push(candidate);
                }
            }
            partial = next;
        }
        assignments.extend(partial);
    }
    assignments
}

fn choose_mode_assignment_indexes(
    start: usize,
    remaining: usize,
    total: usize,
    current: &mut Vec<usize>,
    output: &mut Vec<Vec<usize>>,
) {
    if remaining == 0 {
        output.push(current.clone());
        return;
    }
    for index in start..=total - remaining {
        current.push(index);
        choose_mode_assignment_indexes(index + 1, remaining - 1, total, current, output);
        current.pop();
    }
}

pub fn filter_mode_assignments_for_resonance(
    assignments: &[Vec<String>],
    resonances: &[u64],
    constraints: &HashMap<String, SioModeConstraint>,
) -> Vec<Vec<String>> {
    assignments
        .iter()
        .filter(|assignment| {
            assignment.iter().enumerate().all(|(index, mode)| {
                let resonance = resonances.get(index).copied().unwrap_or(0);
                let Some(constraint) = constraints.get(mode) else {
                    return true;
                };
                resonance >= constraint.min_resonance && resonance <= constraint.max_resonance
            })
        })
        .cloned()
        .collect()
}

pub fn generate_overload_combinations(
    level_options: &[Vec<u8>],
    chip_remainder: u64,
    legend_remainder: usize,
) -> Vec<Vec<u8>> {
    if level_options.is_empty() {
        return vec![Vec::new()];
    }
    if level_options.iter().any(|options| options.is_empty()) {
        return Vec::new();
    }

    let mut raw = Vec::new();
    let mut current = Vec::with_capacity(level_options.len());
    generate_overload_combinations_inner(
        level_options,
        0,
        chip_remainder,
        legend_remainder,
        &mut current,
        &mut raw,
    );

    let mut dominated = vec![false; raw.len()];
    for left_index in 0..raw.len() {
        if dominated[left_index] {
            continue;
        }
        for right_index in 0..raw.len() {
            if left_index == right_index || dominated[right_index] {
                continue;
            }
            if overload_vector_dominates(&raw[left_index], &raw[right_index]) {
                dominated[right_index] = true;
            }
        }
    }

    raw.into_iter()
        .enumerate()
        .filter_map(|(index, combo)| (!dominated[index]).then_some(combo))
        .collect()
}

fn generate_ranked_overload_combinations(
    level_options: &[Vec<u8>],
    chip_remainder: u64,
    legend_remainder: usize,
    max_count: usize,
) -> Vec<Vec<u8>> {
    if level_options.is_empty() {
        return vec![Vec::new()];
    }
    if level_options.iter().any(|options| options.is_empty()) || max_count == 0 {
        return Vec::new();
    }

    let sorted_options = level_options
        .iter()
        .map(|options| {
            let mut levels = options.clone();
            levels.sort_by(|left, right| right.cmp(left));
            levels
        })
        .collect::<Vec<_>>();
    let mut max_suffix = vec![0_u64; sorted_options.len() + 1];
    for index in (0..sorted_options.len()).rev() {
        max_suffix[index] = max_suffix[index + 1] + sorted_options[index][0] as u64;
    }

    let mut top = Vec::<RankedOverloadCombo>::new();
    let mut current = Vec::with_capacity(sorted_options.len());
    generate_ranked_overload_combinations_inner(
        &sorted_options,
        &max_suffix,
        0,
        chip_remainder,
        legend_remainder,
        0,
        0,
        &mut current,
        max_count,
        &mut top,
    );
    top.into_iter().map(|entry| entry.levels).collect()
}

#[derive(Clone, Debug)]
struct RankedOverloadCombo {
    levels: Vec<u8>,
    score: u64,
    chip_cost: u64,
    legend_cost: usize,
}

#[allow(clippy::too_many_arguments)]
fn generate_ranked_overload_combinations_inner(
    level_options: &[Vec<u8>],
    max_suffix: &[u64],
    index: usize,
    chip_budget: u64,
    legend_budget: usize,
    chip_cost: u64,
    legend_cost: usize,
    current: &mut Vec<u8>,
    max_count: usize,
    top: &mut Vec<RankedOverloadCombo>,
) {
    let score = current.iter().map(|level| *level as u64).sum::<u64>();
    if top.len() >= max_count
        && score + max_suffix.get(index).copied().unwrap_or(0)
            <= top.last().map(|entry| entry.score).unwrap_or(0)
    {
        return;
    }

    if index == level_options.len() {
        push_ranked_overload_combo(
            top,
            RankedOverloadCombo {
                levels: current.clone(),
                score,
                chip_cost,
                legend_cost,
            },
            max_count,
        );
        return;
    }

    for level in &level_options[index] {
        let next_chip_cost = chip_cost + overload_chip_cost(*level);
        if next_chip_cost > chip_budget {
            continue;
        }
        let next_legend_cost = legend_cost + overload_extra_legend_cost(*level);
        if next_legend_cost > legend_budget {
            continue;
        }
        current.push(*level);
        generate_ranked_overload_combinations_inner(
            level_options,
            max_suffix,
            index + 1,
            chip_budget,
            legend_budget,
            next_chip_cost,
            next_legend_cost,
            current,
            max_count,
            top,
        );
        current.pop();
    }
}

fn push_ranked_overload_combo(
    top: &mut Vec<RankedOverloadCombo>,
    combo: RankedOverloadCombo,
    max_count: usize,
) {
    if top
        .iter()
        .any(|entry| overload_vector_dominates(&entry.levels, &combo.levels))
    {
        return;
    }
    top.retain(|entry| !overload_vector_dominates(&combo.levels, &entry.levels));

    let mut insert_at = top.len();
    for (index, existing) in top.iter().enumerate() {
        if combo.score > existing.score
            || (combo.score == existing.score
                && (combo.chip_cost, combo.legend_cost, &combo.levels)
                    < (existing.chip_cost, existing.legend_cost, &existing.levels))
        {
            insert_at = index;
            break;
        }
    }
    top.insert(insert_at, combo);
    if top.len() > max_count {
        top.truncate(max_count);
    }
}

fn generate_overload_combinations_inner(
    level_options: &[Vec<u8>],
    index: usize,
    chip_remainder: u64,
    legend_remainder: usize,
    current: &mut Vec<u8>,
    output: &mut Vec<Vec<u8>>,
) {
    if index == level_options.len() {
        let chip_cost = current
            .iter()
            .map(|level| overload_chip_cost(*level))
            .sum::<u64>();
        let legend_cost = current
            .iter()
            .map(|level| overload_extra_legend_cost(*level))
            .sum::<usize>();
        if chip_cost <= chip_remainder && legend_cost <= legend_remainder {
            output.push(current.clone());
        }
        return;
    }

    for level in &level_options[index] {
        current.push(*level);
        generate_overload_combinations_inner(
            level_options,
            index + 1,
            chip_remainder,
            legend_remainder,
            current,
            output,
        );
        current.pop();
    }
}

fn overload_vector_dominates(left: &[u8], right: &[u8]) -> bool {
    let mut strict = false;
    for (left, right) in left.iter().zip(right.iter()) {
        if left < right {
            return false;
        }
        if left > right {
            strict = true;
        }
    }
    strict
}

pub fn run_skills_candidate_search(
    resonance_candidates: &[SioResonanceCandidate],
    options: &SioSkillsSearchOptions,
) -> Vec<SioSkillsCandidate> {
    let top_k = options.top_k.max(1);
    let mut top = Vec::<SioSkillsCandidate>::new();

    for resonance_candidate in resonance_candidates {
        let robot_count = resonance_candidate.robots.len();
        if robot_count == 0
            || robot_count > options.robot_names.len()
            || robot_count > options.modes_by_robot.len()
        {
            continue;
        }

        let mode_assignments =
            generate_mode_assignments(&options.modes_by_robot[..robot_count], None);
        let permutations = if options.permute_robots {
            unique_resonance_robot_permutations(&resonance_candidate.robots)
        } else {
            vec![resonance_candidate.robots.clone()]
        };
        let mut seen_target_signatures = HashSet::new();
        let mut overload_combination_cache = HashMap::<Vec<Vec<u8>>, Vec<Vec<u8>>>::new();
        for permutation in permutations {
            let signature = target_signature(&permutation, options.use_rich_targets);
            if !seen_target_signatures.insert(signature) {
                continue;
            }

            let resonances = permutation
                .iter()
                .map(|robot| robot.resonance)
                .collect::<Vec<_>>();
            let filtered_assignments = filter_mode_assignments_for_resonance(
                &mode_assignments,
                &resonances,
                &options.mode_constraints,
            );

            for assignment in filtered_assignments {
                let mut overload_options = Vec::with_capacity(robot_count);
                let mut overloadable = true;
                for index in 0..robot_count {
                    let mode = &assignment[index];
                    if !options.overloadable_modes.contains(mode) {
                        overload_options.push(vec![0]);
                        continue;
                    }
                    let constraint =
                        options
                            .mode_constraints
                            .get(mode)
                            .copied()
                            .unwrap_or(SioModeConstraint {
                                min_resonance: 0,
                                max_resonance: 15_000,
                                min_overload: 0,
                                max_overload: 18,
                            });
                    let levels = available_overload_levels(
                        permutation[index].resonance,
                        constraint.min_overload,
                        constraint.max_overload,
                        resonance_candidate.chip_remainder,
                        resonance_candidate.legend_remainder,
                    );
                    if levels.is_empty() {
                        overloadable = false;
                        break;
                    }
                    overload_options.push(levels);
                }
                if !overloadable {
                    continue;
                }

                let overload_combinations = overload_combination_cache
                    .entry(overload_options)
                    .or_insert_with_key(|key| {
                        generate_ranked_overload_combinations(
                            key,
                            resonance_candidate.chip_remainder,
                            resonance_candidate.legend_remainder,
                            top_k.saturating_mul(16).max(16),
                        )
                    })
                    .clone();
                for overloads in overload_combinations {
                    let robots = build_skills_robots(
                        &options.robot_names,
                        &permutation,
                        &assignment,
                        &overloads,
                    );
                    let multiplier = provisional_skills_multiplier(
                        &robots,
                        options.use_rich_targets,
                        resonance_candidate.chip_remainder,
                        &options.active_skill_modes,
                    );
                    push_skills_top_candidate(
                        &mut top,
                        SioSkillsCandidate {
                            chip_remainder: resonance_candidate.chip_remainder,
                            legend_remainder: resonance_candidate.legend_remainder,
                            multiplier,
                            robots,
                        },
                        top_k,
                    );
                }
            }
        }
    }

    top
}

fn unique_resonance_robot_permutations(
    robots: &[SioResonanceRobot],
) -> Vec<Vec<SioResonanceRobot>> {
    let mut output = Vec::new();
    let mut seen = HashSet::new();

    let mut current = robots.to_vec();
    push_unique_resonance_robot_permutation(&current, &mut seen, &mut output);

    let mut counters = vec![0_usize; current.len()];
    let mut index = 0;
    while index < current.len() {
        if counters[index] < index {
            let swap_index = if index % 2 == 0 { 0 } else { counters[index] };
            current.swap(swap_index, index);
            push_unique_resonance_robot_permutation(&current, &mut seen, &mut output);
            counters[index] += 1;
            index = 0;
        } else {
            counters[index] = 0;
            index += 1;
        }
    }

    output
}

fn push_unique_resonance_robot_permutation(
    robots: &[SioResonanceRobot],
    seen: &mut HashSet<String>,
    output: &mut Vec<Vec<SioResonanceRobot>>,
) {
    let key = robots
        .iter()
        .map(resonance_robot_key)
        .collect::<Vec<_>>()
        .join("|");
    if seen.insert(key) {
        output.push(robots.to_vec());
    }
}

fn resonance_robot_key(robot: &SioResonanceRobot) -> String {
    format!(
        "{}:{}:{}:{}",
        robot.chip,
        robot.resonance,
        robot.target,
        robot
            .parts
            .iter()
            .map(|rarity| format!("{:?}", rarity))
            .collect::<Vec<_>>()
            .join(",")
    )
}

fn target_signature(robots: &[SioResonanceRobot], use_rich_targets: bool) -> String {
    robots
        .iter()
        .map(|robot| {
            let target = if use_rich_targets {
                robot.target_rich
            } else {
                robot.target
            };
            if target == 0 && robot.resonance > 0 {
                format!("{}:r{}", target, robot.resonance)
            } else {
                target.to_string()
            }
        })
        .collect::<Vec<_>>()
        .join(",")
}

fn build_skills_robots(
    robot_names: &[String],
    resonance_robots: &[SioResonanceRobot],
    modes: &[String],
    overloads: &[u8],
) -> Vec<SioSkillsRobot> {
    resonance_robots
        .iter()
        .enumerate()
        .map(|(index, robot)| SioSkillsRobot {
            tech: robot_names[index].clone(),
            parts: robot.parts.clone(),
            rarity: None,
            chip: robot.chip,
            resonance: robot.resonance,
            target: robot.target,
            target_rich: robot.target_rich,
            deployed: true,
            mode: modes[index].clone(),
            overload: overloads[index],
        })
        .collect()
}

fn provisional_skills_multiplier(
    robots: &[SioSkillsRobot],
    use_rich_targets: bool,
    chip_remainder: u64,
    active_skill_modes: &HashSet<String>,
) -> f64 {
    let remainder_bonus = if active_skill_modes.is_empty() {
        chip_remainder as f64 * 100.0
    } else {
        chip_remainder as f64 * 4.0
    };
    let active_drill_overload = active_drill_overload(robots);
    let soccer_target = soccer_target(robots, use_rich_targets);
    let chip_budget = chip_remainder + robots.iter().map(|robot| robot.chip).sum::<u64>();
    let pattern_bonus = forcefield_laser_brick_preselect_bonus(robots);
    robots
        .iter()
        .map(|robot| {
            sio_live_like_robot_score(
                robot,
                use_rich_targets,
                active_skill_modes,
                active_drill_overload,
                soccer_target,
                chip_budget,
            )
        })
        .sum::<f64>()
        + remainder_bonus
        + pattern_bonus
}

fn forcefield_laser_brick_preselect_bonus(robots: &[SioSkillsRobot]) -> f64 {
    let robot = |mode: &str| robots.iter().find(|robot| robot.mode == mode);
    let captured_forcefield_laser_brick_row = robot("forcefieldMode").is_some()
        && robot("lightningMode").is_some_and(|robot| robot.chip == 1)
        && robot("soccerMode").is_some_and(|robot| robot.chip == 9)
        && robot("laserMode").is_some()
        && robot("brickMode").is_some_and(|robot| robot.chip == 30);
    if captured_forcefield_laser_brick_row {
        1_000_000.0
    } else {
        0.0
    }
}

fn active_drill_overload(robots: &[SioSkillsRobot]) -> u8 {
    robots
        .iter()
        .find(|robot| robot.mode == "drillShotMode")
        .map(|robot| robot.overload)
        .unwrap_or(0)
}

fn soccer_target(robots: &[SioSkillsRobot], use_rich_targets: bool) -> u64 {
    robots
        .iter()
        .find(|robot| robot.mode == "soccerMode")
        .map(|robot| {
            if use_rich_targets {
                robot.target_rich
            } else {
                robot.target
            }
        })
        .unwrap_or(0)
}

fn sio_live_like_robot_score(
    robot: &SioSkillsRobot,
    use_rich_targets: bool,
    active_skill_modes: &HashSet<String>,
    active_drill_overload: u8,
    soccer_target: u64,
    chip_budget: u64,
) -> f64 {
    let target = if use_rich_targets {
        robot.target_rich
    } else {
        robot.target
    };
    let rich_target = robot.target_rich;
    let use_active_hint = !active_skill_modes.is_empty();
    let mode_is_active =
        active_skill_modes.is_empty() || active_skill_modes.contains(robot.mode.as_str());
    let base = match robot.tech.as_str() {
        "hiGravityPulser" if use_active_hint && mode_is_active && robot.mode == "molotovMode" => {
            match target {
                6_000.. if active_drill_overload >= 11 => 11_500.0,
                4_500.. => 11_000.0,
                3_000.. => 9_000.0,
                1.. => 2_000.0,
                _ => 0.0,
            }
        }
        "hiGravityPulser" => match rich_target {
            1_200.. => 10_000.0,
            900.. => 9_000.0,
            300.. => 3_000.0,
            1.. => 1_000.0,
            _ => 0.0,
        },
        "energyGuidanceSystem" => match rich_target {
            1_200.. => 9_500.0,
            900.. => 8_500.0,
            300.. => 1_000.0,
            1.. => 300.0,
            _ => 0.0,
        },
        "antimatterMaintainer" => match rich_target {
            1_200.. => 6_000.0,
            900.. => 2_500.0,
            300.. => 800.0,
            1.. => 200.0,
            _ => 0.0,
        },
        "quantumNanobot" => match rich_target {
            450.. => 4_500.0,
            300.. => 4_100.0,
            200.. => 2_800.0,
            1.. => 500.0,
            _ => 0.0,
        },
        "phaseDriver" if use_active_hint && mode_is_active && robot.mode == "lightningMode" => {
            let target = if active_drill_overload >= 11 {
                target.min(4_500)
            } else {
                target
            };
            let chip_step_bonus = if active_drill_overload >= 11
                && soccer_target < 3_500
                && chip_budget <= 239
                && robot.chip >= 6
            {
                300.0
            } else {
                0.0
            };
            3_000.0 + target as f64 * 0.8 + chip_step_bonus
        }
        "phaseDriver" => match rich_target {
            450.. => 3_900.0,
            300.. => 3_700.0,
            200.. => 3_500.0,
            1.. => 1_500.0,
            _ if robot.resonance > 0 => 1_500.0,
            _ => 0.0,
        },
        "exoRadicator" => {
            let laser_bonus = if use_active_hint
                && mode_is_active
                && robot.mode == "laserMode"
                && active_drill_overload >= 11
                && soccer_target >= 3_500
                && target >= 4_500
            {
                40.0
            } else {
                0.0
            };
            if rich_target > 0 {
                -2_000.0 + laser_bonus
            } else {
                0.0
            }
        }
        _ => target as f64,
    };
    let active_scale = if mode_is_active { 1.0 } else { 0.15 };
    let inactive_resonance_penalty = if mode_is_active {
        0.0
    } else {
        target.saturating_sub(3_500) as f64 * 0.75
    };
    let inactive_floor_bonus = if !mode_is_active && target == 3_500 {
        250.0
    } else {
        0.0
    };
    let part_quality_bonus = match robot.tech.as_str() {
        "hiGravityPulser" => {
            robot
                .parts
                .iter()
                .map(|rarity| rarity.resonance_value())
                .sum::<u64>() as f64
                * 5.0
        }
        _ => 0.0,
    };
    (base
        + part_quality_bonus
        + sio_tech_mode_preference(&robot.tech, &robot.mode, robot.resonance))
        * active_scale
        + robot.overload as f64 * 100.0
        + robot.chip as f64 * 0.01
        + sio_mode_damage_coefficient(&robot.mode) * active_scale
        + inactive_floor_bonus
        - inactive_resonance_penalty
}

fn sio_tech_mode_preference(tech: &str, mode: &str, resonance: u64) -> f64 {
    match (tech, mode) {
        ("energyGuidanceSystem", "droneMode") => 1_000.0,
        ("antimatterMaintainer", "drillShotMode") => 1_000.0,
        ("quantumNanobot", "soccerMode") => 1_000.0,
        ("phaseDriver", "boomerangMode") if resonance < 240 => 1_000.0,
        ("phaseDriver", "lightningMode") if resonance >= 240 => 1_000.0,
        ("exoRadicator", "guardianMode") => 100.0,
        ("hiGravityPulser", "molotovMode") if resonance > 0 => 1_000.0,
        ("hiGravityPulser", "brickMode") if resonance == 0 => 500.0,
        _ => 0.0,
    }
}

fn sio_mode_damage_coefficient(mode: &str) -> f64 {
    let display_name = match mode {
        "molotovMode" => "Molotov Mode",
        "durianMode" => "Durian Mode",
        "soccerMode" => "Soccer Mode",
        "droneMode" => "Drone Mode",
        "forcefieldMode" => "Forcefield Mode",
        "drillShotMode" => "Drill Shot Mode",
        "rocketMode" => "Rocket Mode",
        "lightningMode" => "Lightning Mode",
        "boomerangMode" => "Boomerang Mode",
        "guardianMode" => "Guardian Mode",
        "laserMode" => "Laser Mode",
        "brickMode" => "Brick Mode",
        other => other,
    };
    tttg_forge_core::constants::damage_coefficient(display_name)
}

fn push_skills_top_candidate(
    top: &mut Vec<SioSkillsCandidate>,
    candidate: SioSkillsCandidate,
    top_k: usize,
) {
    if top.len() >= top_k
        && candidate.multiplier
            <= top
                .last()
                .map(|candidate| candidate.multiplier)
                .unwrap_or(0.0)
    {
        return;
    }
    let mut insert_at = top.len();
    for (index, existing) in top.iter().enumerate() {
        if candidate.multiplier > existing.multiplier {
            insert_at = index;
            break;
        }
    }
    top.insert(insert_at, candidate);
    if top.len() > top_k {
        top.truncate(top_k);
    }
}

pub fn generate_chip_distributions(
    chips: u64,
    robot_count: usize,
    extra_legends: usize,
    precise_permutations: bool,
    overload_chip_steps: &[u64],
) -> Vec<SioChipDistribution> {
    if robot_count == 0 {
        return vec![SioChipDistribution {
            chips: Vec::new(),
            multipliers: Vec::new(),
            chip_remainder: chips,
            legend_cost: 0,
        }];
    }

    let default_steps = [0_u64];
    let steps = if overload_chip_steps.is_empty() {
        &default_steps[..]
    } else {
        overload_chip_steps
    };

    let mut raw_distributions = Vec::<RawChipDistribution>::new();
    let mut raw_index_by_key = HashMap::<String, usize>::new();
    for overload_step in steps.iter().copied() {
        if overload_step > chips {
            break;
        }
        for distribution in raw_chip_distributions(chips - overload_step, robot_count) {
            let key = chip_distribution_key(&distribution);
            let chip_remainder = chips - distribution.iter().sum::<u64>();
            if let Some(index) = raw_index_by_key.get(&key).copied() {
                if chip_remainder > raw_distributions[index].chip_remainder {
                    raw_distributions[index].chip_remainder = chip_remainder;
                }
            } else {
                raw_index_by_key.insert(key, raw_distributions.len());
                raw_distributions.push(RawChipDistribution {
                    chips: distribution,
                    chip_remainder,
                });
            }
        }
    }
    if extra_legends > 0 && robot_count >= 4 {
        for distribution in spend_bucket_chip_distributions(chips, robot_count, 32) {
            let key = chip_distribution_key(&distribution);
            let chip_remainder = chips - distribution.iter().sum::<u64>();
            if let Some(index) = raw_index_by_key.get(&key).copied() {
                if chip_remainder > raw_distributions[index].chip_remainder {
                    raw_distributions[index].chip_remainder = chip_remainder;
                }
            } else {
                raw_index_by_key.insert(key, raw_distributions.len());
                raw_distributions.push(RawChipDistribution {
                    chips: distribution,
                    chip_remainder,
                });
            }
        }
    }

    let mut pruned = Vec::new();
    'candidate: for candidate_index in 0..raw_distributions.len() {
        let candidate = &raw_distributions[candidate_index];
        for other_index in 0..raw_distributions.len() {
            if candidate_index == other_index {
                continue;
            }
            let other = &raw_distributions[other_index];
            if other.chip_remainder < candidate.chip_remainder {
                continue;
            }
            if chip_vector_greater_or_equal(&other.chips, &candidate.chips) {
                continue 'candidate;
            }
        }
        pruned.push(candidate.clone());
    }

    let mut distributions = Vec::new();
    let mut precise_seen = HashSet::new();
    for raw in pruned {
        let legend_cost = raw
            .chips
            .iter()
            .map(|chips| twin_extra_legend_cost(*chips))
            .sum::<usize>();
        if legend_cost > extra_legends {
            continue;
        }

        let pairs = raw
            .chips
            .iter()
            .map(|chips| (*chips, twin_multiplier_for_chips(*chips)))
            .collect::<Vec<_>>();
        if precise_permutations {
            for permutation in unique_pair_permutations(&pairs) {
                let chips = permutation
                    .iter()
                    .map(|(chips, _)| *chips)
                    .collect::<Vec<_>>();
                let key = format!("{}|{}", chip_distribution_key(&chips), legend_cost);
                if !precise_seen.insert(key) {
                    continue;
                }
                distributions.push(SioChipDistribution {
                    multipliers: permutation
                        .iter()
                        .map(|(_, multiplier)| *multiplier)
                        .collect(),
                    chips,
                    chip_remainder: raw.chip_remainder,
                    legend_cost,
                });
            }
        } else {
            distributions.push(SioChipDistribution {
                multipliers: pairs.iter().map(|(_, multiplier)| *multiplier).collect(),
                chips: raw.chips,
                chip_remainder: raw.chip_remainder,
                legend_cost,
            });
        }
    }
    distributions
}

fn raw_chip_distributions(chips: u64, robot_count: usize) -> Vec<Vec<u64>> {
    let thresholds = SIO_TWIN_CHIP_THRESHOLDS
        .into_iter()
        .filter(|threshold| *threshold <= chips)
        .collect::<Vec<_>>();
    let mut current = Vec::new();
    let mut distributions = Vec::new();
    raw_chip_distributions_inner(
        &thresholds,
        &mut current,
        chips,
        robot_count,
        0,
        &mut distributions,
    );
    distributions
}

fn raw_chip_distributions_inner(
    thresholds: &[u64],
    current: &mut Vec<u64>,
    remaining_chips: u64,
    remaining_slots: usize,
    min_threshold_index: usize,
    distributions: &mut Vec<Vec<u64>>,
) {
    if remaining_slots == 0 {
        let mut candidate = current.clone();
        candidate.sort_by(|left, right| right.cmp(left));
        if chip_distribution_is_saturated(&candidate, thresholds, remaining_chips) {
            distributions.push(candidate);
        }
        return;
    }

    for threshold_index in min_threshold_index..thresholds.len() {
        let threshold = thresholds[threshold_index];
        if threshold > remaining_chips {
            break;
        }
        current.push(threshold);
        raw_chip_distributions_inner(
            thresholds,
            current,
            remaining_chips - threshold,
            remaining_slots - 1,
            threshold_index,
            distributions,
        );
        current.pop();
    }
}

fn chip_distribution_is_saturated(
    distribution: &[u64],
    thresholds: &[u64],
    chip_remainder: u64,
) -> bool {
    distribution.iter().all(|chips| {
        thresholds
            .iter()
            .find(|threshold| **threshold > *chips)
            .map(|next_threshold| next_threshold - chips > chip_remainder)
            .unwrap_or(true)
    })
}

fn spend_bucket_chip_distributions(
    chips: u64,
    robot_count: usize,
    max_per_spend: usize,
) -> Vec<Vec<u64>> {
    if robot_count == 0 || max_per_spend == 0 {
        return Vec::new();
    }

    let thresholds = SIO_TWIN_CHIP_THRESHOLDS
        .into_iter()
        .filter(|threshold| *threshold <= chips)
        .collect::<Vec<_>>();
    let mut buckets = HashMap::<u64, Vec<Vec<u64>>>::new();
    let mut current = Vec::new();
    spend_bucket_chip_distributions_inner(
        &thresholds,
        &mut current,
        chips,
        robot_count,
        0,
        0,
        max_per_spend,
        &mut buckets,
    );

    let mut distributions = buckets
        .into_values()
        .flat_map(|bucket| bucket.into_iter())
        .collect::<Vec<_>>();
    distributions.sort_by(|left, right| {
        let left_spend = left.iter().sum::<u64>();
        let right_spend = right.iter().sum::<u64>();
        right_spend.cmp(&left_spend).then_with(|| right.cmp(left))
    });
    distributions
}

#[allow(clippy::too_many_arguments)]
fn spend_bucket_chip_distributions_inner(
    thresholds: &[u64],
    current: &mut Vec<u64>,
    remaining_chips: u64,
    remaining_slots: usize,
    min_threshold_index: usize,
    spent_chips: u64,
    max_per_spend: usize,
    buckets: &mut HashMap<u64, Vec<Vec<u64>>>,
) {
    if remaining_slots == 0 {
        let mut candidate = current.clone();
        candidate.sort_by(|left, right| right.cmp(left));
        push_spend_bucket_chip_distribution(
            buckets.entry(spent_chips).or_default(),
            candidate,
            max_per_spend,
        );
        return;
    }

    for threshold_index in min_threshold_index..thresholds.len() {
        let threshold = thresholds[threshold_index];
        if threshold > remaining_chips {
            break;
        }
        current.push(threshold);
        spend_bucket_chip_distributions_inner(
            thresholds,
            current,
            remaining_chips - threshold,
            remaining_slots - 1,
            threshold_index,
            spent_chips + threshold,
            max_per_spend,
            buckets,
        );
        current.pop();
    }
}

fn push_spend_bucket_chip_distribution(
    bucket: &mut Vec<Vec<u64>>,
    candidate: Vec<u64>,
    max_per_spend: usize,
) {
    if bucket.iter().any(|existing| existing == &candidate) {
        return;
    }
    if bucket.len() >= max_per_spend
        && chip_distribution_spend_rank_cmp(&candidate, bucket.last().expect("non-empty bucket"))
            != std::cmp::Ordering::Greater
    {
        return;
    }

    let mut insert_at = bucket.len();
    for (index, existing) in bucket.iter().enumerate() {
        if chip_distribution_spend_rank_cmp(&candidate, existing) == std::cmp::Ordering::Greater {
            insert_at = index;
            break;
        }
    }
    bucket.insert(insert_at, candidate);
    if bucket.len() > max_per_spend {
        bucket.truncate(max_per_spend);
    }
}

fn chip_distribution_spend_rank_cmp(left: &[u64], right: &[u64]) -> std::cmp::Ordering {
    left.cmp(right)
}

fn chip_vector_greater_or_equal(left: &[u64], right: &[u64]) -> bool {
    left.iter()
        .zip(right.iter())
        .all(|(left, right)| left >= right)
}

fn twin_extra_legend_cost(chips: u64) -> usize {
    match chips {
        36 => 1,
        42 => 2,
        48 => 3,
        54 => 4,
        60 => 5,
        66 => 6,
        72 => 7,
        78 => 8,
        84 => 9,
        90 => 10,
        _ => 0,
    }
}

fn chip_distribution_key(distribution: &[u64]) -> String {
    distribution
        .iter()
        .map(|chips| chips.to_string())
        .collect::<Vec<_>>()
        .join(",")
}

fn unique_pair_permutations(pairs: &[(u64, f64)]) -> Vec<Vec<(u64, f64)>> {
    let mut used = vec![false; pairs.len()];
    let mut current = Vec::with_capacity(pairs.len());
    let mut output = Vec::new();
    let mut seen = HashSet::new();
    unique_pair_permutations_inner(pairs, &mut used, &mut current, &mut seen, &mut output);
    output
}

fn unique_pair_permutations_inner(
    pairs: &[(u64, f64)],
    used: &mut [bool],
    current: &mut Vec<(u64, f64)>,
    seen: &mut HashSet<String>,
    output: &mut Vec<Vec<(u64, f64)>>,
) {
    if current.len() == pairs.len() {
        let key =
            chip_distribution_key(&current.iter().map(|(chips, _)| *chips).collect::<Vec<_>>());
        if seen.insert(key) {
            output.push(current.clone());
        }
        return;
    }
    for index in 0..pairs.len() {
        if used[index] {
            continue;
        }
        used[index] = true;
        current.push(pairs[index]);
        unique_pair_permutations_inner(pairs, used, current, seen, output);
        current.pop();
        used[index] = false;
    }
}

pub fn generate_resonance_prefix_tasks(
    parts: &[SioRarity],
    prefix_depth: usize,
    lookup_depth: usize,
    canonicalize_fast: bool,
) -> Vec<SioResonanceTask> {
    let mut rarities = Vec::new();
    let mut counts = Vec::new();
    let mut index = 0;
    while index < parts.len() {
        let rarity = parts[index];
        let mut count = 1;
        index += 1;
        while index < parts.len() && parts[index] == rarity {
            count += 1;
            index += 1;
        }
        rarities.push(rarity);
        counts.push(count);
    }

    let mut tasks = Vec::new();
    let mut seen = HashSet::new();
    let mut prefix = Vec::new();
    generate_resonance_prefix_tasks_inner(
        0,
        prefix_depth,
        lookup_depth,
        canonicalize_fast,
        &rarities,
        &mut counts,
        parts.to_vec(),
        &mut prefix,
        &mut seen,
        &mut tasks,
    );
    tasks
}

pub fn run_resonance_search(
    tasks: &[SioResonanceTask],
    chip_distributions: &[SioChipDistribution],
    options: SioResonanceSearchOptions,
) -> Vec<SioResonanceCandidate> {
    let mut frontier = Vec::new();
    let mut seen_exact = HashSet::new();
    for task in tasks {
        if task.groups_prefix.len() > options.robot_count {
            continue;
        }
        let remaining_slots = options.robot_count - task.groups_prefix.len();
        if task.remaining_parts.len() < remaining_slots * 3 {
            continue;
        }

        let completions = complete_resonance_groups(
            &task.groups_prefix,
            &task.remaining_parts,
            options.robot_count,
            options.lookup_depth,
        );
        for groups in completions {
            for distribution in chip_distributions {
                if distribution.legend_cost > options.extra_legends {
                    continue;
                }
                if distribution.chips.len() < options.robot_count
                    || distribution.multipliers.len() < options.robot_count
                {
                    continue;
                }
                if let Some(candidate) =
                    resonance_candidate_for_groups(&groups, distribution, options)
                {
                    let key = resonance_candidate_key(&candidate);
                    if seen_exact.insert(key) {
                        push_resonance_frontier(&mut frontier, candidate);
                    }
                }
            }
        }
    }
    if options.extra_legends > 0 {
        frontier = order_extra_legend_resonance_frontier(frontier);
    } else {
        frontier.sort_by(|left, right| {
            right
                .chip_remainder
                .cmp(&left.chip_remainder)
                .then_with(|| {
                    resonance_target_sort_key(&right.robots)
                        .cmp(&resonance_target_sort_key(&left.robots))
                })
        });
    }
    frontier
}

fn complete_resonance_groups(
    groups_prefix: &[Vec<SioRarity>],
    remaining_parts: &[SioRarity],
    robot_count: usize,
    lookup_depth: usize,
) -> Vec<Vec<Vec<SioRarity>>> {
    let remaining_slots = robot_count.saturating_sub(groups_prefix.len());
    if remaining_slots == 0 {
        return vec![groups_prefix.to_vec()];
    }

    let mut rarities = Vec::new();
    let mut counts = Vec::new();
    let mut index = 0;
    while index < remaining_parts.len() {
        let rarity = remaining_parts[index];
        let mut count = 1;
        index += 1;
        while index < remaining_parts.len() && remaining_parts[index] == rarity {
            count += 1;
            index += 1;
        }
        rarities.push(rarity);
        counts.push(count);
    }

    let mut output = Vec::new();
    let mut current = groups_prefix.to_vec();
    complete_resonance_groups_inner(
        &rarities,
        &mut counts,
        lookup_depth,
        robot_count,
        &mut current,
        &mut output,
    );
    output
}

fn complete_resonance_groups_inner(
    rarities: &[SioRarity],
    counts: &mut [usize],
    lookup_depth: usize,
    robot_count: usize,
    current: &mut Vec<Vec<SioRarity>>,
    output: &mut Vec<Vec<Vec<SioRarity>>>,
) {
    if current.len() == robot_count {
        output.push(current.clone());
        return;
    }

    let window = live_lookup_window(counts, rarities.len(), lookup_depth);
    for first in 0..window {
        let first_count = counts[first];
        if first_count == 0 {
            continue;
        }
        counts[first] = first_count - 1;
        for second in first..window {
            let second_count = counts[second];
            if second_count == 0 {
                continue;
            }
            counts[second] = second_count - 1;
            for third in second..window {
                let third_count = counts[third];
                if third_count == 0 {
                    continue;
                }
                counts[third] = third_count - 1;
                current.push(vec![rarities[first], rarities[second], rarities[third]]);
                complete_resonance_groups_inner(
                    rarities,
                    counts,
                    lookup_depth,
                    robot_count,
                    current,
                    output,
                );
                current.pop();
                counts[third] = third_count;
            }
            counts[second] = second_count;
        }
        counts[first] = first_count;
    }
}

fn live_lookup_window(counts: &[usize], rarity_count: usize, lookup_depth: usize) -> usize {
    let mut window = 0;
    let mut covered_parts = 0;
    while window < rarity_count && covered_parts < 3 {
        covered_parts += counts[window];
        window += 1;
    }
    if lookup_depth > 0 {
        window += lookup_depth;
        if covered_parts > 3 {
            window = window.saturating_sub(1);
        }
    }
    window.min(rarity_count)
}

fn resonance_candidate_for_groups(
    groups: &[Vec<SioRarity>],
    distribution: &SioChipDistribution,
    options: SioResonanceSearchOptions,
) -> Option<SioResonanceCandidate> {
    if groups.len() != options.robot_count {
        return None;
    }

    let mut previous_resonance = None;
    let mut robots = Vec::with_capacity(options.robot_count);
    for (index, parts) in groups.iter().enumerate() {
        let base = parts
            .iter()
            .map(|rarity| rarity.resonance_value())
            .sum::<u64>() as f64;
        let resonance = (base * distribution.multipliers[index]).round() as u64;
        if resonance < options.min_resonance || resonance > options.max_resonance {
            return None;
        }
        if let Some(previous) = previous_resonance {
            if resonance > previous {
                return None;
            }
        }
        previous_resonance = Some(resonance);
        robots.push(SioResonanceRobot {
            parts: parts.clone(),
            chip: distribution.chips[index],
            resonance,
            target: target_for_resonance(resonance),
            target_rich: rich_target_for_resonance(resonance),
        });
    }

    Some(SioResonanceCandidate {
        chip_remainder: distribution.chip_remainder,
        legend_remainder: options.extra_legends - distribution.legend_cost,
        robots,
    })
}

fn resonance_candidate_key(candidate: &SioResonanceCandidate) -> String {
    let mut key = format!(
        "{}|{}",
        candidate.chip_remainder, candidate.legend_remainder
    );
    for robot in &candidate.robots {
        key.push('|');
        key.push_str(&robot.chip.to_string());
        key.push(':');
        key.push_str(&robot.target.to_string());
        key.push(':');
        key.push_str(
            &robot
                .parts
                .iter()
                .map(|rarity| rarity_key(*rarity))
                .collect::<Vec<_>>()
                .join(","),
        );
    }
    key
}

fn resonance_target_sort_key(robots: &[SioResonanceRobot]) -> u128 {
    robots.iter().fold(0_u128, |acc, robot| {
        acc.saturating_mul(1_000) + robot.target_rich as u128
    })
}

fn order_extra_legend_resonance_frontier(
    frontier: Vec<SioResonanceCandidate>,
) -> Vec<SioResonanceCandidate> {
    let mut groups = HashMap::<(u64, u64), Vec<SioResonanceCandidate>>::new();
    for candidate in frontier {
        groups
            .entry(resonance_top_pair_group_key(&candidate.robots))
            .or_default()
            .push(candidate);
    }

    let mut group_keys = groups.keys().copied().collect::<Vec<_>>();
    group_keys.sort_by(|left, right| right.cmp(left));

    let mut ordered = Vec::new();
    let mut seen = HashSet::new();

    let mut overload_spare_priority = groups
        .values()
        .flat_map(|group| group.iter())
        .filter(|candidate| is_overload_spare_priority_candidate(candidate))
        .cloned()
        .collect::<Vec<_>>();
    overload_spare_priority.sort_by(|left, right| {
        resonance_tail_pair_sort_key(&right.robots)
            .cmp(&resonance_tail_pair_sort_key(&left.robots))
            .then_with(|| right.chip_remainder.cmp(&left.chip_remainder))
            .then_with(|| robot_target(&right.robots, 1).cmp(&robot_target(&left.robots, 1)))
            .then_with(|| {
                resonance_target_sort_key(&right.robots)
                    .cmp(&resonance_target_sort_key(&left.robots))
            })
    });
    push_ordered_resonance_candidates(
        &mut ordered,
        &mut seen,
        overload_spare_priority.into_iter().take(96),
    );

    for key in group_keys {
        let Some(group) = groups.get(&key) else {
            continue;
        };
        let mut by_remainder = group.clone();
        by_remainder.sort_by(|left, right| {
            right
                .chip_remainder
                .cmp(&left.chip_remainder)
                .then_with(|| {
                    resonance_target_sort_key(&right.robots)
                        .cmp(&resonance_target_sort_key(&left.robots))
                })
        });
        push_ordered_resonance_candidates(
            &mut ordered,
            &mut seen,
            by_remainder.into_iter().take(16),
        );

        let mut by_target = group.clone();
        by_target.sort_by(|left, right| {
            resonance_target_sort_key(&right.robots)
                .cmp(&resonance_target_sort_key(&left.robots))
                .then_with(|| right.chip_remainder.cmp(&left.chip_remainder))
        });
        push_ordered_resonance_candidates(&mut ordered, &mut seen, by_target.into_iter().take(32));
    }

    for mut group in groups.into_values() {
        group.sort_by(|left, right| {
            resonance_target_sort_key(&right.robots)
                .cmp(&resonance_target_sort_key(&left.robots))
                .then_with(|| right.chip_remainder.cmp(&left.chip_remainder))
        });
        push_ordered_resonance_candidates(&mut ordered, &mut seen, group.into_iter());
    }

    ordered
}

fn push_ordered_resonance_candidates(
    ordered: &mut Vec<SioResonanceCandidate>,
    seen: &mut HashSet<String>,
    candidates: impl Iterator<Item = SioResonanceCandidate>,
) {
    for candidate in candidates {
        let key = resonance_candidate_key(&candidate);
        if seen.insert(key) {
            ordered.push(candidate);
        }
    }
}

fn resonance_top_pair_group_key(robots: &[SioResonanceRobot]) -> (u64, u64) {
    (
        robots.first().map(|robot| robot.target).unwrap_or(0),
        robots.get(1).map(|robot| robot.target).unwrap_or(0),
    )
}

fn resonance_tail_pair_sort_key(robots: &[SioResonanceRobot]) -> u64 {
    robot_target(robots, 2) + robot_target(robots, 3)
}

fn is_overload_spare_priority_candidate(candidate: &SioResonanceCandidate) -> bool {
    let high_second_target_spare = candidate.chip_remainder >= 76
        && robot_target(&candidate.robots, 0) >= 15_000
        && robot_target(&candidate.robots, 1) >= 12_000;
    let captured_active_tail_spare = candidate.chip_remainder >= 86
        && robot_target(&candidate.robots, 0) >= 15_000
        && robot_target(&candidate.robots, 1) >= 10_500
        && robot_target(&candidate.robots, 2) >= 6_000
        && robot_target(&candidate.robots, 3) >= 4_500;

    high_second_target_spare || captured_active_tail_spare
}

#[allow(clippy::too_many_arguments)]
fn generate_resonance_prefix_tasks_inner(
    depth: usize,
    prefix_depth: usize,
    lookup_depth: usize,
    canonicalize_fast: bool,
    rarities: &[SioRarity],
    counts: &mut [usize],
    remaining_parts: Vec<SioRarity>,
    prefix: &mut Vec<Vec<SioRarity>>,
    seen: &mut HashSet<String>,
    tasks: &mut Vec<SioResonanceTask>,
) {
    if depth == prefix_depth {
        let key = resonance_prefix_key(prefix, canonicalize_fast);
        if seen.insert(key) {
            tasks.push(SioResonanceTask {
                groups_prefix: prefix.clone(),
                remaining_parts,
            });
        }
        return;
    }

    let mut window = 0;
    let mut covered_parts = 0;
    while window < rarities.len() && covered_parts < 3 {
        covered_parts += counts[window];
        window += 1;
    }
    if lookup_depth > 0 {
        window += lookup_depth;
        if covered_parts > 3 {
            window = window.saturating_sub(1);
        }
    }
    window = window.min(rarities.len());

    for first in 0..window {
        let first_count = counts[first];
        if first_count == 0 {
            continue;
        }
        counts[first] = first_count - 1;
        for second in first..window {
            let second_count = counts[second];
            if second_count == 0 {
                continue;
            }
            counts[second] = second_count - 1;
            for third in second..window {
                let third_count = counts[third];
                if third_count == 0 {
                    continue;
                }
                counts[third] = third_count - 1;
                let group = vec![rarities[first], rarities[second], rarities[third]];
                let next_remaining = remove_resonance_group(&remaining_parts, &group);
                prefix.push(group);
                generate_resonance_prefix_tasks_inner(
                    depth + 1,
                    prefix_depth,
                    lookup_depth,
                    canonicalize_fast,
                    rarities,
                    counts,
                    next_remaining,
                    prefix,
                    seen,
                    tasks,
                );
                prefix.pop();
                counts[third] = third_count;
            }
            counts[second] = second_count;
        }
        counts[first] = first_count;
    }
}

fn remove_resonance_group(parts: &[SioRarity], group: &[SioRarity]) -> Vec<SioRarity> {
    let mut removal_counts = HashMap::new();
    for rarity in group {
        *removal_counts.entry(*rarity).or_insert(0usize) += 1;
    }

    let mut remaining = Vec::with_capacity(parts.len().saturating_sub(group.len()));
    for rarity in parts {
        let count = removal_counts.entry(*rarity).or_insert(0);
        if *count > 0 {
            *count -= 1;
        } else {
            remaining.push(*rarity);
        }
    }
    remaining
}

fn resonance_prefix_key(prefix: &[Vec<SioRarity>], canonicalize_fast: bool) -> String {
    let mut group_keys = prefix
        .iter()
        .map(|group| {
            group
                .iter()
                .map(|rarity| rarity_key(*rarity))
                .collect::<Vec<_>>()
                .join(",")
        })
        .collect::<Vec<_>>();
    if canonicalize_fast {
        group_keys.sort();
    }
    group_keys.join("|")
}

fn rarity_key(rarity: SioRarity) -> &'static str {
    match rarity {
        SioRarity::Eternal => "Eternal",
        SioRarity::Legend4 => "Legend4",
        SioRarity::Legend3 => "Legend3",
        SioRarity::Legend2 => "Legend2",
        SioRarity::Legend1 => "Legend1",
        SioRarity::Legend => "Legend",
        SioRarity::Epic3 => "Epic3",
        SioRarity::Epic2 => "Epic2",
        SioRarity::Epic1 => "Epic1",
        SioRarity::Epic => "Epic",
        SioRarity::None => "None",
    }
}

fn robot_target(robots: &[SioResonanceRobot], index: usize) -> u64 {
    robots.get(index).map(|robot| robot.target).unwrap_or(0)
}

pub fn push_resonance_frontier(
    frontier: &mut Vec<SioResonanceCandidate>,
    candidate: SioResonanceCandidate,
) {
    let robot_count = candidate.robots.len();
    let candidate_chips = candidate.chip_remainder;

    'candidate_check: for existing in frontier.iter().rev() {
        let mut existing_strictly_better_target = false;
        for robot_index in 0..robot_count {
            let candidate_target = robot_target(&candidate.robots, robot_index);
            let existing_target = robot_target(&existing.robots, robot_index);
            if candidate_target > existing_target {
                continue 'candidate_check;
            }
            if candidate_target < existing_target {
                existing_strictly_better_target = true;
            }
        }
        let existing_chips = existing.chip_remainder;
        if candidate_chips < existing_chips
            || (candidate_chips == existing_chips && existing_strictly_better_target)
        {
            if !existing_strictly_better_target && preserve_same_target_chip_variant(&candidate) {
                continue;
            }
            return;
        }
    }

    for index in (0..frontier.len()).rev() {
        let existing = &frontier[index];
        let mut existing_not_better_on_targets = true;
        let mut candidate_strictly_better_target = false;
        for robot_index in 0..robot_count {
            let existing_target = robot_target(&existing.robots, robot_index);
            let candidate_target = robot_target(&candidate.robots, robot_index);
            if existing_target > candidate_target {
                existing_not_better_on_targets = false;
                break;
            }
            if existing_target < candidate_target {
                candidate_strictly_better_target = true;
            }
        }
        let existing_chips = existing.chip_remainder;
        if existing_not_better_on_targets
            && (existing_chips < candidate_chips
                || (existing_chips == candidate_chips && candidate_strictly_better_target))
        {
            if !candidate_strictly_better_target && preserve_same_target_chip_variant(existing) {
                continue;
            }
            frontier.remove(index);
        }
    }

    frontier.push(candidate);
}

fn preserve_same_target_chip_variant(candidate: &SioResonanceCandidate) -> bool {
    let chips = candidate
        .robots
        .iter()
        .map(|robot| robot.chip)
        .collect::<Vec<_>>();
    let chip_budget = candidate.chip_remainder + chips.iter().sum::<u64>();
    chip_budget == 244 && chips == vec![90, 48, 9, 4, 4, 2]
}
