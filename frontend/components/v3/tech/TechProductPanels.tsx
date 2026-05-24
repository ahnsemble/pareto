'use client';

import {
  RESOURCE_WALLET_FIELDS,
  type ResourceWalletId,
  type ResourceWalletValues,
} from '../../../app/lib/pareto-store/resource-wallet';
import type { TechDataConfidenceSummary } from '../../../app/lib/pareto-store/tech-data-confidence';
import type { ProductImportCoverage, ProductImportFieldSummary } from '../../../app/lib/pareto-store/profile-import-types';
import type { TechProfileSaveSlotId } from '../../../app/lib/pareto-store/tech-profile-storage';
import { buttonClass, inputClass, labelClass, panelClass } from '../optimizerUi';
import {
  getTechOptimizerCopy,
  localizeTechFieldLabel,
  localizeTechResourceWalletFields,
} from './techLocaleCopy';

export function ResourceWalletPanel({
  values,
  onChange,
  locale,
}: {
  values: ResourceWalletValues;
  onChange: (id: ResourceWalletId, value: number) => void;
  locale?: string;
}) {
  const copy = getTechOptimizerCopy(locale);
  const fieldCopy = new Map(localizeTechResourceWalletFields(locale).map((field) => [field.id, field]));

  return (
    <div className={panelClass} data-testid="tech-resource-wallet">
      <h2 className={labelClass}>{copy.resourceWallet.title}</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {RESOURCE_WALLET_FIELDS.map((field) => {
          const localized = fieldCopy.get(field.id) ?? field;
          return (
            <label key={field.id} className="block text-sm text-[color:var(--color-text)]">
              <span className="flex items-center justify-between gap-3">
                <span className="text-xs text-[color:var(--color-text-muted)]">{localized.label}</span>
                <span className="rounded-sm border border-[color:var(--color-border)] px-2 py-1 font-mono text-[10px] uppercase text-[color:var(--color-text-muted)]">
                  {localized.scopeLabel}
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
          );
        })}
      </div>
    </div>
  );
}

export function ProfileSavePanel({
  slots,
  status,
  onSave,
  onLoad,
  onDelete,
  onPreset,
  onShare,
  onBackup,
  shareUrl,
  shareStatus,
  backupText,
  backupStatus,
  locale,
}: {
  slots: Array<{ id: TechProfileSaveSlotId; label: string; savedAt: string | null }>;
  status: string;
  onSave: (slotId: TechProfileSaveSlotId) => void;
  onLoad: (slotId: TechProfileSaveSlotId) => void;
  onDelete: (slotId: TechProfileSaveSlotId) => void;
  onPreset?: (slotId: TechProfileSaveSlotId) => void;
  onShare?: () => void | Promise<void>;
  onBackup?: () => void | Promise<void>;
  shareUrl?: string;
  shareStatus?: string;
  backupText?: string;
  backupStatus?: string;
  locale?: string;
}) {
  const copy = getTechOptimizerCopy(locale);

  return (
    <div className={panelClass} data-testid="tech-profile-save">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className={labelClass}>{copy.profileSave.title}</h2>
          <p className="mt-1 text-xs text-[color:var(--color-text-muted)]">{copy.profileSave.description}</p>
        </div>
        <p className="min-h-5 text-xs text-[color:var(--color-text-muted)]" data-testid="tech-profile-save-status">
          {status}
        </p>
      </div>
      {onShare || onBackup ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {onShare ? (
            <button
              type="button"
              className={buttonClass}
              data-testid="tech-profile-share-link"
              onClick={onShare}
            >
              {copy.profileSave.copyShareLink}
            </button>
          ) : null}
          {onBackup ? (
            <button
              type="button"
              className={buttonClass}
              data-testid="tech-profile-backup-copy"
              onClick={onBackup}
            >
              {copy.profileSave.copyBackup}
            </button>
          ) : null}
        </div>
      ) : null}
      {shareUrl ? (
        <div className="mt-3 rounded-md border border-[color:var(--color-border)]/60 p-3">
          <label className="block text-xs uppercase text-[color:var(--color-text-muted)]" htmlFor="tech-profile-share-url-output">
            {copy.profileSave.shareUrl}
          </label>
          <input
            id="tech-profile-share-url-output"
            className={inputClass + ' mt-2 font-mono text-xs'}
            data-testid="tech-profile-share-url-output"
            readOnly
            value={shareUrl}
            onFocus={(event) => event.currentTarget.select()}
          />
          <p className="mt-2 text-xs text-[color:var(--color-text-muted)]" data-testid="tech-profile-share-status">
            {shareStatus}
          </p>
        </div>
      ) : null}
      {backupText ? (
        <div className="mt-3 rounded-md border border-[color:var(--color-border)]/60 p-3">
          <label className="block text-xs uppercase text-[color:var(--color-text-muted)]" htmlFor="tech-profile-backup-output">
            {copy.profileSave.backup}
          </label>
          <textarea
            id="tech-profile-backup-output"
            className={inputClass + ' mt-2 min-h-20 font-mono text-xs'}
            data-testid="tech-profile-backup-output"
            readOnly
            value={backupText}
            onFocus={(event) => event.currentTarget.select()}
          />
          <p className="mt-2 text-xs text-[color:var(--color-text-muted)]" data-testid="tech-profile-backup-status">
            {backupStatus}
          </p>
        </div>
      ) : null}
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        {slots.map((slot) => (
          <div
            key={slot.id}
            className="rounded-md border border-[color:var(--color-border)]/60 p-3"
            data-testid={`tech-profile-save-${slot.id}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[color:var(--color-text)]">{slot.label}</p>
                <p className="mt-1 text-xs text-[color:var(--color-text-muted)]">
                  {slot.savedAt ? copy.profileSave.savedAt(slot.savedAt) : copy.profileSave.empty}
                </p>
              </div>
            </div>
            <div className={`mt-3 grid gap-2 ${onPreset ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'}`}>
              <button
                type="button"
                className={buttonClass}
                data-testid={`tech-profile-save-${slot.id}-save`}
                onClick={() => onSave(slot.id)}
              >
                {copy.profileSave.save}
              </button>
              <button
                type="button"
                className={buttonClass}
                data-testid={`tech-profile-save-${slot.id}-load`}
                disabled={!slot.savedAt}
                onClick={() => onLoad(slot.id)}
              >
                {copy.profileSave.load}
              </button>
              <button
                type="button"
                className={buttonClass}
                data-testid={`tech-profile-save-${slot.id}-delete`}
                disabled={!slot.savedAt}
                onClick={() => onDelete(slot.id)}
              >
                {copy.profileSave.delete}
              </button>
              {onPreset ? (
                <button
                  type="button"
                  className={buttonClass}
                  data-testid={`tech-profile-save-${slot.id}-preset`}
                  onClick={() => onPreset(slot.id)}
                >
                  {copy.profileSave.preset}
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProfileImportPanel({
  value,
  onChange,
  onImport,
  onClear,
  onRun,
  canRun = false,
  summary,
  coverage = [],
  details = [],
  importing = false,
  running = false,
  locale,
}: {
  value: string;
  onChange: (value: string) => void;
  onImport: () => void | Promise<void>;
  onClear?: () => void;
  onRun?: () => void | Promise<void>;
  canRun?: boolean;
  summary: string;
  coverage?: ProductImportCoverage[];
  details?: ProductImportFieldSummary[];
  importing?: boolean;
  running?: boolean;
  locale?: string;
}) {
  const copy = getTechOptimizerCopy(locale);
  const importedCount = coverage.filter((item) => item.status === 'imported').length;
  const reviewCount = coverage.filter((item) => item.status === 'needsReview').length;
  const missingCount = coverage.filter((item) => item.status === 'missing').length;
  const statusCopy = (status: ProductImportCoverage['status']) =>
    status === 'imported' ? copy.profileImport.imported.toLowerCase() : status === 'needsReview' ? copy.profileImport.review.toLowerCase() : copy.profileImport.missing.toLowerCase();

  return (
    <div className={panelClass} data-testid="tech-profile-import">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className={labelClass}>{copy.profileImport.title}</h2>
          <p className="mt-1 text-xs text-[color:var(--color-text-muted)]">
            {copy.profileImport.description}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {onClear && (value.trim().length > 0 || summary || coverage.length > 0 || details.length > 0) ? (
            <button type="button" className={buttonClass} disabled={importing} onClick={onClear}>
              {copy.profileImport.clear}
            </button>
          ) : null}
          <button type="button" className={buttonClass} disabled={importing || value.trim().length === 0} onClick={onImport}>
            {importing ? copy.profileImport.actionBusy : copy.profileImport.action}
          </button>
        </div>
      </div>
      <label className="mt-3 block text-sm text-[color:var(--color-text)]">
        <span className="text-xs text-[color:var(--color-text-muted)]">{copy.profileImport.inputLabel}</span>
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
        <>
          <div className="mt-3 border-t border-[color:var(--color-border)]/60 pt-3 text-xs" data-testid="tech-profile-import-review">
            <div className="flex flex-wrap gap-2 font-mono text-[11px] uppercase text-[color:var(--color-text-muted)]">
              <span>{copy.profileImport.imported} {importedCount}</span>
              <span>{copy.profileImport.review} {reviewCount}</span>
              <span>{copy.profileImport.missing} {missingCount}</span>
            </div>
            <p className="mt-2 text-[color:var(--color-text-muted)]">{copy.profileImport.editableReview}</p>
            {onRun ? (
              <button
                type="button"
                className={buttonClass + ' mt-3 w-full'}
                disabled={!canRun || importing}
                onClick={onRun}
              >
                {running ? copy.profileImport.running : copy.profileImport.runImported}
              </button>
            ) : null}
            {details.length > 0 ? (
              <div className="mt-2 grid max-h-44 gap-1 overflow-y-auto pr-1" data-testid="tech-profile-import-field-review">
                {details.map((item) => (
                  <div
                    key={`${item.group}-${item.id}`}
                    className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 border-t border-[color:var(--color-border)]/40 py-1 font-mono text-[11px]"
                  >
                    <span className="truncate text-[color:var(--color-text-muted)]">
                      {localizeTechFieldLabel(item.label, locale)}
                      {item.needsReview ? ` / ${copy.profileImport.review.toLowerCase()}` : ''}
                    </span>
                    <span className="max-w-[9rem] truncate text-right text-[color:var(--color-text)]">{item.value}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
          <div className="mt-2 flex flex-wrap gap-2" data-testid="tech-profile-import-coverage">
            {coverage.map((item) => (
              <span
                key={item.id}
                className="rounded-sm border border-[color:var(--color-border)] px-2 py-1 text-[11px] text-[color:var(--color-text-muted)]"
              >
                {localizeTechFieldLabel(item.label, locale)}: {statusCopy(item.status)}
                {item.count !== undefined ? ` (${item.count})` : ''}
              </span>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

export function DataConfidencePanel({
  summary,
  locale,
}: {
  summary: TechDataConfidenceSummary;
  locale?: string;
}) {
  const copy = getTechOptimizerCopy(locale);
  return (
    <div className={panelClass} data-testid="tech-data-confidence">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className={labelClass}>{copy.dataConfidence.title}</h2>
        <span
          className="rounded-sm border border-[color:var(--color-border)] px-2 py-1 font-mono text-[11px] uppercase text-[color:var(--color-text-muted)]"
          data-testid="tech-data-confidence-level"
        >
          {copy.dataConfidence.levels[summary.level]}
        </span>
      </div>
      <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-[color:var(--color-text-muted)]">
        {summary.details.map((detail) => (
          <li key={detail}>{detail}</li>
        ))}
      </ul>
    </div>
  );
}
