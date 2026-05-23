import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..', '..');
const vercelConfigPaths = [
  resolve(repoRoot, 'vercel.json'),
  resolve(repoRoot, 'vercel.static.json'),
];

function readCsp(configPath) {
  const config = JSON.parse(readFileSync(configPath, 'utf8'));
  const globalHeaders = config.headers?.find((entry) => entry.source === '/(.*)')?.headers ?? [];
  const csp = globalHeaders.find((header) => header.key === 'Content-Security-Policy')?.value;
  assert.ok(csp, `${configPath} is missing Content-Security-Policy`);
  return csp;
}

function readDirective(csp, directiveName) {
  const directive = csp
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${directiveName} `));
  assert.ok(directive, `CSP is missing ${directiveName}`);
  return directive.split(/\s+/).slice(1);
}

for (const configPath of vercelConfigPaths) {
  const connectSrc = readDirective(readCsp(configPath), 'connect-src');
  assert.ok(connectSrc.includes("'self'"), `${configPath} connect-src must keep self`);
  assert.ok(connectSrc.includes('https://is.gd'), `${configPath} connect-src must allow short calculation links`);
}

console.log('Vercel CSP config unit checks passed.');
