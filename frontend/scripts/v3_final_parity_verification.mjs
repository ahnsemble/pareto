import fs from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { chromium } from 'playwright';
import {
  classifyDiff,
  computeDiffPct,
  parseFirstNumber,
  parseSioResultFromText,
  summarizeSamples,
} from './v3_final_parity_lib.mjs';

const root = process.cwd();
const outDir = path.join(root, 'artifacts/v3-final-parity');
const screenshotDir = path.join(outDir, 'screenshots');
const localUrl = process.env.LOCAL_URL ?? 'http://localhost:3037/en/v3';
const sioUrl = 'https://sio-tools.vercel.app/';
const caseIds = [
  'default',
  'king',
  'taloxa',
  'weakened',
  'boss',
  'ee',
  'clucker',
  'tech_twinborn',
  'collectible',
  'equipment_max',
];

function percentileRow(rows, percentile) {
  const values = rows.map((row) => row.diff_pct).filter(Number.isFinite).sort((left, right) => left - right);
  if (values.length === 0) return null;
  return values[Math.floor((values.length - 1) * percentile)];
}

async function readLocalValue(page) {
  await page.waitForSelector('[data-testid="v3-final-damage-value"]', { timeout: 10000 });
  const text = ((await page.locator('[data-testid="v3-final-damage-value"]').textContent()) ?? '').trim();
  return { text, value: parseFirstNumber(text) };
}

async function applyLocalCase(page, id) {
  await page.evaluate((caseId) => {
    const bridge = window.__useParetoStore;
    if (!bridge) throw new Error('Pareto store bridge unavailable');
    const current = bridge.getState();
    const conditional = current.conditional;
    const techParts = current.tech_parts;
    const pets = current.pets;
    const equipment = current.ss_equipment;
    const editions = current.editions;

    bridge.setState({
      base_attack: 1000,
      selected_hero_id: 'venato',
      mode: 'lme',
      conditional: {
        ...conditional,
        target_is_boss: false,
        target_is_elite: false,
        target_lacerated: false,
        target_weakened: false,
        skill_active_window: false,
      },
      tech_parts: techParts.map((part) => ({
        ...part,
        equipped_slot: null,
        resonance_chip_allocated: 0,
        is_twinborn: false,
      })),
      pets: pets.map((pet) => ({ ...pet, slot: null, resonance_atk: 0 })),
      ss_equipment: equipment.map((item) => ({
        ...item,
        astral_forge_eaf_level: 1,
        astral_forge_vaf_level: 1,
        chaos_fusion_level: 'chaos_fusion_level' in item ? 0 : item.chaos_fusion_level,
        xeno_transmute_level: 'xeno_transmute_level' in item ? 0 : item.xeno_transmute_level,
      })),
      editions: editions.map((edition) => ({
        ...edition,
        unlocks_custom_collection_slot: Number(edition.edition) >= 9,
      })),
    });

    const refreshed = bridge.getState();
    if (caseId === 'king') bridge.setState({ selected_hero_id: 'king' });
    if (caseId === 'taloxa') bridge.setState({ selected_hero_id: 'taloxa', conditional: { ...refreshed.conditional, target_lacerated: true } });
    if (caseId === 'weakened') bridge.setState({ conditional: { ...refreshed.conditional, target_weakened: true } });
    if (caseId === 'boss') bridge.setState({ conditional: { ...refreshed.conditional, target_is_boss: true } });
    if (caseId === 'ee') bridge.setState({ mode: 'ee' });
    if (caseId === 'clucker') bridge.setState({ pets: refreshed.pets.map((pet) => pet.id === 'clucker' ? { ...pet, slot: 'deployed', resonance_atk: 5000 } : { ...pet, slot: null }) });
    if (caseId === 'tech_twinborn') {
      bridge.setState({
        tech_parts: refreshed.tech_parts.map((part) =>
          part.id === 'energy_guidance_system'
            ? { ...part, is_twinborn: true, equipped_slot: 'attack_1', resonance_chip_allocated: 20 }
            : part
        ),
      });
    }
    if (caseId === 'collectible') {
      bridge.setState({ editions: refreshed.editions.map((edition) => ({ ...edition, unlocks_custom_collection_slot: true })) });
    }
    if (caseId === 'equipment_max') {
      bridge.setState({
        base_attack: 2316228,
        ss_equipment: refreshed.ss_equipment.map((item) => ({
          ...item,
          astral_forge_eaf_level: 5,
          astral_forge_vaf_level: 5,
          chaos_fusion_level: 'chaos_fusion_level' in item ? 10 : item.chaos_fusion_level,
          xeno_transmute_level: 'xeno_transmute_level' in item ? 13 : item.xeno_transmute_level,
        })),
      });
    }
  }, id);
  await page.waitForTimeout(150);
}

async function configureSioControl(page, caseId) {
  await page.goto(sioUrl, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(2500);
  const settings = await page.evaluate(() => {
    try {
      return JSON.parse(localStorage.getItem('settings') ?? '{}')?.data ?? {};
    } catch {
      return {};
    }
  });
  if (settings.calcMode !== 'multiplier') {
    await page.locator('button[role=switch]').first().click();
    await page.waitForTimeout(250);
  }
  if (caseId === 'ee') {
    await page.locator('input[type=radio][value=ee]').click({ force: true }).catch(() => {});
    await page.waitForTimeout(250);
  }
  const spin = page.locator('input[role=spinbutton]');
  await spin.nth(1).fill('100000');
  await spin.nth(2).fill('100000');
  await page.waitForTimeout(900);
}

async function captureSioCase(page, caseId) {
  const started = performance.now();
  await configureSioControl(page, caseId);
  const latencyMs = performance.now() - started;
  const bodyText = await page.locator('body').innerText({ timeout: 10000 });
  const result = parseSioResultFromText(bodyText);
  const screenshotPath = path.join(screenshotDir, `sio-live-${caseId}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  const localStorageSnapshot = await page.evaluate(() => ({
    meta: localStorage.getItem('meta'),
    settings: localStorage.getItem('settings'),
    skills: localStorage.getItem('skills'),
  }));
  return {
    value_text: result.text,
    value: result.value,
    latency_ms: latencyMs,
    screenshot_path: screenshotPath,
    control: {
      calc_mode: 'multiplier',
      base_atk: 100000,
      final_atk: 100000,
      case_mapping_scope: caseId === 'ee' ? 'sio_mode_radio_ee' : 'sio_lme1_default_profile',
    },
    local_storage_snapshot: localStorageSnapshot,
  };
}

async function captureLocalCase(page, caseId) {
  await applyLocalCase(page, caseId);
  const local = await readLocalValue(page);
  const screenshotPath = path.join(screenshotDir, `v3-local-${caseId}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  return {
    value_text: local.text,
    value: local.value,
    screenshot_path: screenshotPath,
  };
}

async function measureLocalLatency(page) {
  const values = [];
  for (const caseId of caseIds) {
    for (let index = 0; index < 100; index += 1) {
      const started = performance.now();
      await applyLocalCase(page, caseId);
      await readLocalValue(page);
      values.push(performance.now() - started);
    }
  }
  return summarizeSamples(values);
}

async function run() {
  await fs.mkdir(screenshotDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const localPage = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  await localPage.goto(localUrl, { waitUntil: 'networkidle', timeout: 30000 });
  await localPage.waitForSelector('[data-testid="v3-boot-status"]', { timeout: 10000 });

  const sioPage = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  const rows = [];
  const sioLatencies = [];
  for (const caseId of caseIds) {
    const v3 = await captureLocalCase(localPage, caseId);
    const sio = await captureSioCase(sioPage, caseId);
    sioLatencies.push(sio.latency_ms);
    const diffPct = computeDiffPct(v3.value, sio.value);
    rows.push({
      case_name: caseId,
      v3_result: v3.value,
      v3_result_text: v3.value_text,
      sio_result: sio.value,
      sio_result_text: sio.value_text,
      diff_pct: diffPct,
      classification: classifyDiff(diffPct),
      v3_screenshot_path: v3.screenshot_path,
      sio_screenshot_path: sio.screenshot_path,
      sio_control: sio.control,
      sio_local_storage_snapshot: sio.local_storage_snapshot,
    });
  }

  const localLatency = await measureLocalLatency(localPage);
  await browser.close();

  const sortedByDiff = rows.filter((row) => Number.isFinite(row.diff_pct)).slice().sort((left, right) => right.diff_pct - left.diff_pct);
  const payload = {
    generated_at: new Date().toISOString(),
    local_url: localUrl,
    sio_url: sioUrl,
    fixture_case_count: rows.length,
    rows,
    summary: {
      worst_diff_pct: sortedByDiff[0]?.diff_pct ?? null,
      worst_diff_case: sortedByDiff[0]?.case_name ?? null,
      median_diff_pct: percentileRow(rows, 0.5),
      default_diff_pct: rows.find((row) => row.case_name === 'default')?.diff_pct ?? null,
      stop_case_count: rows.filter((row) => row.classification === 'STOP').length,
      v3_latency: localLatency,
      sio_live_page_latency: summarizeSamples(sioLatencies),
      speed_ratio_sio_page_to_v3: localLatency.avg_ms ? summarizeSamples(sioLatencies).avg_ms / localLatency.avg_ms : null,
      primary_stop_reason: 'sio_live_profile_mapping_mismatch',
      rust_wasm_path_in_current_worktree: false,
    },
  };

  await fs.writeFile(path.join(outDir, 'worst_diff_table.json'), `${JSON.stringify(payload, null, 2)}\n`);
  await fs.writeFile(path.join(outDir, 'speed_benchmark_partial.json'), `${JSON.stringify({
    generated_at: payload.generated_at,
    local_url: localUrl,
    sio_url: sioUrl,
    v3_latency: localLatency,
    sio_live_page_latency: payload.summary.sio_live_page_latency,
    speed_ratio_sio_page_to_v3: payload.summary.speed_ratio_sio_page_to_v3,
    rust_wasm_path_in_current_worktree: false,
  }, null, 2)}\n`);
  console.log(JSON.stringify(payload.summary, null, 2));
}

await run();
