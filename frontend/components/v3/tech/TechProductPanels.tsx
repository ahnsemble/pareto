'use client';

import {
  RESOURCE_WALLET_FIELDS,
  type ResourceWalletId,
  type ResourceWalletValues,
} from '../../../app/lib/pareto-store/resource-wallet';
import type { ProductImportCoverage } from '../../../app/lib/pareto-store/profile-import';
import { buttonClass, inputClass, labelClass, panelClass } from '../optimizerUi';

export function ResourceWalletPanel({
  values,
  onChange,
}: {
  values: ResourceWalletValues;
  onChange: (id: ResourceWalletId, value: number) => void;
}) {
  return (
    <div className={panelClass} data-testid="tech-resource-wallet">
      <h2 className={labelClass}>Resource wallet</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {RESOURCE_WALLET_FIELDS.map((field) => (
          <label key={field.id} className="block text-sm text-[color:var(--color-text)]">
            <span className="flex items-center justify-between gap-3">
              <span className="text-xs text-[color:var(--color-text-muted)]">{field.label}</span>
              <span className="rounded-sm border border-[color:var(--color-border)] px-2 py-1 font-mono text-[10px] uppercase text-[color:var(--color-text-muted)]">
                {field.scopeLabel}
              </span>
            </span>
            <input
              className={inputClass + ' mt-1'}
              data-testid={field.testId}
              min={0}
              type="number"
              value={values[field.id]}
              onChange={(event) => onChange(field.id, Math.max(0, Number(event.target.value)))}
            />
          </label>
        ))}
      </div>
    </div>
  );
}

export function ProfileImportPanel({
  value,
  onChange,
  onImport,
  summary,
  coverage = [],
  importing = false,
}: {
  value: string;
  onChange: (value: string) => void;
  onImport: () => void | Promise<void>;
  summary: string;
  coverage?: ProductImportCoverage[];
  importing?: boolean;
}) {
  return (
    <div className={panelClass} data-testid="tech-profile-import">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className={labelClass}>Tangtang profile import</h2>
          <p className="mt-1 text-xs text-[color:var(--color-text-muted)]">
            Paste a profile JSON or calculation link to fill this optimizer.
          </p>
        </div>
        <button type="button" className={buttonClass} disabled={importing || value.trim().length === 0} onClick={onImport}>
          {importing ? 'Importing...' : 'Import profile'}
        </button>
      </div>
      <label className="mt-3 block text-sm text-[color:var(--color-text)]">
        <span className="text-xs text-[color:var(--color-text-muted)]">Profile JSON or calculation link</span>
        <textarea
          className={inputClass + ' mt-1 min-h-28 resize-y'}
          data-testid="tech-profile-import-input"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </label>
      <p className="mt-2 min-h-5 text-xs text-[color:var(--color-text-muted)]" data-testid="tech-profile-import-summary">
        {summary}
      </p>
      {coverage.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-2" data-testid="tech-profile-import-coverage">
          {coverage.map((item) => (
            <span
              key={item.id}
              className="rounded-sm border border-[color:var(--color-border)] px-2 py-1 text-[11px] text-[color:var(--color-text-muted)]"
            >
              {item.label}: {item.status === 'imported' ? 'imported' : item.status === 'needsReview' ? 'review' : 'missing'}
              {item.count !== undefined ? ` (${item.count})` : ''}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
