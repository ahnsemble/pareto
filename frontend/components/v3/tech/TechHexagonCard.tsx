'use client';

interface TechHexagonCardProps {
  id: string;
  label: string;
  detail?: string;
  active?: boolean;
  locked?: boolean;
  onClick?: () => void;
}

export function TechHexagonCard({ id, label, detail, active = false, locked = false, onClick }: TechHexagonCardProps) {
  const detailParts = detail?.split(' · ') ?? [];
  const modeLabel = detailParts[0] && detailParts[0] !== 'activeSkill' ? detailParts[0] : '';
  const resonance = detailParts[1] ?? (detail && /^\d+$/.test(detail) ? detail : '');
  return (
    <button
      type="button"
      className={`group flex h-[98px] min-w-[74px] flex-col items-center justify-start gap-1 rounded-sm border border-transparent p-1 text-center transition hover:bg-[color:var(--color-bg)]/70 ${
        active
          ? 'text-[color:var(--color-primary)]'
          : 'text-[color:var(--color-secondary)]'
      } ${locked ? 'opacity-45' : ''}`}
      data-testid={`tech-card-${id}`}
      onClick={onClick}
    >
      <span
        className={`relative grid h-12 w-14 place-items-center text-xs font-bold text-[color:var(--color-bg)] shadow-md ${
          active ? 'bg-[color:var(--color-primary)]' : locked ? 'bg-[color:var(--color-danger)]' : 'bg-[color:var(--color-secondary)]'
        }`}
        style={{ clipPath: 'polygon(25% 5%, 75% 5%, 100% 50%, 75% 95%, 25% 95%, 0 50%)' }}
        aria-hidden="true"
      >
        {active ? '✓' : locked ? '×' : '+'}
      </span>
      <span className="line-clamp-2 min-h-[28px] max-w-[78px] text-[11px] font-semibold leading-[14px] text-[color:var(--color-primary)]">
        {label}
      </span>
      {(modeLabel || resonance) && (
        <span className="flex max-w-[78px] items-center justify-center gap-1 text-[10px] leading-none text-[color:var(--color-text-muted)]">
          {modeLabel && <span className="truncate">{modeLabel}</span>}
          {resonance && (
            <>
              <span className="h-2 w-2 shrink-0 bg-[color:var(--color-accent)]" style={{ clipPath: 'polygon(25% 5%, 75% 5%, 100% 50%, 75% 95%, 25% 95%, 0 50%)' }} />
              <span>{resonance}</span>
            </>
          )}
        </span>
      )}
    </button>
  );
}
