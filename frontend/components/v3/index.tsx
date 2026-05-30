'use client';

// P3 06 — 15 React 컴포넌트 풀세트 (P2 07 props interface 직접 사용)
// Subscribe boundary: slice-level useParetoStore(selector) only. Full-store subscribe forbidden.
// Component-local formula branch: 0 (Gate 0). All damage display = selectFinalDamage.

import { useCallback, useMemo, useState } from 'react';
import { useLocale } from 'next-intl';
import { useDebouncedCallback } from 'use-debounce';
import { useShallow } from 'zustand/react/shallow';
import { useParetoStore } from '../../app/lib/pareto-store/store';
import {
  selectBase, selectEquipment, selectHero, selectWeapons,
  selectPets, selectCollectibles, selectLmeTurf, selectMode, selectConditionalState,
  selectXenoPendingSpecs, selectFinalDamage,
} from '../../app/lib/pareto-store/selectors';
import { t as storeText } from '../../app/lib/pareto-store/i18n';
import { TechPartsPanel } from './tech/TechPartsPanel';
import { localizeTechEntityName, type TechEntityNameKind } from './tech/techLocaleCopy';
import type {
  CalculatorMode, SSGradeSlot, HeroId, AstralForgeLevel, LmePhase,
  IsolatedXenoTarget,
} from '../../app/lib/pareto-store/types';

const DEBOUNCE_MS = 300;
const AVAILABLE_MODES: CalculatorMode[] = ['lme', 'ee', 'generic_calculator'];
type V3Locale = 'en' | 'ko';
type NamedRow = { display_name_en: string; display_name_ko?: string };

const cardClass = 'rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-elev)] p-4';
const sectionTitleClass = 'mb-2 text-xs uppercase tracking-wider text-[color:var(--color-text-muted)]';
const inputClass = 'min-h-[44px] w-full rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 py-2 font-mono text-sm text-[color:var(--color-text)]';
const btnClass = 'min-h-[44px] rounded-md border border-[color:var(--color-primary)] px-3 py-2 font-mono text-xs text-[color:var(--color-primary)] hover:bg-[color:var(--color-primary)]/10';
const btnActiveClass = 'min-h-[44px] rounded-md border border-[color:var(--color-primary)] bg-[color:var(--color-primary)] px-3 py-2 font-mono text-xs text-[color:var(--color-bg)] font-semibold';

const V3_COPY = {
  en: {
    mode: { title: 'Mode', ariaLabel: 'Calculator mode', generic: 'Generic calculator' },
    base: { baseAttack: 'Base attack', designsOwned: 'Designs owned', finalAttack: 'final_attack' },
    output: {
      appliedConditionals: 'Applied conditionals',
      isolatedSkipped: 'Isolated skipped',
      channel: 'Channel',
      lock: 'Lock',
      noChannels: 'No channels — adjust inputs.',
    },
    equipment: { title: 'SS Equipment (6 slots)', eternalCores: 'Eternal cores', levelUp: 'Level up' },
    weapon: { title: 'Weapon AF tuning' },
    skill: { noEffects: 'No star effects defined.', picked: 'Picked' },
    hero: { title: 'Hero' },
    collectibles: { title: 'Collectible sets', items: 'items', goldStars: 'Gold stars', redStars: 'Red stars' },
    turf: {
      board: 'board',
      tiles: 'Tiles',
      helper: 'Toggle tiles to apply expedition modifiers.',
      empty: 'No turf tiles available yet.',
      phases: {
        boss_phase_1: 'Boss phase 1',
        boss_phase_2: 'Boss phase 2',
        battle_phase: 'Battle phase',
        expedition_phase: 'Expedition phase',
      } as Record<LmePhase, string>,
    },
    pets: { title: 'Pets', assist: 'Assist' },
    xeno: {
      resonanceChance: 'Resonance chance %',
      resonanceAtk: 'Resonance ATK',
      deployXeno: 'Deploy a Xeno pet to edit resonance.',
      controlsDisabled: 'XT controls disabled (evidence-entry only)',
    },
    revive: { title: 'Revive / shield settings', shieldActive: 'Shield active' },
    resource: { title: 'Resource lock', locked: 'locked', unlocked: 'unlocked', limitReached: '— limit reached', designsOwned: 'designs_owned' },
    slots: {
      weapon: 'weapon',
      armor: 'armor',
      necklace: 'necklace',
      belt: 'belt',
      gloves: 'gloves',
      boots: 'boots',
    } as Record<string, string>,
  },
  ko: {
    mode: { title: '모드', ariaLabel: '계산 모드', generic: '일반 계산기' },
    base: { baseAttack: '기초 공격력', designsOwned: '보유 도면', finalAttack: '최종 공격력' },
    output: {
      appliedConditionals: '적용 조건',
      isolatedSkipped: '제외된 미확정 항목',
      channel: '채널',
      lock: '잠금',
      noChannels: '채널이 없습니다. 입력값을 조정하세요.',
    },
    equipment: { title: 'SS 장비 (6슬롯)', eternalCores: '영원 코어', levelUp: '레벨 올리기' },
    weapon: { title: '무기 AF 조정' },
    skill: { noEffects: '정의된 별 효과가 없습니다.', picked: '선택' },
    hero: { title: '특공대' },
    collectibles: { title: '컬렉션 세트', items: '개 항목', goldStars: '금별', redStars: '빨간별' },
    turf: {
      board: '보드',
      tiles: '타일',
      helper: '타일을 켜서 탐험 보정을 적용합니다.',
      empty: '사용 가능한 터프 타일이 아직 없습니다.',
      phases: {
        boss_phase_1: '보스 페이즈 1',
        boss_phase_2: '보스 페이즈 2',
        battle_phase: '전투 페이즈',
        expedition_phase: '탐험 페이즈',
      } as Record<LmePhase, string>,
    },
    pets: { title: '펫', assist: '지원' },
    xeno: {
      resonanceChance: '공명 확률 %',
      resonanceAtk: '공명 ATK',
      deployXeno: '제노 펫을 배치하면 공명을 수정할 수 있습니다.',
      controlsDisabled: 'XT 조정 비활성화 (근거 입력 전용)',
    },
    revive: { title: '부활 / 보호막 설정', shieldActive: '보호막 활성' },
    resource: { title: '리소스 잠금', locked: '잠김', unlocked: '잠금 해제', limitReached: '— 한도 도달', designsOwned: '보유 도면' },
    slots: {
      weapon: '무기',
      armor: '갑옷',
      necklace: '목걸이',
      belt: '벨트',
      gloves: '장갑',
      boots: '부츠',
    } as Record<string, string>,
  },
} as const;

function normalizeV3Locale(locale: string | undefined): V3Locale {
  return locale === 'ko' ? 'ko' : 'en';
}

function useV3Locale(): V3Locale {
  return normalizeV3Locale(useLocale());
}

function localizedStoreText(key: string, locale: V3Locale): string {
  return storeText(key, locale);
}

function localizedMode(mode: CalculatorMode, locale: V3Locale): string {
  if (mode === 'lme') return localizedStoreText('mode.lme', locale);
  if (mode === 'ee') return localizedStoreText('mode.ee', locale);
  return V3_COPY[locale].mode.generic;
}

function localizedEntityName(kind: TechEntityNameKind, row: NamedRow, locale: V3Locale): string {
  const localized = localizeTechEntityName(kind, row.display_name_en, locale);
  if (locale === 'ko' && localized === row.display_name_en && row.display_name_ko) {
    return row.display_name_ko;
  }
  return localized;
}

// ───────────────────────────── 1. ModeSelectDropdown ─────────────────────────────
export function ModeSelectDropdown() {
  const locale = useV3Locale();
  const copy = V3_COPY[locale];
  const { mode } = useParetoStore(useShallow(selectMode));
  const setMode = useParetoStore((s) => s.setMode);
  return (
    <section className={cardClass} data-testid="v3-ModeSelectDropdown">
      <h3 className={sectionTitleClass}>{copy.mode.title}</h3>
      <select
        className={inputClass}
        value={mode}
        onChange={(e) => setMode(e.target.value as CalculatorMode)}
        aria-label={copy.mode.ariaLabel}
      >
        {AVAILABLE_MODES.map((m) => (
          <option key={m} value={m}>{localizedMode(m, locale)}</option>
        ))}
      </select>
    </section>
  );
}

// ───────────────────────────── 2. OutputPanel ─────────────────────────────
export function OutputPanel() {
  const locale = useV3Locale();
  const copy = V3_COPY[locale];
  const result = useParetoStore(selectFinalDamage);
  const { view_mode } = useParetoStore(useShallow(selectMode));
  const setViewMode = useParetoStore((s) => s.setViewMode);
  const value = view_mode === 'damage_multiplier' ? result.damage_multiplier : result.final_damage;
  return (
    <section className={cardClass} data-testid="v3-OutputPanel">
      <h3 className={sectionTitleClass}>{localizedStoreText('ui_label.final_stats', locale)}</h3>
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-3xl text-[color:var(--color-accent)]" data-testid="v3-final-damage-value">
          {value.toLocaleString(locale === 'ko' ? 'ko-KR' : undefined, { maximumFractionDigits: 2 })}
        </span>
        <button
          type="button"
          className={btnClass}
          onClick={() => setViewMode(view_mode === 'damage_multiplier' ? 'raw_damage' : 'damage_multiplier')}
          data-testid="v3-view-mode-toggle"
        >
          {view_mode === 'damage_multiplier' ? localizedStoreText('ui_label.damage_multiplier', locale) : localizedStoreText('ui_label.raw_damage', locale)}
        </button>
      </div>
      <ul className="mt-3 text-xs text-[color:var(--color-text-muted)]">
        <li>{copy.output.appliedConditionals}: {result.applied_conditionals.length === 0 ? '—' : result.applied_conditionals.join(', ')}</li>
        <li data-testid="v3-isolated-skipped">{copy.output.isolatedSkipped}: {result.isolated_pending_xeno_specs_skipped.join(', ') || '—'}</li>
      </ul>
    </section>
  );
}

// ───────────────────────────── 3. BaseInputsBox ─────────────────────────────
export function BaseInputsBox() {
  const locale = useV3Locale();
  const copy = V3_COPY[locale];
  const { base_attack, final_attack, designs_owned } = useParetoStore(useShallow(selectBase));
  const setBaseAttack = useParetoStore((s) => s.setBaseAttack);
  const setDesignsOwned = useParetoStore((s) => s.setDesignsOwned);
  return (
    <section className={cardClass} data-testid="v3-BaseInputsBox">
      <h3 className={sectionTitleClass}>{localizedStoreText('ui_label.base_attack', locale)}</h3>
      <label className="block text-xs text-[color:var(--color-text-muted)]">
        {copy.base.baseAttack}
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
        {copy.base.designsOwned}
        <input
          type="number"
          className={inputClass + ' mt-1'}
          value={designs_owned}
          min={0}
          onChange={(e) => setDesignsOwned(Number(e.target.value))}
        />
      </label>
      <p className="mt-2 text-xs text-[color:var(--color-text-muted)]">
        {copy.base.finalAttack}: <span className="font-mono">{final_attack ?? '—'}</span>
      </p>
    </section>
  );
}

// ───────────────────────────── 4. ItemSelectGrids ─────────────────────────────
export function ItemSelectGrids() {
  const locale = useV3Locale();
  const copy = V3_COPY[locale];
  const items = useParetoStore(selectEquipment);
  const setSSEquipment = useParetoStore((s) => s.setSSEquipment);
  const debouncedSetCores = useDebouncedCallback(
    (slot: SSGradeSlot, eternal: number, void_cores: number) =>
      useParetoStore.getState().setCoresAllocation(slot, eternal, void_cores),
    DEBOUNCE_MS,
  );
  return (
    <section className={cardClass} data-testid="v3-ItemSelectGrids">
      <h3 className={sectionTitleClass}>{copy.equipment.title}</h3>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {items.map((item) => (
          <div key={item.id} className="rounded border border-[color:var(--color-border)] p-2">
            <p className="text-xs uppercase text-[color:var(--color-text-muted)]">{copy.slots[item.slot] ?? item.slot}</p>
            <p className="text-sm font-semibold text-[color:var(--color-text)]">{localizedEntityName('equipment', item, locale)}</p>
            <p className="text-xs text-[color:var(--color-text-muted)]">
              EAF {item.astral_forge_eaf_level} / VAF {item.astral_forge_vaf_level}
            </p>
            <div className="mt-2 flex flex-col gap-1">
              <label className="text-xs text-[color:var(--color-text-muted)]">
                {copy.equipment.eternalCores}
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
                {copy.equipment.levelUp}
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
  const locale = useV3Locale();
  const copy = V3_COPY[locale];
  const weapons = useParetoStore(selectWeapons);
  const setWeaponAF = useParetoStore((s) => s.setWeaponAstralForge);
  const debouncedSetAF = useDebouncedCallback(
    (id: string, branch: 'eaf' | 'vaf', level: AstralForgeLevel) => setWeaponAF(id, branch, level),
    DEBOUNCE_MS,
  );
  return (
    <section className={cardClass} data-testid="v3-WeaponUpgradeSlider">
      <h3 className={sectionTitleClass}>{copy.weapon.title}</h3>
      <div className="space-y-3">
        {weapons.slice(0, 3).map((w) => (
          <div key={w.id} className="rounded border border-[color:var(--color-border)] p-2">
            <p className="text-sm font-semibold">{localizedEntityName('equipment', w, locale)}</p>
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

// ───────────────────────────── 7. SkillChoices ─────────────────────────────
export function SkillChoices() {
  const locale = useV3Locale();
  const copy = V3_COPY[locale];
  const { selected } = useParetoStore(useShallow(selectHero));
  const [picked, setPicked] = useState<string[]>([]);
  const maxSlots = 4;
  const toggleSkill = (id: string) =>
    setPicked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < maxSlots ? [...prev, id] : prev));
  return (
    <section className={cardClass} data-testid="v3-SkillChoices">
      <h3 className={sectionTitleClass}>{localizedStoreText('ui_label.assist_skills', locale)} — {localizedEntityName('hero', selected, locale)}</h3>
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
          <p className="col-span-2 text-xs text-[color:var(--color-text-muted)]">{copy.skill.noEffects}</p>
        )}
      </div>
      <p className="mt-2 text-xs text-[color:var(--color-text-muted)]">{copy.skill.picked} {picked.length}/{maxSlots}</p>
    </section>
  );
}

// ───────────────────────────── 8. OptimizationTable ─────────────────────────────
export function OptimizationTable() {
  const locale = useV3Locale();
  const copy = V3_COPY[locale];
  const damage = useParetoStore(selectFinalDamage);
  const channels = useMemo(() => Object.entries(damage.channel_breakdown).slice(0, 8), [damage.channel_breakdown]);
  const [lockedResourceIds, setLockedResourceIds] = useState<string[]>([]);
  const handleLock = useCallback(
    (id: string) => setLockedResourceIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])),
    [],
  );
  return (
    <section className={cardClass} data-testid="v3-OptimizationTable">
      <h3 className={sectionTitleClass}>{localizedStoreText('ui_label.recommend_order', locale)}</h3>
      <table className="w-full font-mono text-xs">
        <thead>
          <tr className="text-left text-[color:var(--color-text-muted)]">
            <th className="py-1">{copy.output.channel}</th>
            <th>Δ</th>
            <th>{copy.output.lock}</th>
          </tr>
        </thead>
        <tbody>
          {channels.length === 0 && (
            <tr><td colSpan={3} className="py-2 text-[color:var(--color-text-muted)]">{copy.output.noChannels}</td></tr>
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
  const locale = useV3Locale();
  const copy = V3_COPY[locale];
  const { selected, all } = useParetoStore(useShallow(selectHero));
  const selectHeroAction = useParetoStore((s) => s.selectHero);
  return (
    <section className={cardClass} data-testid="v3-HeroSelectModal">
      <h3 className={sectionTitleClass}>{copy.hero.title} ({all.length})</h3>
      <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
        {all.map((h) => (
          <button
            key={h.id}
            type="button"
            onClick={() => selectHeroAction(h.id as HeroId)}
            className={selected.id === h.id ? btnActiveClass : btnClass}
            data-testid={`v3-hero-${h.id}`}
          >
            {localizedEntityName('hero', h, locale)} <span className="text-[10px] opacity-70">[{h.tier}]</span>
          </button>
        ))}
      </div>
    </section>
  );
}

// ───────────────────────────── 10. CollectiblesAccordion ─────────────────────────────
export function CollectiblesAccordion() {
  const locale = useV3Locale();
  const copy = V3_COPY[locale];
  const sets = useParetoStore(selectCollectibles);
  const setCollectibleSetStars = useParetoStore((s) => s.setCollectibleSetStars);
  const [openSetId, setOpenSetId] = useState<string | null>(null);
  return (
    <section className={cardClass} data-testid="v3-CollectiblesAccordion">
      <h3 className={sectionTitleClass}>{copy.collectibles.title} ({sets.length})</h3>
      <ul className="space-y-1">
        {sets.map((item) => (
          <li key={item.id} className="rounded border border-[color:var(--color-border)]">
            <button
              type="button"
              onClick={() => setOpenSetId(openSetId === item.id ? null : item.id)}
              className="flex w-full items-center justify-between p-2 text-xs"
            >
              <span>{localizedEntityName('collectibleSet', item, locale)} · {item.collectible_count}{locale === 'ko' ? copy.collectibles.items : ` ${copy.collectibles.items}`}</span>
              <span>{openSetId === item.id ? '▼' : '▶'}</span>
            </button>
            {openSetId === item.id && (
              <div className="border-t border-[color:var(--color-border)]/50 p-2 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <label className="block text-[color:var(--color-text-muted)]">
                    {copy.collectibles.goldStars}
                    <input
                      type="number"
                      min={0}
                      className={inputClass + ' mt-1 text-xs'}
                      value={item.gold_stars}
                      onChange={(ev) => setCollectibleSetStars(item.id, Number(ev.target.value), item.red_stars)}
                    />
                  </label>
                  <label className="block text-[color:var(--color-text-muted)]">
                    {copy.collectibles.redStars}
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
  const locale = useV3Locale();
  const copy = V3_COPY[locale];
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
      <h3 className={sectionTitleClass}>{localizedStoreText('ui_label.lme_battle_phase', locale)} {copy.turf.board}</h3>
      <p className="text-xs text-[color:var(--color-text-muted)]">{copy.turf.tiles}: {turf.nodes.length}. {copy.turf.helper}</p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {phases.map((p) => {
          const weightKey = p === 'boss_phase_1' ? turf.boss_phase_1_weight : p === 'boss_phase_2' ? turf.boss_phase_2_weight : p === 'battle_phase' ? turf.battle_phase_weight : turf.expedition_phase_weight;
          return (
            <label key={p} className="block text-xs text-[color:var(--color-text-muted)]">
              {copy.turf.phases[p]}
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
        <p className="mt-2 text-xs italic text-[color:var(--color-text-muted)]">{copy.turf.empty}</p>
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
  const locale = useV3Locale();
  const copy = V3_COPY[locale];
  const { pets, deployed } = useParetoStore(useShallow(selectPets));
  const deployPet = useParetoStore((s) => s.deployPet);
  const setAssistPet = useParetoStore((s) => s.setAssistPet);
  return (
    <section className={cardClass} data-testid="v3-PetSelectRadio">
      <h3 className={sectionTitleClass}>{copy.pets.title} ({pets.length})</h3>
      <div className="grid grid-cols-3 gap-1">
        {pets.map((p) => (
          <label key={p.id} className="flex items-center gap-1 text-xs">
            <input
              type="radio"
              name="deployed-pet"
              checked={deployed === p.id}
              onChange={() => deployPet(p.id)}
            />
            {localizedEntityName('pet', p, locale)}
          </label>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {[0, 1].map((slot) => (
          <label key={slot} className="text-xs text-[color:var(--color-text-muted)]">
            {copy.pets.assist} {slot + 1}
            <select
              className={inputClass + ' mt-1 text-xs'}
              defaultValue=""
              onChange={(e) => setAssistPet(slot as 0 | 1, e.target.value || null)}
            >
              <option value="">—</option>
              {pets.map((p) => <option key={p.id} value={p.id}>{localizedEntityName('pet', p, locale)}</option>)}
            </select>
          </label>
        ))}
      </div>
    </section>
  );
}

// ───────────────────────────── 13. XenoDetailsPanel (empty-state for isolated areas) ─────────────────────────────
export function XenoDetailsPanel() {
  const locale = useV3Locale();
  const copy = V3_COPY[locale];
  const { pets, deployed } = useParetoStore(useShallow(selectPets));
  const pending_xeno_specs = useParetoStore(selectXenoPendingSpecs);
  const setResonanceChance = useParetoStore((s) => s.setResonanceChance);
  const setResonanceAtk = useParetoStore((s) => s.setResonanceAtk);
  const deployedPet = pets.find((p) => p.id === deployed) ?? null;
  const isolatedTargets: IsolatedXenoTarget[] = ['judgment_necklace_future_xeno', 'twin_lance_xeno_effect_table'];

  return (
    <section className={cardClass} data-testid="v3-XenoDetailsPanel">
      <h3 className={sectionTitleClass}>{localizedStoreText('ui_label.xeno_transmute', locale)} / {localizedStoreText('ui_label.xenopets', locale)}</h3>

      {/* Pet resonance fields */}
      {deployedPet && deployedPet.is_xeno ? (
        <div className="mb-3 rounded border border-[color:var(--color-border)] p-2">
          <p className="text-xs font-semibold">{localizedEntityName('pet', deployedPet, locale)}</p>
          <label className="mt-1 block text-xs text-[color:var(--color-text-muted)]">
            {copy.xeno.resonanceChance}
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
            {copy.xeno.resonanceAtk}
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
        <p className="mb-3 text-xs text-[color:var(--color-text-muted)]">{copy.xeno.deployXeno}</p>
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
                  {localizedStoreText('ui_label.future_update', locale)}
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
                {copy.xeno.controlsDisabled}
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
  const locale = useV3Locale();
  const copy = V3_COPY[locale];
  const conditional = useParetoStore(selectConditionalState);
  const setShieldActive = useParetoStore((s) => s.setShieldActive);
  return (
    <section className={cardClass} data-testid="v3-ReviveSettingsToggle">
      <h3 className={sectionTitleClass}>{copy.revive.title}</h3>
      <label className="flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={conditional.shield_active}
          onChange={(e) => setShieldActive(e.target.checked)}
          data-testid="v3-shield-toggle"
        />
        {copy.revive.shieldActive}
      </label>
    </section>
  );
}

// ───────────────────────────── 15. ResourceLockButton (P4 자유 영역 lockSlice) ─────────────────────────────
export function ResourceLockButton({
  resourceId = 'designs_owned',
  limit = null,
}: { resourceId?: string; limit?: number | null }) {
  const locale = useV3Locale();
  const copy = V3_COPY[locale];
  const [locked, setLocked] = useState(false);
  const designsOwned = useParetoStore((s) => s.designs_owned);
  const reachedLimit = limit !== null && designsOwned >= limit;
  const resourceLabel = resourceId === 'designs_owned' ? copy.resource.designsOwned : resourceId;
  return (
    <section className={cardClass} data-testid="v3-ResourceLockButton">
      <h3 className={sectionTitleClass}>{copy.resource.title}</h3>
      <button
        type="button"
        onClick={() => setLocked((v) => !v)}
        className={locked ? btnActiveClass : btnClass}
        aria-pressed={locked}
        data-testid="v3-resource-lock-toggle"
      >
        {locked ? `🔒 ${resourceLabel} ${copy.resource.locked}` : `🔓 ${resourceLabel} ${copy.resource.unlocked}`}
      </button>
      {limit !== null && (
        <p className="mt-1 text-xs text-[color:var(--color-text-muted)]">
          {designsOwned}/{limit} {reachedLimit ? copy.resource.limitReached : ''}
        </p>
      )}
    </section>
  );
}

// ───────────────────────────── Registry sanity check (matches UI_COMPONENT_REGISTRY) ─────────────────────────────
export const V3_COMPONENTS = {
  ModeSelectDropdown, OutputPanel, BaseInputsBox, ItemSelectGrids, WeaponUpgradeSlider,
  TechPartsPanel, SkillChoices, OptimizationTable, HeroSelectModal, CollectiblesAccordion,
  TalentTurfMatrix, PetSelectRadio, XenoDetailsPanel, ReviveSettingsToggle, ResourceLockButton,
} as const;

export { TechPartsPanel };
