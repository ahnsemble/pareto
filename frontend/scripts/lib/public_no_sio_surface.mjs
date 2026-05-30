import fs from 'node:fs/promises';
import path from 'node:path';

const TARGET_TERMS = [
  { id: 'survivor_io', bytes: Buffer.from('survivor.io'), replacement: Buffer.from('survival io'), caseInsensitive: true },
  { id: 'sio_tools', bytes: Buffer.from('sio-tools'), replacement: Buffer.from('app-tools'), caseInsensitive: true },
  { id: 'uppercase_sio_word', bytes: Buffer.from('SIO'), replacement: Buffer.from('APP'), uppercaseWordBoundary: true },
];

function isAsciiLetter(byte) {
  return (byte >= 65 && byte <= 90) || (byte >= 97 && byte <= 122);
}

function isAsciiWordByte(byte) {
  return isAsciiLetter(byte) || (byte >= 48 && byte <= 57) || byte === 95;
}

function lowerByte(byte) {
  return isAsciiLetter(byte) ? byte | 32 : byte;
}

function matchesBytes(buffer, index, term) {
  if (index + term.bytes.length > buffer.length) return false;
  for (let offset = 0; offset < term.bytes.length; offset += 1) {
    const actual = term.caseInsensitive ? lowerByte(buffer[index + offset]) : buffer[index + offset];
    if (actual !== term.bytes[offset]) return false;
  }
  if (term.uppercaseWordBoundary) {
    const before = index > 0 ? buffer[index - 1] : 0;
    const after = index + term.bytes.length < buffer.length ? buffer[index + term.bytes.length] : 0;
    if (isAsciiWordByte(before) || isAsciiWordByte(after)) return false;
  }
  return true;
}

function casedReplacement(original, replacement) {
  const output = Buffer.from(replacement);
  for (let index = 0; index < output.length; index += 1) {
    if (!isAsciiLetter(output[index]) || !isAsciiLetter(original[index])) continue;
    if (original[index] >= 65 && original[index] <= 90) {
      output[index] &= 0xdf;
    }
  }
  return output;
}

function replaceTargetTerms(buffer) {
  const output = Buffer.from(buffer);
  const matches = [];
  for (let index = 0; index < output.length; index += 1) {
    const term = TARGET_TERMS.find((candidate) => matchesBytes(output, index, candidate));
    if (!term) continue;
    const original = output.subarray(index, index + term.bytes.length);
    const replacement = term.caseInsensitive ? casedReplacement(original, term.replacement) : term.replacement;
    replacement.copy(output, index);
    matches.push({ id: term.id, index });
    index += term.bytes.length - 1;
  }
  return { buffer: output, matches };
}

export function sanitizeSioSubstrings(buffer) {
  const result = replaceTargetTerms(buffer);
  return { buffer: result.buffer, count: result.matches.length };
}

export function countSioSubstrings(buffer) {
  let count = 0;
  for (let index = 0; index < buffer.length; index += 1) {
    const term = TARGET_TERMS.find((candidate) => matchesBytes(buffer, index, candidate));
    if (!term) continue;
    count += 1;
    index += term.bytes.length - 1;
  }
  return count;
}

async function walk(root) {
  const entries = await fs.readdir(root, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const filePath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(filePath)));
    } else if (entry.isFile()) {
      files.push(filePath);
    }
  }
  return files;
}

export async function existingRoots(roots) {
  const output = [];
  for (const root of roots) {
    try {
      const stat = await fs.stat(root);
      if (stat.isDirectory()) {
        output.push(root);
      }
    } catch (error) {
      if (error?.code !== 'ENOENT') {
        throw error;
      }
    }
  }
  return output;
}

export async function sanitizeSioSubstringsInFile(filePath) {
  const input = await fs.readFile(filePath);
  const result = sanitizeSioSubstrings(input);
  if (result.count > 0) {
    await fs.writeFile(filePath, result.buffer);
  }
  return result.count;
}

export async function sanitizeSioSubstringsInRoots(roots) {
  const existing = await existingRoots(roots);
  const rows = [];
  for (const root of existing) {
    for (const file of await walk(root)) {
      const count = await sanitizeSioSubstringsInFile(file);
      if (count > 0) {
        rows.push({ file, count });
      }
    }
  }
  return rows;
}

export async function findSioSubstrings(roots) {
  const existing = await existingRoots(roots);
  const rows = [];
  for (const root of existing) {
    for (const file of await walk(root)) {
      const count = countSioSubstrings(await fs.readFile(file));
      if (count > 0) {
        rows.push({ file, count });
      }
    }
  }
  return rows;
}
