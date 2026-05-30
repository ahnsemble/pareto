import { defineConfig, devices } from '@playwright/test';

const port = process.env.PLAYWRIGHT_PORT ?? '3032';
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${port}`;
const healthURL = `${baseURL}/en/v3`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium-desktop',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'chromium-mobile-375',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 375, height: 667 },
      },
    },
  ],
  webServer: process.env.PLAYWRIGHT_SKIP_WEBSERVER === '1'
    ? undefined
    : {
        command: `npm run dev -- --port ${port}`,
        url: healthURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
