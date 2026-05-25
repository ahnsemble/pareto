import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const frontendRoot = resolve(__dirname, '..');
const sourceDir = resolve(frontendRoot, '../tttg_forge_wasm/pkg');
const outputDir = resolve(frontendRoot, '.generated/public-wasm');

const textReplacements = [
  ['sio_export_to_player_state_patch_js', 'app_export_to_player_state_patch_js'],
  ['validate_sio_tech_inventory_js', 'validate_app_tech_inventory_js'],
  ['sioTechInventory', 'appTechInventory'],
  ['sio_tech_inventory', 'app_tech_inventory'],
  ['invalid_sio_tech_inventory', 'invalid_app_tech_inventory'],
  ['sioCandidate', 'appCandidate'],
  ['sioLm', 'appLm'],
  ['full_sio', 'full_app'],
  ['sio-tools', 'reference'],
  ['sio_', 'app_'],
  ['sio ', 'app '],
  ['sio.', 'app.'],
  ['siochip', 'appchip'],
  ['siosio', 'appapp'],
  ['SIO', 'APP'],
];

function assertSameByteLength(from, to) {
  const fromLength = Buffer.byteLength(from);
  const toLength = Buffer.byteLength(to);
  if (fromLength !== toLength) {
    throw new Error(`Replacement must preserve byte length: ${from} (${fromLength}) -> ${to} (${toLength})`);
  }
}

for (const [from, to] of textReplacements) {
  assertSameByteLength(from, to);
}

function replaceAllBytes(buffer, from, to) {
  const needle = Buffer.from(from);
  const replacement = Buffer.from(to);
  let index = buffer.indexOf(needle);
  let count = 0;
  while (index !== -1) {
    replacement.copy(buffer, index);
    count += 1;
    index = buffer.indexOf(needle, index + replacement.length);
  }
  return count;
}

function sanitizeText(source) {
  let output = source;
  for (const [from, to] of textReplacements) {
    output = output.split(from).join(to);
  }
  return output;
}

mkdirSync(outputDir, { recursive: true });

const sourceJsPath = resolve(sourceDir, 'tttg_forge_wasm.js');
const outputJsPath = resolve(outputDir, 'tttg_forge_wasm.js');
writeFileSync(outputJsPath, sanitizeText(readFileSync(sourceJsPath, 'utf8')));

const sourceWasmPath = resolve(sourceDir, 'tttg_forge_wasm_bg.wasm');
const outputWasmPath = resolve(outputDir, 'tttg_forge_wasm_bg.wasm');
const wasm = Buffer.from(readFileSync(sourceWasmPath));
const counts = Object.fromEntries(textReplacements.map(([from, to]) => [from, replaceAllBytes(wasm, from, to)]));
writeFileSync(outputWasmPath, wasm);

copyFileSync(resolve(sourceDir, 'package.json'), resolve(outputDir, 'package.json'));

console.log(
  JSON.stringify({
    script: 'build_public_wasm_surface',
    outputDir,
    replacements: counts,
  }),
);
