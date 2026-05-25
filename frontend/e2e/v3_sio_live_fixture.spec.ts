import { expect, test } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  PLAYER_INPUT_CATEGORIES,
  PLAYER_INPUT_FIELD_SPECS,
  REFERENCE_LIVE_FIXTURE_CASES,
} from '../app/lib/pareto-store/playerState';

const V3_URL = '/en/v3';
const SIO_URL = 'https://sio-tools.vercel.app/';
const artifactDir = path.join(process.cwd(), 'artifacts/v3-sio-parity');
const screenshotDir = path.join(artifactDir, 'screenshots');

interface FixtureResult {
  id: string;
  label: string;
  local_screenshot_path: string;
  sio_screenshot_path: string;
  local_value_text: string;
  sio_status: number;
  sio_body_text_length: number;
  sio_input_count: number;
  covered_category_count: number;
  covered_field_count: number;
}

interface StoreBridge {
  getState(): Record<string, unknown>;
  setState(next: Record<string, unknown>): void;
}

const fixtureResults: FixtureResult[] = [];

async function openV3(page: import('@playwright/test').Page, baseURL: string | undefined) {
  await page.goto(`${baseURL ?? 'http://localhost:3032'}${V3_URL}`);
  await page.waitForSelector('[data-testid="v3-boot-status"]');
  await expect(page.locator('[data-testid="v3-profile-coverage-panel"]')).toBeVisible();
}

async function applyFixtureCase(page: import('@playwright/test').Page, id: string) {
  await page.evaluate((caseId) => {
    const bridge = (window as unknown as { __useParetoStore?: StoreBridge }).__useParetoStore;
    if (!bridge) throw new Error('Pareto store bridge unavailable');

    const current = bridge.getState();
    const conditional = current.conditional as Record<string, unknown>;
    const techParts = current.tech_parts as Array<Record<string, unknown>>;
    const pets = current.pets as Array<Record<string, unknown>>;
    const equipment = current.ss_equipment as Array<Record<string, unknown>>;
    const sets = current.editions as Array<Record<string, unknown>>;

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
      editions: sets.map((set) => ({
        ...set,
        gold_stars: 0,
        red_stars: 0,
      })),
    });

    const refreshed = bridge.getState();
    const refreshedConditional = refreshed.conditional as Record<string, unknown>;
    const refreshedTech = refreshed.tech_parts as Array<Record<string, unknown>>;
    const refreshedPets = refreshed.pets as Array<Record<string, unknown>>;
    const refreshedEquipment = refreshed.ss_equipment as Array<Record<string, unknown>>;
    const refreshedSets = refreshed.editions as Array<Record<string, unknown>>;

    if (caseId === 'king') bridge.setState({ selected_hero_id: 'king' });
    if (caseId === 'taloxa') bridge.setState({ selected_hero_id: 'taloxa', conditional: { ...refreshedConditional, target_lacerated: true } });
    if (caseId === 'weakened') bridge.setState({ conditional: { ...refreshedConditional, target_weakened: true } });
    if (caseId === 'boss') bridge.setState({ conditional: { ...refreshedConditional, target_is_boss: true } });
    if (caseId === 'ee') bridge.setState({ mode: 'ee' });
    if (caseId === 'clucker') bridge.setState({ pets: refreshedPets.map((pet) => pet.id === 'crucker' ? { ...pet, slot: 'deployed', resonance_atk: 5000 } : { ...pet, slot: null }) });
    if (caseId === 'tech_twinborn') {
      bridge.setState({
        tech_parts: refreshedTech.map((part) =>
          part.id === 'energyGuidanceSystem'
            ? { ...part, is_twinborn: true, equipped_slot: 'attack_1', resonance_chip_allocated: 20 }
            : part
        ),
      });
    }
    if (caseId === 'collectible') {
      bridge.setState({ editions: refreshedSets.map((set) => ({ ...set, gold_stars: 10, red_stars: 10 })) });
    }
    if (caseId === 'equipment_max') {
      bridge.setState({
        base_attack: 2316228,
        ss_equipment: refreshedEquipment.map((item) => ({
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

test.describe.configure({ mode: 'serial' });

test.beforeAll(async () => {
  await fs.mkdir(screenshotDir, { recursive: true });
});

test.afterAll(async () => {
  await fs.writeFile(
    path.join(artifactDir, 'fixture_cases.json'),
    JSON.stringify({
      generated_at: new Date().toISOString(),
      sio_url: SIO_URL,
      local_url: V3_URL,
      covered_category_count: PLAYER_INPUT_CATEGORIES.length,
      covered_field_count: PLAYER_INPUT_FIELD_SPECS.length,
      cases: fixtureResults,
    }, null, 2) + '\n',
  );
});

test('sIO input coverage panel exposes 9 categories and at least 50 fields', async ({ page, baseURL }) => {
  await openV3(page, baseURL);
  await expect(page.locator('[data-testid="v3-profile-category"]')).toHaveCount(9);
  await expect(page.locator('[data-testid="v3-profile-field-count"]')).toContainText(String(PLAYER_INPUT_FIELD_SPECS.length));
  expect(PLAYER_INPUT_FIELD_SPECS.length).toBeGreaterThanOrEqual(50);
});

for (const fixtureCase of REFERENCE_LIVE_FIXTURE_CASES) {
  test(`captures sIO live fixture: ${fixtureCase.id}`, async ({ page, context, baseURL }) => {
    await openV3(page, baseURL);
    await applyFixtureCase(page, fixtureCase.id);

    const localValueText = ((await page.locator('[data-testid="v3-final-damage-value"]').textContent()) ?? '').trim();
    const localScreenshotPath = path.join(screenshotDir, `v3-local-${fixtureCase.id}.png`);
    await page.screenshot({ path: localScreenshotPath, fullPage: true });

    const sioPage = await context.newPage();
    await sioPage.setViewportSize({ width: 1440, height: 1100 });
    const response = await sioPage.goto(SIO_URL, { waitUntil: 'networkidle', timeout: 60000 });
    await sioPage.waitForTimeout(1500);
    const sioScreenshotPath = path.join(screenshotDir, `sio-live-${fixtureCase.id}.png`);
    await sioPage.screenshot({ path: sioScreenshotPath, fullPage: true });
    const sioBodyText = await sioPage.locator('body').innerText({ timeout: 10000 });
    const sioInputCount = await sioPage.locator('input, select, textarea, [role="spinbutton"], [role="checkbox"], [role="combobox"]').count();
    await sioPage.close();

    fixtureResults.push({
      id: fixtureCase.id,
      label: fixtureCase.label,
      local_screenshot_path: localScreenshotPath,
      sio_screenshot_path: sioScreenshotPath,
      local_value_text: localValueText,
      sio_status: response?.status() ?? 0,
      sio_body_text_length: sioBodyText.length,
      sio_input_count: sioInputCount,
      covered_category_count: PLAYER_INPUT_CATEGORIES.length,
      covered_field_count: PLAYER_INPUT_FIELD_SPECS.length,
    });

    expect(localValueText.length).toBeGreaterThan(0);
    expect(response?.ok()).toBe(true);
    expect(sioBodyText.length).toBeGreaterThan(100);
  });
}
