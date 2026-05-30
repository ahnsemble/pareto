'use client';

import type { TechPartConfigMap } from '../../../app/lib/pareto-store/tech/types';
import type { TechPartSchema } from '../../../app/lib/pareto-store/types';
import { localizeTechEntityName, normalizeTechOptimizerLocale, type TechOptimizerLocale } from './techLocaleCopy';
import { TechHexagonCard } from './TechHexagonCard';

const TECH_MODE_DETAIL_LABELS: Record<string, string> = {
  molotovMode: 'Molotov Mode',
  durianMode: 'Durian Mode',
  soccerMode: 'Soccer Mode',
  droneMode: 'Drone Mode',
  forcefieldMode: 'Forcefield Mode',
  drillShotMode: 'Drill Shot Mode',
  rocketMode: 'Rocket Mode',
  lightningMode: 'Lightning Mode',
  boomerangMode: 'Boomerang Mode',
  guardianMode: 'Guardian Mode',
  laserMode: 'Laser Mode',
  brickMode: 'Brick Mode',
};
const TECH_BASE_SKILL_LABELS: Record<string, string> = {
  molotov: 'Molotov',
  durian: 'Durian',
  soccer: 'Soccer',
  drone: 'Drone',
  forcefield: 'Forcefield',
  drillShot: 'Drill Shot',
  rocket: 'Rocket',
  lightning: 'Lightning',
  boomerang: 'Boomerang',
  guardian: 'Guardian',
  laser: 'Laser',
  brick: 'Brick',
};

interface TechPartsGridProps {
  title: string;
  testId: string;
  entries: TechPartSchema[];
  configs: TechPartConfigMap;
  onOpenConfig?: (id: string) => void;
  locale?: string;
}

function localizedModeDetail(detail: string, locale: TechOptimizerLocale): string {
  const label = TECH_MODE_DETAIL_LABELS[detail] ?? detail;
  if (locale === 'en' || label === 'no mode') return label;
  return localizeTechEntityName('techPart', label, locale);
}

function localizedBaseSkillDetail(skillId: string | undefined, locale: TechOptimizerLocale): string {
  if (!skillId) return '';
  const label = TECH_BASE_SKILL_LABELS[skillId] ?? skillId;
  if (locale === 'en') return label;
  return localizeTechEntityName('techPart', label, locale);
}

export function TechPartsGrid({ title, testId, entries, configs, onOpenConfig, locale }: TechPartsGridProps) {
  const normalizedLocale = normalizeTechOptimizerLocale(locale);
  return (
    <div data-testid={testId}>
      <h4 className="mb-2 text-[11px] uppercase tracking-wide text-[color:var(--color-text-muted)]">{title}</h4>
      <div className="grid grid-cols-4 gap-x-3 gap-y-4 sm:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8">
        {entries.map((entry) => {
          const config = configs[entry.id as keyof TechPartConfigMap];
          const detail = config
            ? `${config.mode ? localizedModeDetail(config.mode, normalizedLocale) : normalizedLocale === 'ko' ? '모드 없음' : 'no mode'} · ${config.resonance}`
            : entry.category === 'modeVariant'
              ? localizedBaseSkillDetail(entry.base_skill_id, normalizedLocale)
              : '';
          return (
            <TechHexagonCard
              key={entry.id}
              id={entry.id}
              label={localizeTechEntityName('techPart', entry.display_name_en, normalizedLocale)}
              detail={detail}
              active={config?.equipped ?? false}
              locked={entry.id === 'ammoThruster' || entry.id === 'heFuel'}
              onClick={config && onOpenConfig ? () => onOpenConfig(entry.id) : undefined}
            />
          );
        })}
      </div>
    </div>
  );
}
