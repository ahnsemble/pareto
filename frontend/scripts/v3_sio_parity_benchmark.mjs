import fs from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { chromium } from 'playwright';

const root = process.cwd();
const outDir = path.join(root, 'artifacts/v3-calibration');
const localUrl = 'http://localhost:3037/en/v3';
const sioUrl = 'https://sio-tools.vercel.app/';
const calibration = JSON.parse(await fs.readFile(path.join(root, 'app/lib/pareto-store/formula/calibration/dattebayo_coefficients.json'), 'utf8'));

function parseNumeric(text) {
  const cleaned = String(text).replace(/,/g, '');
  const match = cleaned.match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/i);
  return match ? Number(match[0]) : null;
}

async function readLocalValue(page) {
  await page.waitForSelector('[data-testid="v3-final-damage-value"]', { timeout: 10000 });
  const text = (await page.locator('[data-testid="v3-final-damage-value"]').textContent()) ?? '';
  return { text: text.trim(), value: parseNumeric(text) };
}

async function resetLocal(page) {
  await page.evaluate(() => {
    const store = window.__useParetoStore;
    const state = store.getState();
    store.setState({
      base_attack: 1000,
      selected_hero_id: 'venato',
      mode: 'lme',
      conditional: {
        hp_missing_ratio: 0,
        target_is_boss: false,
        target_is_elite: false,
        target_lacerated: false,
        target_weakened: false,
        kill_count: 0,
        shield_active: false,
        skill_active_window: false,
      },
      tech_parts: state.tech_parts.map((part) => ({ ...part, equipped_slot: null, resonance_chip_allocated: 0, is_twinborn: part.twinborn_components.length > 0 })),
      pets: state.pets.map((pet) => ({ ...pet, slot: null, resonance_atk: 0 })),
      editions: state.editions.map((edition) => ({ ...edition, unlocks_custom_collection_slot: edition.edition >= 9 })),
      turf_matrix: { ...state.turf_matrix, nodes: [] },
      xeno_transmute_modifier: null,
    });
  });
  await page.waitForTimeout(80);
}

async function applyCase(page, id) {
  await resetLocal(page);
  await page.evaluate((caseId) => {
    const store = window.__useParetoStore;
    const state = store.getState();
    if (caseId === 'dattebayo_base_attack') {
      store.setState({ base_attack: 2316228 });
    }
    if (caseId === 'king') {
      store.setState({ selected_hero_id: 'king' });
    }
    if (caseId === 'taloxa_lacerated') {
      store.setState({ selected_hero_id: 'taloxa', conditional: { ...state.conditional, target_lacerated: true } });
    }
    if (caseId === 'weakened') {
      store.setState({ conditional: { ...state.conditional, target_weakened: true } });
    }
    if (caseId === 'boss_phase') {
      store.setState({ conditional: { ...state.conditional, target_is_boss: true } });
    }
    if (caseId === 'ee_mode') {
      store.setState({ mode: 'ee' });
    }
    if (caseId === 'deployed_clucker') {
      store.setState({ pets: state.pets.map((pet) => pet.id === 'clucker' ? { ...pet, slot: 'deployed' } : { ...pet, slot: null }) });
    }
    if (caseId === 'tech_twinborn') {
      store.setState({ tech_parts: state.tech_parts.map((part) => part.id === 'quantum_robot' ? { ...part, is_twinborn: true, equipped_slot: 'attack_1' } : part) });
    }
    if (caseId === 'collectible_one') {
      store.setState({ editions: state.editions.map((edition) => ({ ...edition, unlocks_custom_collection_slot: edition.edition === 10 })) });
    }
    if (caseId === 'lme_turf') {
      store.setState({ turf_matrix: { ...state.turf_matrix, nodes: [{ node_id: 'dattebayo_turf2', enabled: true }] } });
    }
  }, id);
  await page.waitForTimeout(120);
}

async function captureSio(page) {
  const response = await page.goto(sioUrl, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(5000);
  const text = await page.locator('body').innerText({ timeout: 10000 }).catch(() => '');
  const screenshotPath = path.join(outDir, 'sio-live-default.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  const resourceCount = await page.evaluate(() => performance.getEntriesByType('resource').length);
  const scriptCount = await page.locator('script').count();
  const status = response?.status() ?? 0;
  const candidates = [...text.matchAll(/(?:damage|multiplier|crit|dps)[^\n]{0,80}/gi)].slice(0, 20).map((m) => m[0]);
  return { status, textLength: text.length, resourceCount, scriptCount, screenshotPath, candidates };
}

async function run() {
  await fs.mkdir(outDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const localPage = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  await localPage.goto(localUrl, { waitUntil: 'networkidle', timeout: 30000 });
  await localPage.waitForSelector('[data-testid="v3-boot-status"]', { timeout: 10000 });
  await localPage.screenshot({ path: path.join(outDir, 'v3-local-default.png'), fullPage: true });

  const cases = [
    'default',
    'dattebayo_base_attack',
    'king',
    'taloxa_lacerated',
    'weakened',
    'boss_phase',
    'ee_mode',
    'deployed_clucker',
    'tech_twinborn',
    'collectible_one',
    'lme_turf',
  ];
  const localCases = [];
  for (const id of cases) {
    await applyCase(localPage, id);
    const local = await readLocalValue(localPage);
    const screenshotPath = path.join(outDir, `v3-local-${id}.png`);
    await localPage.screenshot({ path: screenshotPath, fullPage: true });
    localCases.push({ id, ...local, screenshotPath });
  }

  const localLatency = await localPage.evaluate(() => {
    const store = window.__useParetoStore;
    const start = performance.now();
    for (let i = 0; i < 1000; i += 1) {
      const state = store.getState();
      store.setState({ base_attack: 1000 + i });
    }
    return (performance.now() - start) / 1000;
  });

  const sioPage = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  const sio = await captureSio(sioPage);
  const sioLatency = await sioPage.evaluate(() => {
    const start = performance.now();
    for (let i = 0; i < 1000; i += 1) {
      document.body.getBoundingClientRect();
    }
    return (performance.now() - start) / 1000;
  }).catch(() => null);

  await browser.close();

  const dattebayoDefault = calibration.formula_coefficients.stage9_finalization.dattebayo_multipliers_output;
  const parityCases = localCases.slice(0, 10).map((item) => {
    const diffPct = item.value === null ? null : Math.abs(item.value - dattebayoDefault) / dattebayoDefault * 100;
    return { ...item, dattebayoDefault, diffPct };
  });
  const finiteDiffs = parityCases.map((item) => item.diffPct).filter((value) => Number.isFinite(value));
  const worstDiffPct = finiteDiffs.length > 0 ? Math.max(...finiteDiffs) : null;
  const speedAdvantageFactor = sioLatency && localLatency ? sioLatency / localLatency : null;
  const result = {
    generated_at: new Date().toISOString(),
    localUrl,
    sioUrl,
    dattebayoDefault,
    parityCases,
    worstDiffPct,
    localLatencyMsPerMutation: localLatency,
    sioLatencyMsPerBodyRead: sioLatency,
    speedAdvantageFactor,
    sio,
  };
  const outPath = path.join(outDir, 'v3_sio_parity_benchmark.json');
  await fs.writeFile(outPath, JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result, null, 2));
}

await run();
