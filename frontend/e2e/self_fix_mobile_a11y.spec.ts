import { expect, type Locator, test } from '@playwright/test';

async function expectTouchTargetAtLeast44(locator: Locator) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width, `${await locator.evaluate((el: Element) => el.outerHTML)} width`).toBeGreaterThanOrEqual(44);
  expect(box!.height, `${await locator.evaluate((el: Element) => el.outerHTML)} height`).toBeGreaterThanOrEqual(44);
}

async function collectVisibleTextCutoffHits(locator: Locator) {
  return locator.evaluateAll((elements: Element[]) => {
    const hits: Array<{
      text: string;
      textRect: { left: number; right: number; top: number; bottom: number };
      contentRect: { left: number; right: number; top: number; bottom: number };
    }> = [];
    const tolerance = 1;
    const px = (value: string) => Number.parseFloat(value) || 0;
    const collectTextNodes = (root: Node) => {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const nodes: Text[] = [];
      let current = walker.nextNode();
      while (current) {
        if (current.textContent?.trim()) nodes.push(current as Text);
        current = walker.nextNode();
      }
      return nodes;
    };

    for (const element of elements) {
      const htmlElement = element as HTMLElement;
      const textNodes = collectTextNodes(htmlElement);
      if (!textNodes.length) continue;

      const range = document.createRange();
      range.setStartBefore(textNodes[0]);
      range.setEndAfter(textNodes[textNodes.length - 1]);
      const textRect = range.getBoundingClientRect();
      range.detach();

      const elementRect = htmlElement.getBoundingClientRect();
      const style = window.getComputedStyle(htmlElement);
      const contentRect = {
        left: elementRect.left + px(style.paddingLeft),
        right: elementRect.right - px(style.paddingRight),
        top: elementRect.top + px(style.paddingTop),
        bottom: elementRect.bottom - px(style.paddingBottom),
      };

      if (
        textRect.left < contentRect.left - tolerance ||
        textRect.right > contentRect.right + tolerance ||
        textRect.top < contentRect.top - tolerance ||
        textRect.bottom > contentRect.bottom + tolerance
      ) {
        hits.push({
          text: htmlElement.textContent?.trim() ?? '',
          textRect: {
            left: textRect.left,
            right: textRect.right,
            top: textRect.top,
            bottom: textRect.bottom,
          },
          contentRect,
        });
      }
    }

    return hits;
  });
}

test.describe('Self-fix mobile accessibility guards', () => {
  test('mobile optimize controls expose visible names and 44px touch targets', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-mobile-375', 'mobile-only guard');

    await page.goto('/en/optimize', { waitUntil: 'domcontentloaded' });

    const firstCollectible = page
      .getByTestId('collectible-list')
      .locator('button')
      .first();
    await expect(firstCollectible).toBeVisible();
    await expect(firstCollectible).toHaveAccessibleName(/01\s+Strike-01/);

    const requiredTargets = [
      page.locator('header a').first(),
      page.locator('#hero-select'),
      page.getByTestId('collectible-view-toggle'),
      page.getByRole('button', { name: 'all' }),
      page.getByRole('button', { name: 'clear' }),
      page.getByTestId('equipment-weapon'),
      page.getByTestId('equipment-ring'),
      page.getByTestId('equipment-necklace'),
      page.locator('#pet-select'),
    ];

    for (const target of requiredTargets) {
      await expectTouchTargetAtLeast44(target);
    }
  });

  test('iPad numeric grid cutoff detector ignores pseudo-element hit areas', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop', 'run iPad viewport once');

    await page.setViewportSize({ width: 820, height: 1180 });
    await page.goto('/en/optimize', { waitUntil: 'domcontentloaded' });

    const gridButtons = page.getByTestId('collectible-grid').locator('button');
    await expect(gridButtons).toHaveCount(64);

    const cutoffHits = await collectVisibleTextCutoffHits(gridButtons);
    expect(cutoffHits).toEqual([]);
  });
});
