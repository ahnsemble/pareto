import { expect, test } from '@playwright/test';
import { firstBuildSignature, runRepresentativeOptimize } from './helpers/user-flow';

test.describe('User flow — browser compatibility simulations', () => {
  test('Safari Lockdown simulation — clipboard denial falls back to visible share URL', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: undefined,
      });
    });

    await runRepresentativeOptimize(page, { collectibleCount: 6 });
    await page.getByTestId('share-url-button').click();

    await expect(page.getByTestId('share-url-output')).toHaveValue(/\/en\/optimize\?/);
    await expect(page.getByTestId('share-url-status')).toHaveText('Copy the URL manually.');
  });

  test('Firefox strict simulation — blocked storage APIs do not break optimize', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        configurable: true,
        get() {
          throw new DOMException('localStorage blocked', 'SecurityError');
        },
      });
      Object.defineProperty(window, 'sessionStorage', {
        configurable: true,
        get() {
          throw new DOMException('sessionStorage blocked', 'SecurityError');
        },
      });
    });

    await runRepresentativeOptimize(page, { collectibleCount: 5 });
    const signature = await firstBuildSignature(page);
    expect(signature).toContain('#1');
  });

  test('Chrome incognito simulation — fresh context completes without persisted state', async ({
    page,
  }) => {
    const externalRequests: string[] = [];
    page.on('request', (request) => {
      const url = request.url();
      if (!url.startsWith('http://localhost:3032')) externalRequests.push(url);
    });

    await runRepresentativeOptimize(page, { collectibleCount: 4 });
    await page.getByTestId('share-url-button').click();

    const storageLength = await page.evaluate(() => localStorage.length + sessionStorage.length);
    expect(storageLength).toBe(0);
    expect(externalRequests).toEqual([]);
  });
});
