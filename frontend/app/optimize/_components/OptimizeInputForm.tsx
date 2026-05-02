'use client';

import { HeroOption, HEROES, COLLECTIBLES } from './heroes';

interface Props {
  selectedHero: string | null;
  onSelectHero: (id: string) => void;
  ownedSet: Set<number>;
  onToggleCollectible: (id: number) => void;
  onClearCollectibles: () => void;
  onSelectAllCollectibles: () => void;
}

export function OptimizeInputForm({
  selectedHero,
  onSelectHero,
  ownedSet,
  onToggleCollectible,
  onClearCollectibles,
  onSelectAllCollectibles,
}: Props) {
  const heroDetail: HeroOption | undefined = HEROES.find((h) => h.id === selectedHero);

  return (
    <section className="space-y-6">
      <div>
        <label
          htmlFor="hero-select"
          className="mb-2 block text-xs uppercase tracking-wider text-[color:var(--color-text-muted)]"
        >
          1. Hero
        </label>
        <select
          id="hero-select"
          value={selectedHero ?? ''}
          onChange={(e) => onSelectHero(e.target.value)}
          className="w-full rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 py-2.5 font-mono text-sm text-[color:var(--color-text)] focus:border-[color:var(--color-primary)]"
        >
          <option value="" disabled>
            Select a hero…
          </option>
          {HEROES.map((hero) => (
            <option key={hero.id} value={hero.id}>
              {hero.label} — {hero.slotCount} slots
            </option>
          ))}
        </select>
        {heroDetail && (
          <p className="mt-2 text-xs text-[color:var(--color-text-muted)]">
            {heroDetail.tagline}
          </p>
        )}
      </div>

      <div>
        <div className="mb-2 flex items-baseline justify-between">
          <label className="text-xs uppercase tracking-wider text-[color:var(--color-text-muted)]">
            2. Collectibles ({ownedSet.size} / 64 owned)
          </label>
          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={onSelectAllCollectibles}
              className="inline-flex min-h-[44px] items-center px-3 py-2 text-[color:var(--color-primary)] hover:underline"
            >
              all
            </button>
            <span className="text-[color:var(--color-text-muted)]">·</span>
            <button
              type="button"
              onClick={onClearCollectibles}
              className="inline-flex min-h-[44px] items-center px-3 py-2 text-[color:var(--color-primary)] hover:underline"
            >
              clear
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 md:grid-cols-8">
          {COLLECTIBLES.map((c) => {
            const owned = ownedSet.has(c.id);
            return (
              <button
                key={c.id}
                type="button"
                role="switch"
                aria-checked={owned}
                aria-label={c.name}
                onClick={() => onToggleCollectible(c.id)}
                className={
                  "relative rounded border px-1.5 py-1.5 font-mono text-[10px] transition before:absolute before:inset-[-10px] before:content-[''] " +
                  (owned
                    ? 'border-[color:var(--color-primary)] bg-[color:var(--color-primary)]/10 text-[color:var(--color-primary)]'
                    : 'border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-text-muted)] hover:border-[color:var(--color-primary-strong)]')
                }
                title={c.name}
              >
                {String(c.id + 1).padStart(2, '0')}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
