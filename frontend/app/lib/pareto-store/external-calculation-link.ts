export type ParsedExternalCalculationInput =
  | { kind: 'json'; text: string }
  | { kind: 'raw'; raw: string }
  | { kind: 'code'; code: string }
  | { kind: 'unsupported'; reason: string };

type CalculationLinkFetcher = (url: string) => Promise<{
  ok: boolean;
  json: () => Promise<unknown>;
}>;

function base64UrlToSignedBytes(raw: string): number[] {
  const padded = raw.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(raw.length / 4) * 4, '=');
  const binary =
    typeof Buffer !== 'undefined'
      ? Buffer.from(padded, 'base64')
      : Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
  return Array.from(binary, (value) => (value > 127 ? value - 256 : value));
}

function toUnsignedBytes(value: unknown): Uint8Array {
  if (value instanceof Uint8Array) return value;
  if (Array.isArray(value)) {
    return Uint8Array.from(value.map((byte) => (byte < 0 ? byte + 256 : byte)));
  }
  if (typeof value === 'string') return new TextEncoder().encode(value);
  throw new Error('Calculation link payload could not be decoded');
}

function decodeMsgpackString(bytes: Uint8Array): string {
  const first = bytes[0];
  let offset = 1;
  let length: number;

  if ((first & 0xe0) === 0xa0) {
    length = first & 0x1f;
  } else if (first === 0xd9) {
    length = bytes[offset++];
  } else if (first === 0xda) {
    length = (bytes[offset] << 8) | bytes[offset + 1];
    offset += 2;
  } else if (first === 0xdb) {
    length = bytes[offset] * 2 ** 24 + (bytes[offset + 1] << 16) + (bytes[offset + 2] << 8) + bytes[offset + 3];
    offset += 4;
  } else {
    throw new Error('Unsupported packed profile payload');
  }

  return new TextDecoder().decode(bytes.slice(offset, offset + length));
}

export function parseExternalCalculationInput(text: string): ParsedExternalCalculationInput {
  const value = text.trim();
  if (!value) return { kind: 'unsupported', reason: 'empty' };
  if (value.startsWith('{') || value.startsWith('[')) return { kind: 'json', text: value };

  try {
    const url = new URL(value);
    const raw = url.searchParams.get('raw');
    const code = url.searchParams.get('code');
    if (raw) return { kind: 'raw', raw };
    if (code) return { kind: 'code', code };
  } catch {
    if (/^[A-Za-z0-9_-]{500,}$/.test(value)) return { kind: 'raw', raw: value };
    if (/^[A-Za-z0-9]{4,16}$/.test(value)) return { kind: 'code', code: value };
  }

  return { kind: 'unsupported', reason: 'unsupported input' };
}

export async function decodeExternalCalculationRaw(raw: string): Promise<Record<string, unknown>> {
  const lzma = await import('lzma/src/lzma-d-min.js');
  const decompressor = lzma.default.LZMA_WORKER;
  if (!decompressor) throw new Error('Calculation link payload could not be decoded');
  const bytes = base64UrlToSignedBytes(raw);
  const packed = await new Promise<unknown>((resolve, reject) => {
    const maybe = decompressor.decompress(bytes, (result: unknown, error?: unknown) => {
      if (error) reject(error);
      else resolve(result);
    });
    if (maybe !== undefined) resolve(maybe);
  });
  const jsonText = decodeMsgpackString(toUnsignedBytes(packed));
  return JSON.parse(jsonText) as Record<string, unknown>;
}

export async function resolveExternalCalculationCode(
  code: string,
  fetcher: CalculationLinkFetcher = fetch,
): Promise<string> {
  const url = `https://is.gd/forward.php?format=json&shorturl=https://is.gd/${encodeURIComponent(code)}`;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetcher(url);
      if (!response.ok) throw new Error('forward failed');
      const payload = await response.json();
      if (!payload || typeof payload !== 'object' || !('url' in payload)) {
        throw new Error('missing target url');
      }
      const parsed = parseExternalCalculationInput(String((payload as { url: unknown }).url));
      if (parsed.kind !== 'raw') throw new Error('missing calculation payload');
      return parsed.raw;
    } catch {
      if (attempt === 1) {
        throw new Error('Calculation link could not be opened');
      }
    }
  }
  throw new Error('Calculation link could not be opened');
}
