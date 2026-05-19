'use client';

// P3 06 — 15 React 컴포넌트 풀세트 (P2 07 props interface 직접 사용)
// Subscribe boundary: slice-level useParetoStore(selector) only. Full-store subscribe forbidden.
// Component-local formula branch: 0 (Gate 0). All damage display = selectFinalDamage.

import { useCallback, useMemo, useState } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { useShallow } from 'zustand/react/shallow';
import { useParetoStore } from '../../app/lib/pareto-store/store';
import {
  selectBase, selectEquipment, selectHero, selectWeapons, selectTechParts,
  selectPets, selectCollectibles, selectLmeTurf, selectMode, selectConditionalState,
  selectXenoPendingSpecs, selectFinalDamage,
} from '../../app/lib/pareto-store/selectors';
import { t } from '../../app/lib/pareto-store/i18n';
import type {
  CalculatorMode, SSGradeSlot, HeroId, AstralForgeLevel, TechSlot, LmePhase,
  IsolatedXenoTarget,
} from '../../app/lib/pareto-store/types';

const DEBOUNCE_MS = 300;
const AVAILABLE_MODES: CalculatorMode[] = ['lme', 'ee', 'generic_calculator'];

const cardClass = 'rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-elev)] p-4';
const sectionTitleClass = 'mb-2 text-xs uppercase tracking-wider text-[color:var(--color-text-muted)]';
const inputClass = 'min-h-[44px] w-full rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 py-2 font-mono text-sm text-[color:var(--color-text)]';
const btnClass = 'min-h-[44px] rounded-md border border-[color:var(--color-primary)] px-3 py-2 font-mono text-xs text-[color:var(--color-primary)] hover:bg-[color:var(--color-primary)]/10';
const btnActiveClass = 'min-h-[44px] rounded-md border border-[color:var(--color-primary)] bg-[color:var(--color-primary)] px-3 py-2 font-mono text-xs text-[color:var(--color-bg)] font-semibold';

// ───────────────────────────── 1. ModeSelectDropdown ─────────────────────────────
export function ModeSelectDropdown() {
  const { mode } = useParetoStore(useShallow(selectMode));
  const setMode = useParetoStore((s) => s.setMode);
  return (
    <section className={cardClass} data-testid="v3-ModeSelectDropdown">
      <h3 className={sectionTitleClass}>Mode</h3>
      <select
        className={inputClass}
        value={mode}
        onChange={(e) => setMode(e.target.value as CalculatorMode)}
        aria-label="Calculator mode"
      >
        {AVAILABLE_MODES.map((m) => (
          <option key={m} value={m}>{m === 'lme' ? t('mode.lme') : m === 'ee' ? t('mode.ee') : m}</option>
        ))}
      </select>
    </section>
  );
}

// ───────────────────────────── 2. OutputPanel ─────────────────────────────
export function OutputPanel() {
  const result = useParetoStore(selectFinalDamage);
  const { view_mode } = useParetoStore(useShallow(selectMode));
  const setViewMode = useParetoStore((s) => s.setViewMode);
  const value = view_mode === 'damage_multiplier' ? result.damage_multiplier : result.final_damage;
  return (
    <section className={cardClass} data-testid="v3-OutputPanel">
      <h3 className={sectionTitleClass}>{t('ui_label.final_stats')}</h3>
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-3xl text-[color:var(--color-accent)]" data-testid="v3-final-damage-value">
          {value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
        </span>
        <button
          type="button"
          className={btnClass}
          onClick={() => setViewMode(view_mode === 'damage_multiplier' ? 'raw_damage' : 'damage_multiplier')}
          data-testid="v3-view-mode-toggle"
        >
          {view_mode === 'damage_multiplier' ? t('ui_label.damage_multiplier') : t('ui_label.raw_damage')}
        </button>
      </div>
      <ul className="mt-3 text-xs text-[color:var(--color-text-muted)]">
        <li>Applied conditionals: {result.applied_conditionals.length === 0 ? '—' : result.applied_conditionals.join(', ')}</li>
        <li data-testid="v3-isolated-skipped">Isolated skipped: {result.isolated_pending_xeno_specs_skipped.join(', ') || '—'}</li>
      </ul>
    </section>
  );
}

// ───────────────────────────── 3. BaseInputsBox ─────────────────────────────
export function BaseInputsBox() {
  const { base_attack, final_attack, designs_owned } = useParetoStore(useShallow(selectBase));
  const setBaseAttack = useParetoStore((s) => s.setBaseAttack);
  const setDesignsOwned = useParetoStore((s) => s.setDesignsOwned);
  return (
    <section className={cardClass} data-testid="v3-BaseInputsBox">
      <h3 className={sectionTitleClass}>{t('ui_label.base_attack')}</h3>
      <label className="block text-xs text-[color:var(--color-text-muted)]">
        Base attack
        <input
          type="number"
          className={inputClass + ' mt-1'}
          value={base_attack}
          min={0}
          onChange={(e) => setBaseAttack(Number(e.target.value))}
          data-testid="v3-base-attack-input"
        />
      </label>
      <label className="mt-3 block text-xs text-[color:var(--color-text-muted)]">
        Designs owned
        <input
          type="number"
          className={inputClass + ' mt-1'}
          value={designs_owned}
          min={0}
          onChange={(e) => setDesignsOwned(Number(e.target.value))}
        />
      </label>
      <p className="mt-2 text-xs text-[color:var(--color-text-muted)]">
        final_attack: <span className="font-mono">{final_attack ?? '—'}</span>
      </p>
    </section>
  );
}

// ───────────────────────────── 4. ItemSelectGrids ─────────────────────────────
export function ItemSelectGrids() {
  const items = useParetoStore(selectEquipment);
  const setSSEquipment = useParetoStore((s) => s.setSSEquipment);
  const debouncedSetCores = useDebouncedCallback(
    (slot: SSGradeSlot, eternal: number, void_cores: number) =>
      useParetoStore.getState().setCoresAllocation(slot, eternal, void_cores),
    DEBOUNCE_MS,
  );
  return (
    <section className={cardClass} data-testid="v3-ItemSelectGrids">
      <h3 className={sectionTitleClass}>SS Equipment (6 slots)</h3>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {items.map((item) => (
          <div key={item.id} className="rounded border border-[color:var(--color-border)] p-2">
            <p className="text-xs uppercase text-[color:var(--color-text-muted)]">{item.slot}</p>
            <p className="text-sm font-semibold text-[color:var(--color-text)]">{item.display_name_en}</p>
            <p className="text-xs text-[color:var(--color-text-muted)]">
              EAF {item.astral_forge_eaf_level} / VAF {item.astral_forge_vaf_level}
            </p>
            <div className="mt-2 flex flex-col gap-1">
              <label className="text-xs text-[color:var(--color-text-muted)]">
                Eternal cores
                <input
                  type="number"
                  className={inputClass + ' mt-1 text-xs'}
                  defaultValue={item.cores_allocated_eternal}
                  min={0}
                  onChange={(e) => debouncedSetCores(item.slot, Number(e.target.value), item.cores_allocated_void)}
                />
              </label>
              <button
                type="button"
                className={btnClass}
                onClick={() => setSSEquipment(item.slot, { base_level: item.base_level + 1 })}
              >
                Level up
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ───────────────────────────── 5. WeaponUpgradeSlider (DEBOUNCE 300ms) ─────────────────────────────
export function WeaponUpgradeSlider() {
  const weapons = useParetoStore(selectWeapons);
  const setWeaponAF = useParetoStore((s) => s.setWeaponAstralForge);
  const debouncedSetAF = useDebouncedCallback(
    (id: string, branch: 'eaf' | 'vaf', level: AstralForgeLevel) => setWeaponAF(id, branch, level),
    DEBOUNCE_MS,
  );
  return (
    <section className={cardClass} data-testid="v3-WeaponUpgradeSlider">
      <h3 className={sectionTitleClass}>Weapon AF (debounced 300ms)</h3>
      <div className="space-y-3">
        {weapons.slice(0, 3).map((w) => (
          <div key={w.id} className="rounded border border-[color:var(--color-border)] p-2">
            <p className="text-sm font-semibold">{w.display_name_en}</p>
            <label className="block text-xs text-[color:var(--color-text-muted)]">
              EAF: {w.astral_forge_eaf_level}
              <input
                type="range"
                min={0}
                max={5}
                step={1}
                defaultValue={w.astral_forge_eaf_level}
                onChange={(e) => debouncedSetAF(w.id, 'eaf', Number(e.target.value) as AstralForgeLevel)}
                className="mt-1 w-full"
                data-testid={`v3-weapon-eaf-${w.id}`}
              />
            </label>
            <label className="block text-xs text-[color:var(--color-text-muted)]">
              VAF: {w.astral_forge_vaf_level}
              <input
                type="range"
                min={0}
                max={5}
                step={1}
                defaultValue={w.astral_forge_vaf_level}
                onChange={(e) => debouncedSetAF(w.id, 'vaf', Number(e.target.value) as AstralForgeLevel)}
                className="mt-1 w-full"
              />
            </label>
          </div>
        ))}
      </div>
    </section>
  );
}

// ───────────────────────────── 6. TechSelectArray ─────────────────────────────
export function TechSelectArray() {
  const { parts, equipped } = useParetoStore(useShallow(selectTechParts));
  const equipTech = useParetoStore((s) => s.equipTech);
  const toggleTwinborn = useParetoStore((s) => s.toggleTwinborn);
  const setResonanceChip = useParetoStore((s) => s.setResonanceChip);
  const debouncedSetChip = useDebouncedCallback(
    (techId: string, n: number) => setResonanceChip(techId, n),
    DEBOUNCE_MS,
  );
  const slots: TechSlot[] = ['attack_1', 'attack_2', 'attack_3', 'defense_1', 'defense_2', 'defense_3'];
  return (
    <section className={cardClass} data-testid="v3-TechSelectArray">
      <h3 className={sectionTitleClass}>Tech parts ({parts.length})</h3>
      <div className="mb-3 grid grid-cols-3 gap-2 text-xs">
        {slots.map((slot) => (
          <label key={slot} className="text-[color:var(--color-text-muted)]">
            {slot}
            <select
              className={inputClass + ' mt-1 text-xs'}
              value={equipped[slot] ?? ''}
              onChange={(e) => equipTech(slot, e.target.value)}
            >
              <option value="">—</option>
              {parts.map((p) => (
                <option key={p.id} value={p.id}>{p.display_name_en}</option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <div className="space-y-2">
        {parts.slice(0, 4).map((p) => (
          <div key={p.id} className="flex items-center justify-between gap-2 rounded border border-[color:var(--color-border)] p-2">
            <span className="text-xs">{p.display_name_en}</span>
            <label className="flex items-center gap-1 text-xs text-[color:var(--color-text-muted)]">
              <input
                type="checkbox"
                defaultChecked={p.is_twinborn}
                onChange={(e) => toggleTwinborn(p.id, e.target.checked)}
              />
              Twinborn
            </label>
            <input
              type="number"
              defaultValue={p.resonance_chip_allocated}
              min={0}
              className={inputClass + ' w-20 text-xs'}
              onChange={(e) => debouncedSetChip(p.id, Number(e.target.value))}
              data-testid={`v3-tech-chip-${p.id}`}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

// ───────────────────────────── 7. SkillChoices ─────────────────────────────
export function SkillChoices() {
  const { selected } = useParetoStore(useShallow(selectHero));
  const [picked, setPicked] = useState<string[]>([]);
  const maxSlots = 4;
  const toggleSkill = (id: string) =>
    setPicked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < maxSlots ? [...prev, id] : prev));
  return (
    <section className={cardClass} data-testid="v3-SkillChoices">
      <h3 className={sectionTitleClass}>{t('ui_label.assist_skills')} — {selected.display_name_en}</h3>
      <div className="grid grid-cols-2 gap-1">
        {selected.star_effects.slice(0, maxSlots).map((eff) => (
          <button
            key={eff.effect_id}
            type="button"
            className={picked.includes(eff.effect_id) ? btnActiveClass : btnClass}
            onClick={() => toggleSkill(eff.effect_id)}
          >
            ★{eff.star} {eff.stat_channel}
          </button>
        ))}
        {selected.star_effects.length === 0 && (
          <p className="col-span-2 text-xs text-[color:var(--color-text-muted)]">No star effects defined.</p>
        )}
      </div>
      <p className="mt-2 text-xs text-[color:var(--color-text-muted)]">Picked {picked.length}/{maxSlots}</p>
    </section>
  );
}

// ───────────────────────────── 8. OptimizationTable ─────────────────────────────
export function OptimizationTable() {
  const damage = useParetoStore(selectFinalDamage);
  const channels = useMemo(() => Object.entries(damage.channel_breakdown).slice(0, 8), [damage.channel_breakdown]);
  const [lockedResourceIds, setLockedResourceIds] = useState<string[]>([]);
  const handleLock = useCallback(
    (id: string) => setLockedResourceIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])),
    [],
  );
  return (
    <section className={cardClass} data-testid="v3-OptimizationTable">
      <h3 className={sectionTitleClass}>{t('ui_label.recommend_order')}</h3>
      <table className="w-full font-mono text-xs">
        <thead>
          <tr className="text-left text-[color:var(--color-text-muted)]">
            <th className="py-1">Channel</th>
            <th>Δ</th>
            <th>Lock</th>
          </tr>
        </thead>
        <tbody>
          {channels.length === 0 && (
            <tr><td colSpan={3} className="py-2 text-[color:var(--color-text-muted)]">No channels — adjust inputs.</td></tr>
          )}
          {channels.map(([channel, delta]) => (
            <tr key={channel} className="border-t border-[color:var(--color-border)]/40">
              <td className="py-1 text-[color:var(--color-text)]">{channel}</td>
              <td>{delta.toFixed(3)}</td>
              <td>
                <button
                  type="button"
                  onClick={() => handleLock(channel)}
                  className={lockedResourceIds.includes(channel) ? btnActiveClass : btnClass}
                >
                  {lockedResourceIds.includes(channel) ? '🔒' : '🔓'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

// ───────────────────────────── 9. HeroSelectModal ─────────────────────────────
export function HeroSelectModal() {
  const { selected, all } = useParetoStore(useShallow(selectHero));
  const selectHeroAction = useParetoStore((s) => s.selectHero);
  return (
    <section className={cardClass} data-testid="v3-HeroSelectModal">
      <h3 className={sectionTitleClass}>Hero ({all.length})</h3>
      <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
        {all.map((h) => (
          <button
            key={h.id}
            type="button"
            onClick={() => selectHeroAction(h.id as HeroId)}
            className={selected.id === h.id ? btnActiveClass : btnClass}
            data-testid={`v3-hero-${h.id}`}
          >
            {h.display_name_en} <span className="text-[10px] opacity-70">[{h.tier}]</span>
          </button>
        ))}
      </div>
    </section>
  );
}

// ───────────────────────────── 10. CollectiblesAccordion ─────────────────────────────
export function CollectiblesAccordion() {
  const sets = useParetoStore(selectCollectibles);
  const setCollectibleSetStars = useParetoStore((s) => s.setCollectibleSetStars);
  const [openSetId, setOpenSetId] = useState<string | null>(null);
  return (
    <section className={cardClass} data-testid="v3-CollectiblesAccordion">
      <h3 className={sectionTitleClass}>Collectible sets ({sets.length})</h3>
      <ul className="space-y-1">
        {sets.map((item) => (
          <li key={item.id} className="rounded border border-[color:var(--color-border)]">
            <button
              type="button"
              onClick={() => setOpenSetId(openSetId === item.id ? null : item.id)}
              className="flex w-full items-center justify-between p-2 text-xs"
            >
              <span>{item.display_name_en} · {item.collectible_count} items</span>
              <span>{openSetId === item.id ? '▼' : '▶'}</span>
            </button>
            {openSetId === item.id && (
              <div className="border-t border-[color:var(--color-border)]/50 p-2 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <label className="block text-[color:var(--color-text-muted)]">
                    Gold stars
                    <input
                      type="number"
                      min={0}
                      className={inputClass + ' mt-1 text-xs'}
                      value={item.gold_stars}
                      onChange={(ev) => setCollectibleSetStars(item.id, Number(ev.target.value), item.red_stars)}
                    />
                  </label>
                  <label className="block text-[color:var(--color-text-muted)]">
                    Red stars
                    <input
                      type="number"
                      min={0}
                      className={inputClass + ' mt-1 text-xs'}
                      value={item.red_stars}
                      onChange={(ev) => setCollectibleSetStars(item.id, item.gold_stars, Number(ev.target.value))}
                    />
                  </label>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

// ───────────────────────────── 11. TalentTurfMatrix (DEBOUNCE 300ms) ─────────────────────────────
export function TalentTurfMatrix() {
  const turf = useParetoStore(selectLmeTurf);
  const toggleNode = useParetoStore((s) => s.toggleNode);
  const setPhaseWeight = useParetoStore((s) => s.setPhaseWeight);
  const debouncedToggle = useDebouncedCallback(
    (nodeId: string, enabled: boolean) => toggleNode(nodeId, enabled),
    DEBOUNCE_MS,
  );
  const phases: LmePhase[] = ['boss_phase_1', 'boss_phase_2', 'battle_phase', 'expedition_phase'];
  return (
    <section className={cardClass} data-testid="v3-TalentTurfMatrix">
      <h3 className={sectionTitleClass}>{t('ui_label.lme_battle_phase')} matrix</h3>
      <p className="text-xs text-[color:var(--color-text-muted)]">Nodes: {turf.nodes.length}. Toggle nodes to apply LME modifier (debounced 300ms).</p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {phases.map((p) => {
          const weightKey = p === 'boss_phase_1' ? turf.boss_phase_1_weight : p === 'boss_phase_2' ? turf.boss_phase_2_weight : p === 'battle_phase' ? turf.battle_phase_weight : turf.expedition_phase_weight;
          return (
            <label key={p} className="block text-xs text-[color:var(--color-text-muted)]">
              {p}
              <input
                type="number"
                step={0.05}
                min={0}
                defaultValue={weightKey}
                className={inputClass + ' mt-1 text-xs'}
                onChange={(e) => setPhaseWeight(p, Number(e.target.value))}
              />
            </label>
          );
        })}
      </div>
      {turf.nodes.length === 0 ? (
        <p className="mt-2 text-xs italic text-[color:var(--color-text-muted)]">No turf nodes registered (matrix awaits per-tile data).</p>
      ) : (
        <ul className="mt-2 grid grid-cols-3 gap-1">
          {turf.nodes.map((n) => (
            <li key={n.node_id}>
              <button
                type="button"
                onClick={() => debouncedToggle(n.node_id, !n.enabled)}
                className={n.enabled ? btnActiveClass : btnClass}
                data-testid={`v3-turf-node-${n.node_id}`}
              >
                {n.node_id}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ───────────────────────────── 12. PetSelectRadio ─────────────────────────────
export function PetSelectRadio() {
  const { pets, deployed } = useParetoStore(useShallow(selectPets));
  const deployPet = useParetoStore((s) => s.deployPet);
  const setAssistPet = useParetoStore((s) => s.setAssistPet);
  return (
    <section className={cardClass} data-testid="v3-PetSelectRadio">
      <h3 className={sectionTitleClass}>Pets ({pets.length})</h3>
      <div className="grid grid-cols-3 gap-1">
        {pets.map((p) => (
          <label key={p.id} className="flex items-center gap-1 text-xs">
            <input
              type="radio"
              name="deployed-pet"
              checked={deployed === p.id}
              onChange={() => deployPet(p.id)}
            />
            {p.display_name_en}
          </label>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {[0, 1].map((slot) => (
          <label key={slot} className="text-xs text-[color:var(--color-text-muted)]">
            Assist {slot + 1}
            <select
              className={inputClass + ' mt-1 text-xs'}
              defaultValue=""
              onChange={(e) => setAssistPet(slot as 0 | 1, e.target.value || null)}
            >
              <option value="">—</option>
              {pets.map((p) => <option key={p.id} value={p.id}>{p.display_name_en}</option>)}
            </select>
          </label>
        ))}
      </div>
    </section>
  );
}

// ───────────────────────────── 13. XenoDetailsPanel (empty-state for isolated areas) ─────────────────────────────
export function XenoDetailsPanel() {
  const { pets, deployed } = useParetoStore(useShallow(selectPets));
  const pending_xeno_specs = useParetoStore(selectXenoPendingSpecs);
  const setResonanceChance = useParetoStore((s) => s.setResonanceChance);
  const setResonanceAtk = useParetoStore((s) => s.setResonanceAtk);
  const deployedPet = pets.find((p) => p.id === deployed) ?? null;
  const isolatedTargets: IsolatedXenoTarget[] = ['judgment_necklace_future_xeno', 'twin_lance_xeno_effect_table'];

  return (
    <section className={cardClass} data-testid="v3-XenoDetailsPanel">
      <h3 className={sectionTitleClass}>{t('ui_label.xeno_transmute')} / {t('ui_label.xenopets')}</h3>

      {/* Pet resonance fields */}
      {deployedPet && deployedPet.is_xeno ? (
        <div className="mb-3 rounded border border-[color:var(--color-border)] p-2">
          <p className="text-xs font-semibold">{deployedPet.display_name_en}</p>
          <label className="mt-1 block text-xs text-[color:var(--color-text-muted)]">
            Resonance chance %
            <input
              type="number"
              step={0.01}
              min={0}
              defaultValue={deployedPet.resonance_chance}
              className={inputClass + ' mt-1 text-xs'}
              onChange={(e) => setResonanceChance(deployedPet.id, Number(e.target.value))}
            />
          </label>
          <label className="mt-1 block text-xs text-[color:var(--color-text-muted)]">
            Resonance ATK
            <input
              type="number"
              min={0}
              defaultValue={deployedPet.resonance_atk}
              className={inputClass + ' mt-1 text-xs'}
              onChange={(e) => setResonanceAtk(deployedPet.id, Number(e.target.value))}
            />
          </label>
        </div>
      ) : (
        <p className="mb-3 text-xs text-[color:var(--color-text-muted)]">Deploy a Xeno pet to edit resonance.</p>
      )}

      {/* Isolated areas — empty-state (P3 05 + P2 06) */}
      <div className="space-y-2" data-testid="v3-xeno-isolated-areas">
        {isolatedTargets.map((target) => {
          const spec = pending_xeno_specs[target];
          const isEmpty = spec.xeno_transmute_stage_effects.length === 0;
          return (
            <div
              key={target}
              className="rounded border border-dashed border-[color:var(--color-border)] p-2"
              data-testid={`v3-xeno-isolated-${target}`}
            >
              <p className="text-xs font-semibold">{target}</p>
              {isEmpty ? (
                <p className="mt-1 text-xs italic text-[color:var(--color-text-muted)]" data-testid={`v3-xeno-empty-${target}`}>
                  {t('ui_label.future_update')}
                </p>
              ) : (
                <ul className="mt-1 text-xs">
                  {spec.xeno_transmute_stage_effects.map((eff) => (
                    <li key={eff.effect_id}>L{eff.level} · {eff.stat_channel}</li>
                  ))}
                </ul>
              )}
              {/* XT controls disabled except evidence-entry path (per P2 06:40) */}
              <button
                type="button"
                disabled
                className="mt-1 cursor-not-allowed rounded border border-[color:var(--color-border)] px-2 py-1 text-[10px] text-[color:var(--color-text-muted)] opacity-50"
                aria-disabled="true"
              >
                XT controls disabled (evidence-entry only)
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ───────────────────────────── 14. ReviveSettingsToggle ─────────────────────────────
export function ReviveSettingsToggle() {
  const conditional = useParetoStore(selectConditionalState);
  const setShieldActive = useParetoStore((s) => s.setShieldActive);
  return (
    <section className={cardClass} data-testid="v3-ReviveSettingsToggle">
      <h3 className={sectionTitleClass}>Revive / shield settings</h3>
      <label className="flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={conditional.shield_active}
          onChange={(e) => setShieldActive(e.target.checked)}
          data-testid="v3-shield-toggle"
        />
        Shield active
      </label>
    </section>
  );
}

// ───────────────────────────── 15. ResourceLockButton (P4 자유 영역 lockSlice) ─────────────────────────────
export function ResourceLockButton({
  resourceId = 'designs_owned',
  limit = null,
}: { resourceId?: string; limit?: number | null }) {
  const [locked, setLocked] = useState(false);
  const designsOwned = useParetoStore((s) => s.designs_owned);
  const reachedLimit = limit !== null && designsOwned >= limit;
  return (
    <section className={cardClass} data-testid="v3-ResourceLockButton">
      <h3 className={sectionTitleClass}>Resource lock</h3>
      <button
        type="button"
        onClick={() => setLocked((v) => !v)}
        className={locked ? btnActiveClass : btnClass}
        aria-pressed={locked}
        data-testid="v3-resource-lock-toggle"
      >
        {locked ? `🔒 ${resourceId} locked` : `🔓 ${resourceId} unlocked`}
      </button>
      {limit !== null && (
        <p className="mt-1 text-xs text-[color:var(--color-text-muted)]">
          {designsOwned}/{limit} {reachedLimit ? '— limit reached' : ''}
        </p>
      )}
    </section>
  );
}

// ───────────────────────────── Registry sanity check (matches UI_COMPONENT_REGISTRY) ─────────────────────────────
export const V3_COMPONENTS = {
  ModeSelectDropdown, OutputPanel, BaseInputsBox, ItemSelectGrids, WeaponUpgradeSlider,
  TechSelectArray, SkillChoices, OptimizationTable, HeroSelectModal, CollectiblesAccordion,
  TalentTurfMatrix, PetSelectRadio, XenoDetailsPanel, ReviveSettingsToggle, ResourceLockButton,
} as const;
