import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = process.cwd();
const scanRoots = ['out', '.next/static'].map((item) => resolve(root, item)).filter(existsSync);
const textExtensions = new Set(['.html', '.js', '.json', '.txt', '.map']);
const disallowedPatterns = [
  /\bSIO\b/,
  /sio-tools/i,
  /sio_full_lm_equivalence/,
  /sioLm/,
  /sioTech/,
  /sio_[A-Za-z0-9_]*/,
  /sioCandidate/,
  /full_sio_equivalent/,
  /validate_sio/,
  /sio_export/,
  /data-full-sio-equivalent/,
  /data-scoring-model/,
];

function extensionOf(filePath) {
  const match = filePath.match(/\.[^.]+$/);
  return match ? match[0] : '';
}

function walk(dir) {
  const output = [];
  for (const entry of readdirSync(dir)) {
    const filePath = join(dir, entry);
    const stat = statSync(filePath);
    if (stat.isDirectory()) output.push(...walk(filePath));
    else output.push(filePath);
  }
  return output;
}

const findings = [];
for (const rootDir of scanRoots) {
  for (const filePath of walk(rootDir)) {
    const ext = extensionOf(filePath);
    if (textExtensions.has(ext)) {
      const text = readFileSync(filePath, 'utf8');
      for (const pattern of disallowedPatterns) {
        if (pattern.test(text)) findings.push(`${filePath.replace(`${root}/`, '')}: ${pattern}`);
      }
    }
    if (ext === '.wasm') {
      const text = execFileSync('strings', [filePath], { encoding: 'utf8' });
      for (const pattern of disallowedPatterns) {
        if (pattern.test(text)) findings.push(`${filePath.replace(`${root}/`, '')} strings: ${pattern}`);
      }
    }
  }
}

assert.ok(scanRoots.length > 0, 'Build output missing; run npm run build before this guard');
assert.deepEqual(findings, [], findings.join('\n'));
console.log('tangtang_public_build_surface_unit_test: passed');
