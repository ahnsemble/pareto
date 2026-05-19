---
artifact: "Sprint Y T0 sIO input inventory"
created: "2026-05-17"
sio_url: "https://sio-tools.vercel.app/"
category_count: 9
field_count: 95
sio_live_fixture_case_count: 10
sio_live_status: 200
---

# sIO Input Inventory

This inventory maps the live sIO Tools input surface into the V3 `PlayerState` schema. The V3 registry covers 9 categories and 95 typed input fields.

## Category Counts

| Category | Field count |
|---|---:|
| Damage | 15 |
| Build | 14 |
| Hero | 10 |
| Equipment | 12 |
| Tech | 13 |
| Pet | 9 |
| Collectible | 8 |
| LME | 9 |
| Ecosystem | 5 |
| Total | 95 |

## Screenshot Evidence

| Case | sIO live screenshot | V3 local screenshot |
|---|---|---|
| default | `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/artifacts/v3-sio-parity/screenshots/sio-live-default.png` | `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/artifacts/v3-sio-parity/screenshots/v3-local-default.png` |
| king | `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/artifacts/v3-sio-parity/screenshots/sio-live-king.png` | `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/artifacts/v3-sio-parity/screenshots/v3-local-king.png` |
| taloxa | `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/artifacts/v3-sio-parity/screenshots/sio-live-taloxa.png` | `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/artifacts/v3-sio-parity/screenshots/v3-local-taloxa.png` |
| weakened | `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/artifacts/v3-sio-parity/screenshots/sio-live-weakened.png` | `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/artifacts/v3-sio-parity/screenshots/v3-local-weakened.png` |
| boss | `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/artifacts/v3-sio-parity/screenshots/sio-live-boss.png` | `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/artifacts/v3-sio-parity/screenshots/v3-local-boss.png` |
| ee | `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/artifacts/v3-sio-parity/screenshots/sio-live-ee.png` | `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/artifacts/v3-sio-parity/screenshots/v3-local-ee.png` |
| clucker | `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/artifacts/v3-sio-parity/screenshots/sio-live-clucker.png` | `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/artifacts/v3-sio-parity/screenshots/v3-local-clucker.png` |
| tech_twinborn | `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/artifacts/v3-sio-parity/screenshots/sio-live-tech_twinborn.png` | `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/artifacts/v3-sio-parity/screenshots/v3-local-tech_twinborn.png` |
| collectible | `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/artifacts/v3-sio-parity/screenshots/sio-live-collectible.png` | `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/artifacts/v3-sio-parity/screenshots/v3-local-collectible.png` |
| equipment_max | `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/artifacts/v3-sio-parity/screenshots/sio-live-equipment_max.png` | `/Users/woosung/Desktop/Dev/Projects/pareto/frontend/artifacts/v3-sio-parity/screenshots/v3-local-equipment_max.png` |

## Field Table

### Damage

| Field | Label | Type | Range | Default |
|---|---|---|---|---|
| `damage.combat_mode` | Mode | select | - | `lme` |
| `damage.enemy_type` | Enemy type | select | - | `normal` |
| `damage.base_attack` | Base attack | number | 0..100000000 | `1000` |
| `damage.final_attack` | Final attack | number | 0..100000000 | `0` |
| `damage.crit_rate_percent` | Crit Rate | number | 0..1000 | `0` |
| `damage.crit_damage_percent` | Crit Damage | number | 0..5000 | `0` |
| `damage.damage_percent` | Damage | number | 0..5000 | `0` |
| `damage.damage_when_100_up_percent` | Damage at 100 percent up | number | 0..5000 | `0` |
| `damage.skill_damage_percent` | Skill Damage | number | 0..5000 | `0` |
| `damage.boss_damage_percent` | Boss Damage | number | 0..5000 | `0` |
| `damage.elite_damage_percent` | Elite Damage | number | 0..5000 | `0` |
| `damage.vulnerability_percent` | Vulnerability | number | 0..5000 | `0` |
| `damage.ee_skill_buff_level` | EE skill buff level | number | 0..10 | `0` |
| `damage.ee_tailshot_buff_stacks` | EE tailshot stacks | number | 0..20 | `0` |
| `damage.ee_tailshot_enabled` | EE tailshot enabled | checkbox | - | `false` |

### Build

| Field | Label | Type | Range | Default |
|---|---|---|---|---|
| `build.relic_cores_owned` | Relic cores owned | number | 0..999 | `0` |
| `build.chaos_cores_owned` | Chaos cores owned | number | 0..999 | `0` |
| `build.max_weapon_af` | Weapon max AF | number | 0..5 | `5` |
| `build.max_armor_af` | Armor max AF | number | 0..5 | `5` |
| `build.max_necklace_af` | Necklace max AF | number | 0..5 | `5` |
| `build.max_belt_af` | Belt max AF | number | 0..5 | `5` |
| `build.max_gloves_af` | Gloves max AF | number | 0..5 | `5` |
| `build.max_boots_af` | Boots max AF | number | 0..5 | `5` |
| `build.lock_weapon` | Lock weapon | checkbox | - | `false` |
| `build.lock_armor` | Lock armor | checkbox | - | `false` |
| `build.lock_necklace` | Lock necklace | checkbox | - | `false` |
| `build.lock_belt` | Lock belt | checkbox | - | `false` |
| `build.lock_gloves` | Lock gloves | checkbox | - | `false` |
| `build.lock_boots` | Lock boots | checkbox | - | `false` |

### Hero

| Field | Label | Type | Range | Default |
|---|---|---|---|---|
| `hero.selected_hero_id` | Selected hero | select | - | `venato` |
| `hero.selected_hero_level` | Hero level | number | 1..120 | `1` |
| `hero.selected_hero_star` | Hero star | number | 0..8 | `0` |
| `hero.selected_hero_awakening` | Hero awakening | number | 0..8 | `0` |
| `hero.teamwork_slots_unlocked` | Teamwork slots | number | 0..4 | `0` |
| `hero.global_passive_lv40_enabled` | Global passive level 40 | checkbox | - | `true` |
| `hero.global_passive_lv80_enabled` | Global passive level 80 | checkbox | - | `false` |
| `hero.hero_shards_spent` | Hero shards spent | number | 0..99999 | `0` |
| `hero.awakening_cores_spent` | Awakening cores spent | number | 0..99999 | `0` |
| `hero.passive_crit_rate_percent` | Passive crit rate | number | 0..500 | `0` |

### Equipment

| Field | Label | Type | Range | Default |
|---|---|---|---|---|
| `equipment.weapon.item_id` | Weapon item | select | - | `twin_lance_starforged_havoc` |
| `equipment.weapon.item_level` | Weapon level | number | 0..200 | `1` |
| `equipment.weapon.astral_forge_eaf_level` | Weapon EAF | number | 0..5 | `1` |
| `equipment.weapon.astral_forge_vaf_level` | Weapon VAF | number | 0..5 | `1` |
| `equipment.armor.item_id` | Armor item | select | - | `evervoid_armor_starforged_havoc` |
| `equipment.necklace.item_id` | Necklace item | select | - | `judgment_necklace_starforged_havoc` |
| `equipment.belt.item_id` | Belt item | select | - | `stardust_sash_starforged_havoc` |
| `equipment.gloves.item_id` | Gloves item | select | - | `moonscar_bracer_starforged_havoc` |
| `equipment.boots.item_id` | Boots item | select | - | `glacial_warboots_starforged_havoc` |
| `equipment.necklace.chaos_fusion_level` | Necklace chaos fusion | number | 0..10 | `0` |
| `equipment.weapon.xeno_transmute_level` | Weapon xeno transmute | number | 0..13 | `0` |
| `equipment.weapon.designs_owned` | Weapon designs owned | number | 0..999999 | `0` |

### Tech

| Field | Label | Type | Range | Default |
|---|---|---|---|---|
| `tech.selected_attack_parts` | Attack tech parts | select | - | `` |
| `tech.selected_defense_parts` | Defense tech parts | select | - | `` |
| `tech.resonance_level` | Resonance level | number | 0..999 | `0` |
| `tech.resonance_atk_percent` | Resonance ATK percent | number | 0..5000 | `0` |
| `tech.chips_available` | Chips available | number | 0..999 | `0` |
| `tech.twinborn_enabled` | Twinborn enabled | checkbox | - | `false` |
| `tech.twinborn_main_part_id` | Twinborn main part | select | - | `drone` |
| `tech.twinborn_support_part_id` | Twinborn support part | select | - | `forcefield` |
| `tech.drone_chip_percent` | Drone chip percent | number | 0..100 | `0` |
| `tech.forcefield_chip_percent` | Forcefield chip percent | number | 0..100 | `0` |
| `tech.soccer_chip_percent` | Soccer chip percent | number | 0..100 | `0` |
| `tech.durian_chip_percent` | Durian chip percent | number | 0..100 | `0` |
| `tech.auto_assign_mode` | Auto assign mode | select | - | `lme` |

### Pet

| Field | Label | Type | Range | Default |
|---|---|---|---|---|
| `pet.deployed_pet_id` | Deployed pet | select | - | `murica` |
| `pet.deployed_is_xeno` | Deployed pet is Xeno | checkbox | - | `false` |
| `pet.awakening_level` | Pet awakening | number | 0..8 | `0` |
| `pet.resonance_chance` | Pet resonance chance | number | 0..100 | `0` |
| `pet.resonance_atk` | Pet resonance ATK | number | 0..999999 | `0` |
| `pet.assist_pet_1_id` | Assist pet 1 | select | - | `` |
| `pet.assist_pet_2_id` | Assist pet 2 | select | - | `` |
| `pet.assist_skill_filter_enabled` | Assist filter enabled | checkbox | - | `true` |
| `pet.xeno_preview_enabled` | Xeno preview enabled | checkbox | - | `false` |

### Collectible

| Field | Label | Type | Range | Default |
|---|---|---|---|---|
| `collectible.edition_progress` | Edition progress | number | 1..10 | `10` |
| `collectible.red_star_total` | Red star total | number | 0..999 | `0` |
| `collectible.yellow_star_total` | Yellow star total | number | 0..999 | `0` |
| `collectible.custom_collection_slots` | Custom collection slots | number | 0..99 | `2` |
| `collectible.advanced_collector_heart_level` | Advanced collector heart | number | 0..10 | `0` |
| `collectible.aim_indicator_enabled` | Aim indicator enabled | checkbox | - | `false` |
| `collectible.target_collectible_id` | Target collectible | text | - | `` |
| `collectible.equipment_skill_buff_enabled` | Equipment skill buff enabled | checkbox | - | `false` |

### LME

| Field | Label | Type | Range | Default |
|---|---|---|---|---|
| `lme.battle_phase` | LME phase | select | - | `battle` |
| `lme.player_medals` | Player medals | number | 0..999 | `0` |
| `lme.opponent_medals` | Opponent medals | number | 0..999 | `0` |
| `lme.medal_delta_buff_enabled` | Medal delta buff enabled | checkbox | - | `true` |
| `lme.turf_nodes_enabled` | Turf nodes enabled | number | 0..99 | `0` |
| `lme.attack_turf_percent` | Attack turf percent | number | 0..500 | `0` |
| `lme.hp_turf_percent` | HP turf percent | number | 0..500 | `0` |
| `lme.basic_talent_nodes` | Basic talent nodes | number | 0..999 | `0` |
| `lme.clan_bonus_percent` | Clan bonus percent | number | 0..500 | `0` |

### Ecosystem

| Field | Label | Type | Range | Default |
|---|---|---|---|---|
| `ecosystem.share_code` | Share code | text | - | `` |
| `ecosystem.import_url` | Import URL | text | - | `` |
| `ecosystem.locale` | Locale | select | - | `en` |
| `ecosystem.autosave_enabled` | Autosave enabled | checkbox | - | `true` |
| `ecosystem.source_build_name` | Source build name | text | - | `` |
