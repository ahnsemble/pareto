import type {
  ImportedCollectibleSnapshot,
  ImportedTechSnapshot,
  ProductImportCoverage,
  ProductImportFieldSummary,
} from './profile-import-types';

export const TECH_PROFILE_STORAGE_VERSION = 1;

export const TECH_PROFILE_SAVE_SLOTS = [
  {
    id: 'endersEcho',
    storageKey: 'tangtang:tech-profile:enders-echo',
    labels: { en: "Ender's Echo", ko: '종말의 메아리' },
  },
  {
    id: 'guildExpedition',
    storageKey: 'tangtang:tech-profile:guild-expedition',
    labels: { en: 'Guild Expedition', ko: '길드원정' },
  },
] as const;

export type TechProfileSaveSlotId = (typeof TECH_PROFILE_SAVE_SLOTS)[number]['id'];

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export type TechProfileSaveState = {
  activeProfileSlot?: TechProfileSaveSlotId;
  accountContext: Record<string, unknown>;
  resourceWallet: Record<string, unknown>;
  rarityCounts: Record<string, unknown>;
  chips: number;
  skillSlots: number;
  overloadable: boolean;
  maxOverload: number;
  speedMode: string;
  limit: string;
  skillStatus: Record<string, unknown>;
  profileImportText?: string;
  importedTechSnapshot?: ImportedTechSnapshot | null;
  importedCollectibleSnapshot?: ImportedCollectibleSnapshot | null;
  importedRunSnapshot?: {
    activeProfileSlot?: TechProfileSaveSlotId;
    accountContext: Record<string, unknown>;
    inventory: Record<string, unknown>;
  } | null;
  profileImportSummary?: string;
  profileImportCoverage?: ProductImportCoverage[];
  profileImportDetails?: ProductImportFieldSummary[];
};

export type TechProfileSaveDocument = {
  version: typeof TECH_PROFILE_STORAGE_VERSION;
  slotId: TechProfileSaveSlotId;
  savedAt: string;
  state: TechProfileSaveState;
};

export type TechProfileSaveResult =
  | { ok: true; savedAt: string }
  | { ok: false; reason: 'storage-unavailable' | 'invalid-slot' };

export type TechProfileLoadResult =
  | { ok: true; document: TechProfileSaveDocument }
  | { ok: false; reason: 'empty' | 'invalid' | 'storage-unavailable' | 'invalid-slot' };

export type TechProfileRemoveResult =
  | { ok: true }
  | { ok: false; reason: 'storage-unavailable' | 'invalid-slot' };

function slotById(slotId: TechProfileSaveSlotId) {
  return TECH_PROFILE_SAVE_SLOTS.find((slot) => slot.id === slotId);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function cloneRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? { ...value } : {};
}

function optionalSnapshot<T>(value: unknown): T | null | undefined {
  return value === null || isRecord(value) ? value as T | null : undefined;
}

function validSlotId(value: unknown): TechProfileSaveSlotId | undefined {
  return value === 'endersEcho' || value === 'guildExpedition' ? value : undefined;
}

function normalizeSaveState(input: TechProfileSaveState | Record<string, unknown>): TechProfileSaveState {
  const importedRunSnapshot = isRecord(input.importedRunSnapshot)
    ? {
        ...(validSlotId(input.importedRunSnapshot.activeProfileSlot) ? { activeProfileSlot: validSlotId(input.importedRunSnapshot.activeProfileSlot) } : {}),
        accountContext: cloneRecord(input.importedRunSnapshot.accountContext),
        inventory: cloneRecord(input.importedRunSnapshot.inventory),
      }
    : input.importedRunSnapshot === null
      ? null
      : undefined;

  return {
    ...(validSlotId(input.activeProfileSlot) ? { activeProfileSlot: validSlotId(input.activeProfileSlot) } : {}),
    accountContext: cloneRecord(input.accountContext),
    resourceWallet: cloneRecord(input.resourceWallet),
    rarityCounts: cloneRecord(input.rarityCounts),
    chips: Number(input.chips ?? 0),
    skillSlots: Number(input.skillSlots ?? 0),
    overloadable: Boolean(input.overloadable),
    maxOverload: Number(input.maxOverload ?? 0),
    speedMode: typeof input.speedMode === 'string' ? input.speedMode : 'normal',
    limit: typeof input.limit === 'string' ? input.limit : 'basic',
    skillStatus: cloneRecord(input.skillStatus),
    importedTechSnapshot: optionalSnapshot<ImportedTechSnapshot>(input.importedTechSnapshot),
    importedCollectibleSnapshot: optionalSnapshot<ImportedCollectibleSnapshot>(input.importedCollectibleSnapshot),
    importedRunSnapshot,
  };
}

function parseDocument(raw: string): TechProfileSaveDocument | null {
  try {
    const parsed = JSON.parse(raw);
    if (!isRecord(parsed) || parsed.version !== TECH_PROFILE_STORAGE_VERSION) return null;
    if (parsed.slotId !== 'endersEcho' && parsed.slotId !== 'guildExpedition') return null;
    if (typeof parsed.savedAt !== 'string' || !isRecord(parsed.state)) return null;
    return {
      version: TECH_PROFILE_STORAGE_VERSION,
      slotId: parsed.slotId,
      savedAt: parsed.savedAt,
      state: normalizeSaveState(parsed.state),
    };
  } catch {
    return null;
  }
}

export function storageKeyForTechProfileSlot(slotId: TechProfileSaveSlotId): string {
  return slotById(slotId)?.storageKey ?? '';
}

export function labelForTechProfileSaveSlot(slotId: TechProfileSaveSlotId, locale?: string): string {
  const slot = slotById(slotId);
  if (!slot) return '';
  return locale === 'ko' ? slot.labels.ko : slot.labels.en;
}

export function buildTechProfileSaveDocument(
  slotId: TechProfileSaveSlotId,
  state: TechProfileSaveState | Record<string, unknown>,
  now = new Date(),
): TechProfileSaveDocument {
  return {
    version: TECH_PROFILE_STORAGE_VERSION,
    slotId,
    savedAt: now.toISOString(),
    state: normalizeSaveState(state),
  };
}

export function saveTechProfileSlot(
  storage: StorageLike,
  slotId: TechProfileSaveSlotId,
  state: TechProfileSaveState | Record<string, unknown>,
  now = new Date(),
): TechProfileSaveResult {
  const key = storageKeyForTechProfileSlot(slotId);
  if (!key) return { ok: false, reason: 'invalid-slot' };
  const document = buildTechProfileSaveDocument(slotId, state, now);
  try {
    storage.setItem(key, JSON.stringify(document));
    return { ok: true, savedAt: document.savedAt };
  } catch {
    return { ok: false, reason: 'storage-unavailable' };
  }
}

export function loadTechProfileSlot(storage: StorageLike, slotId: TechProfileSaveSlotId): TechProfileLoadResult {
  const key = storageKeyForTechProfileSlot(slotId);
  if (!key) return { ok: false, reason: 'invalid-slot' };
  try {
    const raw = storage.getItem(key);
    if (!raw) return { ok: false, reason: 'empty' };
    const document = parseDocument(raw);
    return document ? { ok: true, document } : { ok: false, reason: 'invalid' };
  } catch {
    return { ok: false, reason: 'storage-unavailable' };
  }
}

export function removeTechProfileSlot(storage: StorageLike, slotId: TechProfileSaveSlotId): TechProfileRemoveResult {
  const key = storageKeyForTechProfileSlot(slotId);
  if (!key) return { ok: false, reason: 'invalid-slot' };
  try {
    storage.removeItem(key);
    return { ok: true };
  } catch {
    return { ok: false, reason: 'storage-unavailable' };
  }
}
