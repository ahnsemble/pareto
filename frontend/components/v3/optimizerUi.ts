export type BootState = 'pending' | 'ok' | string;

export const shellClass = 'mx-auto w-full max-w-6xl space-y-4 p-6';
export const headerClass = '-mx-6 border-b border-[color:var(--color-border)]/50 bg-[color:var(--color-bg)] px-6 pb-3 pt-2';
export const panelClass = 'min-w-0 rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-surface-elev)] p-4';
export const labelClass = 'text-xs uppercase text-[color:var(--color-text-muted)]';
export const inputClass = 'min-h-[44px] min-w-0 w-full rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 py-2 font-mono text-sm text-[color:var(--color-text)]';
export const buttonClass = 'min-h-[44px] rounded-md bg-[color:var(--color-primary)] px-4 py-2 font-mono text-sm font-semibold text-[color:var(--color-bg)] hover:bg-[color:var(--color-primary-strong)] disabled:cursor-not-allowed disabled:opacity-40';
export const linkClass = 'inline-flex min-h-[44px] items-center rounded-md px-2 font-mono text-xs text-[color:var(--color-text-muted)] hover:text-[color:var(--color-primary)]';
export const selectClass = inputClass;
export const checkboxClass = 'h-5 w-5 rounded border border-[color:var(--color-border)] bg-[color:var(--color-bg)]';

export function formatNumber(value: number, digits = 2): string {
  return value.toLocaleString(undefined, { maximumFractionDigits: digits });
}

export function formatCompactScientific(value: number): string {
  if (!Number.isFinite(value)) return 'n/a';
  if (value < 1_000_000) return formatNumber(value, 0);
  return value.toExponential(2);
}
