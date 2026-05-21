import fs from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { chromium } from 'playwright';

const defaultHost = 'https://sio-tools.vercel.app';
const providedUrl = process.env.SIO_URL ?? null;
const providedCode = process.env.SIO_CODE ?? null;
const url = new URL(providedUrl ?? `${defaultHost}?code=${providedCode ?? ''}`);
const code = providedCode ?? url.searchParams.get('code') ?? 'unknown';
const safeCode = code.replace(/[^A-Za-z0-9_-]/g, '_');
const fixtureDir =
  process.env.OUTPUT_DIR ?? path.join(process.cwd(), 'artifacts/td11', `shared_${safeCode}`);
const screenshotDir = path.join(fixtureDir, 'optimizer-screenshots');
const workerMessageDir = path.join(fixtureDir, 'worker-messages');
const capturePath = process.env.OUTPUT_PATH ?? path.join(fixtureDir, 'optimizer_current_config_capture.json');
const localStoragePath =
  process.env.LOCAL_STORAGE_PATH ?? path.join(fixtureDir, 'local_storage_snapshot.json');

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
      constructor(workerUrl, options) {
        super(workerUrl, options);
        this.__sioWorkerUrl = String(workerUrl);
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

async function snapshotLocalStorage(page) {
  return page.evaluate(() => {
    const localStorageEntries = {};
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key) {
        localStorageEntries[key] = localStorage.getItem(key);
      }
    }
    return {
      href: window.location.href,
      title: document.title,
      bodyPreview: document.body.innerText.slice(0, 6000),
      localStorageEntries,
      localStorageKeys: Object.keys(localStorageEntries).sort(),
      generatedAt: new Date().toISOString(),
    };
  });
}

async function openOptimizerModal(page) {
  await installWorkerRecorder(page);
  await page.goto(url.toString(), { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(2000);
  await page
    .waitForFunction(
      (expectedCode) => {
        const text = document.body?.innerText ?? '';
        return text.includes('Current profile') && (!expectedCode || text.includes(expectedCode));
      },
      code,
      { timeout: 60000 },
    )
    .catch(() => undefined);

  const optimizeButtons = await page.getByRole('button', { name: /Optimize/ }).all();
  if (optimizeButtons.length === 0) {
    throw new Error('No Optimize buttons found after shared profile load');
  }
  const button = optimizeButtons[Math.min(1, optimizeButtons.length - 1)];
  await button.click();
  await page.waitForSelector('.ant-modal', { timeout: 30000 });
  await page.waitForTimeout(700);
  return optimizeButtons.length;
}

function parseExpectedRows() {
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
}

async function runCurrentConfig(page) {
  const modalTextBefore = await page.locator('.ant-modal').innerText({ timeout: 30000 });
  const beforeInputs = await page.locator('.ant-modal input[role=spinbutton]').evaluateAll((inputs) =>
    inputs.map((input) => ({
      value: input.value,
      placeholder: input.getAttribute('placeholder'),
      ariaLabel: input.getAttribute('aria-label'),
    })),
  );
  const started = performance.now();
  await page.getByRole('button', { name: /Calculate/ }).last().click();
  await page.waitForFunction(
    () => [...document.querySelectorAll('.ant-modal button')].some((button) => button.textContent?.trim() === 'Apply'),
    null,
    { timeout: 240000 },
  );
  await page.waitForTimeout(700);
  const latencyMs = performance.now() - started;

  const screenshotPath = path.join(screenshotDir, 'current_config.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  const expected = await page.evaluate(parseExpectedRows);
  const workerMessages = await page.evaluate(() => window.__sioWorkerMessages ?? []);
  const workerMessagesPath = path.join(workerMessageDir, 'current_config.json');
  await fs.writeFile(workerMessagesPath, `${JSON.stringify(workerMessages, null, 2)}\n`);

  return {
    id: `${safeCode}_current_config`,
    inputs: null,
    chips: null,
    skills: null,
    optimizer: null,
    expected,
    latencyMs,
    screenshotPath,
    workerMessagesPath,
    workerMessagesCount: workerMessages.length,
    modalTextBefore,
    beforeInputs,
  };
}

await fs.mkdir(screenshotDir, { recursive: true });
await fs.mkdir(workerMessageDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
let payload;
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  try {
    const optimizeButtonCount = await openOptimizerModal(page);
    const localStorageSnapshot = await snapshotLocalStorage(page);
    await fs.writeFile(localStoragePath, `${JSON.stringify(localStorageSnapshot, null, 2)}\n`);
    const capturedCase = await runCurrentConfig(page);
    const afterStorage = await snapshotLocalStorage(page);
    payload = {
      generatedAt: new Date().toISOString(),
      source: 'shared sio-tools UI capture',
      sioUrl: url.toString(),
      code,
      profilePreview: afterStorage.bodyPreview,
      optimizeButtonCount,
      modalTextBefore: capturedCase.modalTextBefore,
      beforeInputs: capturedCase.beforeInputs,
      cases: [
        {
          ...capturedCase,
          modalTextBefore: undefined,
          beforeInputs: undefined,
        },
      ],
      localStorageKeys: afterStorage.localStorageKeys,
      localStorageEntries: afterStorage.localStorageEntries,
    };
  } finally {
    await page.close();
  }
} finally {
  await browser.close();
}

await fs.writeFile(capturePath, `${JSON.stringify(payload, null, 2)}\n`);
console.log(
  JSON.stringify(
    {
      code,
      fixtureDir,
      capturePath,
      localStoragePath,
      cases: payload.cases.length,
      workerMessagesCount: payload.cases[0]?.workerMessagesCount ?? 0,
      expectedResults: payload.cases[0]?.expected?.length ?? 0,
    },
    null,
    2,
  ),
);
