'use client';

import {
  TECH_MODES,
  type TechMode,
  type TechPartConfig,
  type TwinbornCategory,
} from '../../../app/lib/pareto-store/tech/types';
import type { TechPartSchema } from '../../../app/lib/pareto-store/types';

interface TechPartConfigModalProps {
  part: TechPartSchema | null;
  config: TechPartConfig | null;
  onClose: () => void;
  onEquip: (id: TwinbornCategory, equipped: boolean) => void;
  onMode: (id: TwinbornCategory, mode: TechMode | null) => void;
  onResonance: (id: TwinbornCategory, resonance: number) => void;
  onOverload: (id: TwinbornCategory, overload: number) => void;
  onSupportParts: (id: TwinbornCategory, supportParts: boolean) => void;
}

const MODE_LABELS: Record<TechMode, string> = {
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

export function TechPartConfigModal({
  part,
  config,
  onClose,
  onEquip,
  onMode,
  onResonance,
  onOverload,
  onSupportParts,
}: TechPartConfigModalProps) {
  if (!part || !config) return null;
  const id = config.id;
  const overloadMax = Math.floor(config.resonance / 3500) + 1;
  const overloadNext = overloadMax + 1;
  const threshold = overloadMax * 3500;

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-black/70 p-4" role="presentation">
      <section
        role="dialog"
        aria-label="Tech parts Configuration"
        className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-surface-elev)] p-4 shadow-xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-[color:var(--color-text)]">Tech parts Configuration</h3>
            <p className="text-xs text-[color:var(--color-text-muted)]">{part.display_name_en}</p>
          </div>
          <button type="button" className="rounded-md px-3 py-2 text-sm text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)]" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
          <div className="space-y-4">
            <label className="flex min-h-[44px] items-center gap-2 text-sm text-[color:var(--color-text)]">
              <input
                type="checkbox"
                checked={config.equipped}
                onChange={(event) => onEquip(id, event.target.checked)}
              />
              Equip {part.display_name_en}
            </label>

            <fieldset className="rounded-md border border-[color:var(--color-border)] p-3">
              <legend className="px-1 text-xs uppercase text-[color:var(--color-text-muted)]">Mode</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {TECH_MODES.map((mode) => (
                  <label key={mode} className="flex min-h-[36px] items-center gap-2 text-xs text-[color:var(--color-text)]">
                    <input
                      type="radio"
                      name={`tech-mode-${id}`}
                      checked={config.mode === mode}
                      onChange={() => onMode(id, mode)}
                    />
                    {MODE_LABELS[mode]}
                  </label>
                ))}
              </div>
            </fieldset>

            <label className="block text-xs text-[color:var(--color-text-muted)]">
              Total Resonance Energy
              <input
                aria-label="Total Resonance Energy"
                className="mt-1 min-h-[44px] w-full rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 py-2 font-mono text-sm text-[color:var(--color-text)]"
                min={0}
                type="number"
                value={config.resonance}
                onChange={(event) => onResonance(id, Number(event.target.value))}
              />
            </label>

            <label className="flex min-h-[44px] items-center gap-2 text-sm text-[color:var(--color-text)]">
              <input
                type="checkbox"
                checked={config.supportParts}
                onChange={(event) => onSupportParts(id, event.target.checked)}
              />
              Enter support parts manually
            </label>

            <label className="block text-xs text-[color:var(--color-text-muted)]">
              Overload
              <input
                aria-label="Overload"
                className="mt-1 min-h-[44px] w-full rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 py-2 font-mono text-sm text-[color:var(--color-text)]"
                min={0}
                type="number"
                value={config.overload}
                onChange={(event) => onOverload(id, Number(event.target.value))}
              />
            </label>
            <p className="text-xs text-[color:var(--color-text-muted)]">
              max: {overloadMax} → {overloadNext} at {threshold}
            </p>
          </div>

          <div className="grid place-items-center rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg)] p-4">
            <div className="grid grid-cols-2 gap-3" data-testid="tech-mode-hexagon-preview">
              <span
                className="grid h-20 w-20 place-items-center bg-[color:var(--color-primary)] text-lg font-bold text-[color:var(--color-bg)]"
                style={{ clipPath: 'polygon(25% 5%, 75% 5%, 100% 50%, 75% 95%, 25% 95%, 0 50%)' }}
              >
                ✓
              </span>
              <span
                className="grid h-20 w-20 place-items-center bg-[color:var(--color-danger)] text-lg font-bold text-[color:var(--color-bg)]"
                style={{ clipPath: 'polygon(25% 5%, 75% 5%, 100% 50%, 75% 95%, 25% 95%, 0 50%)' }}
              >
                +
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
