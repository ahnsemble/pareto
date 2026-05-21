import fs from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { chromium } from 'playwright';

const outDir = path.join(process.cwd(), 'artifacts/td11');
const screenshotDir = path.join(outDir, 'sio-tech-live-screenshots');
const workerMessageDir = path.join(outDir, 'sio-tech-live-worker-messages');
const sioUrl = 'https://sio-tools.vercel.app/';
const outputPath =
  process.env.OUTPUT_PATH ?? path.join(outDir, 'sio_tech_optimizer_live_expected_2026-05-20.json');

const rarityOrder = [
  'Eternal',
  'Legend4',
  'Legend3',
  'Legend2',
  'Legend1',
  'Legend',
  'Epic3',
  'Epic2',
  'Epic1',
  'Epic',
];

const defaultSioTechProfile = {
  energyGuidanceSystem: { resonance: 3000, mode: 'droneMode', equipped: true, twinbornLevel: 0 },
  antimatterMaintainer: { resonance: 3000, mode: 'drillShotMode', equipped: true, twinbornLevel: 0 },
  quantumNanobot: { resonance: 3000, mode: 'durianMode', equipped: true, twinbornLevel: 0 },
  phaseDriver: { resonance: 0, mode: 'lightningMode', equipped: false, twinbornLevel: 0 },
  energyDiffuser: { resonance: 2100, mode: 'molotovMode', equipped: true, twinbornLevel: 0 },
  hiMaintainer: { resonance: 0, mode: 'rocketMode', equipped: false, twinbornLevel: 0 },
  precisionDevice: { resonance: 0, mode: 'droneMode', equipped: false, twinbornLevel: 0 },
  antimatterGenerator: { resonance: 0, mode: 'drillShotMode', equipped: false, twinbornLevel: 0 },
  exoRadicator: { resonance: 0, mode: 'guardianMode', equipped: false, twinbornLevel: 0 },
  hiGravityPulser: { resonance: 0, mode: 'brickMode', equipped: false, twinbornLevel: 0 },
};

const allModes = [
  'molotovMode',
  'durianMode',
  'soccerMode',
  'droneMode',
  'forcefieldMode',
  'drillShotMode',
  'rocketMode',
  'lightningMode',
  'boomerangMode',
  'guardianMode',
  'laserMode',
  'brickMode',
];

const cases = [
  {
    id: 'default_normal_legend2_epic8_chips100',
    inputs: { Legend: 2, Epic: 8 },
    chips: 100,
    skills: 4,
  },
  {
    id: 'default_normal_legend1_epic6_chips40',
    inputs: { Legend: 1, Epic: 6 },
    chips: 40,
    skills: 4,
  },
  {
    id: 'default_normal_legend3_epic12_chips180',
    inputs: { Legend: 3, Epic: 12 },
    chips: 180,
    skills: 4,
  },
];

async function openOptimizerModal(page) {
  await installWorkerRecorder(page);
  await page.goto(sioUrl, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(1000);

  const pageSpinners = await page.locator('input[role=spinbutton]').all();
  await pageSpinners[1].fill('100000');
  await pageSpinners[2].fill('100000');
  await page.waitForTimeout(300);

  const optimizeButtons = await page.getByRole('button', { name: /Optimize/ }).all();
  await optimizeButtons[1].click();
  await page.waitForTimeout(700);
}

async function installWorkerRecorder(page) {
  await page.addInitScript(() => {
    if (window.__sioWorkerRecorderInstalled) return;
    window.__sioWorkerRecorderInstalled = true;
    window.__sioWorkerMessages = [];
    let nextWorkerId = 1;
    const NativeWorker = window.Worker;
    const clone = (value) => {
      try {
        return JSON.parse(JSON.stringify(value));
      } catch (error) {
        return {
          __unserializable: true,
          message: error instanceof Error ? error.message : String(error),
          type: Object.prototype.toString.call(value),
        };
      }
    };
    window.Worker = class SioRecordedWorker extends NativeWorker {
      constructor(url, options) {
        super(url, options);
        this.__sioWorkerUrl = String(url);
        this.__sioWorkerId = nextWorkerId;
        nextWorkerId += 1;
        const originalPostMessage = this.postMessage.bind(this);
        this.postMessage = (message, transfer) => {
          window.__sioWorkerMessages.push({
            direction: 'to-worker',
            workerId: this.__sioWorkerId,
            url: this.__sioWorkerUrl,
            message: clone(message),
          });
          return originalPostMessage(message, transfer);
        };
        this.addEventListener('message', (event) => {
          window.__sioWorkerMessages.push({
            direction: 'from-worker',
            workerId: this.__sioWorkerId,
            url: this.__sioWorkerUrl,
            message: clone(event.data),
          });
        });
      }
    };
  });
}

async function fillOptimizerCase(page, fixtureCase) {
  const modalSpinners = await page.locator('.ant-modal input[role=spinbutton]').all();
  const rarityValues = rarityOrder.map((rarity) => String(fixtureCase.inputs[rarity] ?? 0));
  const values = [...rarityValues, String(fixtureCase.chips), String(fixtureCase.skills)];
  for (let index = 0; index < values.length; index += 1) {
    await modalSpinners[index].fill(values[index]);
  }
  await page.waitForTimeout(250);
}

async function runOptimizer(page, fixtureCase) {
  const started = performance.now();
  await page.getByRole('button', { name: /Calculate/ }).last().click();
  await page.waitForFunction(
    () => [...document.querySelectorAll('.ant-modal button')].some((button) => button.textContent?.trim() === 'Apply'),
    null,
    { timeout: 120000 },
  );
  await page.waitForTimeout(500);
  const latencyMs = performance.now() - started;

  const screenshotPath = path.join(screenshotDir, `${fixtureCase.id}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });

  const expected = await page.evaluate(() => {
    function parseBrowserNumberText(text) {
      const normalized = String(text ?? '').replace(/,/g, '');
      const value = Number(normalized);
      return Number.isFinite(value) ? value : null;
    }

    function parseBrowserRow(row) {
      const images = [...row.querySelectorAll('img')].map((image) => {
        const src = image.getAttribute('src') ?? '';
        const rarity = src.match(/\/([^/?/]+)\.webp/)?.[1] ?? null;
        return { alt: image.alt, rarity };
      });
      const partImage = images.find(
        (image) => image.alt && image.alt !== 'twin' && image.alt !== 'Resonance Chip' && !image.alt.endsWith('Mode'),
      );
      const modeImage = images.find((image) => image.alt?.endsWith('Mode'));
      const textLines = row.innerText
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

      return {
        part: partImage?.alt ?? null,
        rarity: partImage?.rarity ?? null,
        mode: modeImage?.alt ?? null,
        rawText: textLines,
        images,
      };
    }

    const applyButtons = [...document.querySelectorAll('.ant-modal button')].filter(
      (button) => button.textContent?.trim() === 'Apply',
    );
    return applyButtons.map((button) => {
      const card = button.parentElement?.parentElement;
      const header = card?.children[0];
      const summaryLines = (header?.innerText ?? '')
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
      const activeSkills = [...(header?.querySelectorAll('img') ?? [])]
        .map((image) => image.alt)
        .filter((alt) => alt && alt !== 'Resonance Chip');
      const rowsContainer = card?.querySelector('.ant-card-body > div');
      const rows = rowsContainer ? [...rowsContainer.children].map(parseBrowserRow) : [];

      return {
        multiplierText: summaryLines[0] ?? '',
        multiplier: parseBrowserNumberText(summaryLines[0]),
        chipRemainder: parseBrowserNumberText(summaryLines[1]),
        activeSkills,
        rows,
      };
    });
  });
  const workerMessages = await page.evaluate(() => window.__sioWorkerMessages ?? []);
  const workerMessagesPath = path.join(workerMessageDir, `${fixtureCase.id}.json`);
  await fs.writeFile(workerMessagesPath, `${JSON.stringify(workerMessages, null, 2)}\n`);

  return {
    ...fixtureCase,
    optimizer: {
      strategy: 'optimize',
      speedMode: 'normal',
      fodder: 'excess',
      overloadable: false,
      limit: 'basic',
      modes: allModes,
      skillsMap: { Rocket: 'disabled', 'Guardian Mode': 'disabled' },
    },
    expected,
    latencyMs,
    screenshotPath,
    workerMessagesPath,
    workerMessagesCount: workerMessages.length,
  };
}

async function captureCase(browser, fixtureCase) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  try {
    await openOptimizerModal(page);
    await fillOptimizerCase(page, fixtureCase);
    return await runOptimizer(page, fixtureCase);
  } finally {
    await page.close();
  }
}

await fs.mkdir(screenshotDir, { recursive: true });
await fs.mkdir(workerMessageDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const captured = [];
try {
  for (const fixtureCase of cases) {
    captured.push(await captureCase(browser, fixtureCase));
  }
} finally {
  await browser.close();
}

const payload = {
  generatedAt: new Date().toISOString(),
  sioUrl,
  source: 'live sio-tools UI capture',
  rarityOrder,
  playerState: {
    damage: { base_attack: 100000, skill_damage_percent: 0 },
    mode: 'damage',
    selected_hero: { id: 'common' },
    conditional_state: {},
    xeno_transmute_modifier: null,
    ss_equipment: [],
    tech_configs: defaultSioTechProfile,
  },
  cases: captured,
};

await fs.writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
console.log(JSON.stringify({ outputPath, cases: captured.length }, null, 2));
