import {
  buildTechProfileSaveDocument,
  type TechProfileSaveSlotId,
  type TechProfileSaveDocument,
  type TechProfileSaveState,
} from './tech-profile-storage';

export const TECH_PROFILE_SHARE_PARAM = 'ttProfile';
const TECH_PROFILE_SHARE_KIND = 'tangtang-tech-profile-share';
const TECH_PROFILE_BACKUP_KIND = 'tangtang-tech-profile-backup';
const TECH_PROFILE_SHARE_VERSION = 1;

export type TechProfileShareDecodeResult =
  | { ok: true; document: TechProfileSaveDocument }
  | { ok: false; reason: 'invalid' };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function encodeUrlPayload(value: string): string {
  const bytes = new TextEncoder().encode(value);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function decodeUrlPayload(value: string): string {
  if (value.length % 2 !== 0 || /[^0-9a-f]/i.test(value)) {
    throw new Error('invalid payload');
  }
  const bytes = new Uint8Array(value.length / 2);
  for (let index = 0; index < value.length; index += 2) {
    bytes[index / 2] = Number.parseInt(value.slice(index, index + 2), 16);
  }
  return new TextDecoder().decode(bytes);
}

function validSlotId(value: unknown): TechProfileSaveSlotId | undefined {
  return value === 'endersEcho' || value === 'guildExpedition' ? value : undefined;
}

function slotIdForShareState(state: TechProfileSaveState | Record<string, unknown>): TechProfileSaveSlotId {
  return validSlotId(state.activeProfileSlot) ?? 'endersEcho';
}

function shareDocument(state: TechProfileSaveState | Record<string, unknown>, now: Date) {
  return {
    kind: TECH_PROFILE_SHARE_KIND,
    version: TECH_PROFILE_SHARE_VERSION,
    document: buildTechProfileSaveDocument(slotIdForShareState(state), state, now),
  };
}

function normalizeDecodedDocument(value: unknown): TechProfileShareDecodeResult {
  if (!isRecord(value)) return { ok: false, reason: 'invalid' };
  const rawDocument = isRecord(value.document) ? value.document : null;
  if (value.kind !== TECH_PROFILE_SHARE_KIND || value.version !== TECH_PROFILE_SHARE_VERSION || !rawDocument) {
    return { ok: false, reason: 'invalid' };
  }
  const savedAt = typeof rawDocument.savedAt === 'string' ? new Date(rawDocument.savedAt) : null;
  if (!savedAt || !Number.isFinite(savedAt.getTime()) || !isRecord(rawDocument.state)) {
    return { ok: false, reason: 'invalid' };
  }
  return {
    ok: true,
    document: buildTechProfileSaveDocument(validSlotId(rawDocument.slotId) ?? slotIdForShareState(rawDocument.state), rawDocument.state, savedAt),
  };
}

export function encodeTechProfileShareState(
  state: TechProfileSaveState | Record<string, unknown>,
  now = new Date(),
): string {
  return encodeUrlPayload(JSON.stringify(shareDocument(state, now)));
}

export function decodeTechProfileShareState(value: string): TechProfileShareDecodeResult {
  try {
    return normalizeDecodedDocument(JSON.parse(decodeUrlPayload(value)));
  } catch {
    return { ok: false, reason: 'invalid' };
  }
}

export function buildTechProfileShareUrl({
  baseUrl,
  now = new Date(),
  state,
}: {
  baseUrl: string;
  state: TechProfileSaveState | Record<string, unknown>;
  now?: Date;
}): string {
  const url = new URL(baseUrl);
  url.search = '';
  url.hash = new URLSearchParams({
    [TECH_PROFILE_SHARE_PARAM]: encodeTechProfileShareState(state, now),
  }).toString();
  return url.toString();
}

export function getTechProfileSharePayloadFromUrl(value: string): string | null {
  try {
    const url = new URL(value);
    const fragmentPayload = new URLSearchParams(url.hash.replace(/^#/, '')).get(TECH_PROFILE_SHARE_PARAM);
    if (fragmentPayload) return fragmentPayload;
    return url.searchParams.get(TECH_PROFILE_SHARE_PARAM);
  } catch {
    return null;
  }
}

export function buildTechProfileBackupText(
  state: TechProfileSaveState | Record<string, unknown>,
  now = new Date(),
): string {
  return JSON.stringify(
    {
      kind: TECH_PROFILE_BACKUP_KIND,
      v: TECH_PROFILE_SHARE_VERSION,
      payload: encodeTechProfileShareState(state, now),
    },
    null,
    2,
  );
}

export function decodeTechProfileBackupText(value: string): TechProfileShareDecodeResult {
  try {
    const parsed = JSON.parse(value);
    if (!isRecord(parsed) || parsed.kind !== TECH_PROFILE_BACKUP_KIND || parsed.v !== TECH_PROFILE_SHARE_VERSION || typeof parsed.payload !== 'string') {
      return { ok: false, reason: 'invalid' };
    }
    return decodeTechProfileShareState(parsed.payload);
  } catch {
    return { ok: false, reason: 'invalid' };
  }
}
