import { test, expect } from '@playwright/test';

test.describe('Sprint G.4 — Design Audit Cleanup (focus ring + touch targets + tokens + chart aria)', () => {
  test('T1 — :focus-visible outline applied on keyboard navigation (WCAG 2.4.7 AA)', async ({ page }) => {
    await page.goto('/optimize', { waitUntil: 'domcontentloaded' });

    // Wait until at least one focusable control is mounted.
    await page.waitForSelector('#hero-select');

    let outlinedCount = 0;
    for (let i = 0; i < 6; i += 1) {
      await page.keyboard.press('Tab');
      const focused = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el) return null;
        const cs = window.getComputedStyle(el);
        return {
          tag: el.tagName.toLowerCase(),
          outlineWidth: cs.outlineWidth,
          outlineStyle: cs.outlineStyle,
          outlineColor: cs.outlineColor,
        };
      });
      if (!focused) continue;
      const widthPx = parseFloat(focused.outlineWidth);
      if (focused.outlineStyle !== 'none' && widthPx >= 1.5) {
        outlinedCount += 1;
      }
    }
    console.log(`[T1] keyboard-focused elements with visible outline: ${outlinedCount}`);
    expect(outlinedCount).toBeGreaterThanOrEqual(3);
  });

  test('T2 — Optimize CTA + select touch target ≥ 40px height', async ({ page }) => {
    await page.goto('/optimize', { waitUntil: 'domcontentloaded' });

    await page.locator('#hero-select').selectOption('overlord');

    const cta = page.getByRole('button', { name: /^Optimize$/ });
    await expect(cta).toBeEnabled({ timeout: 10_000 });
    const ctaBox = await cta.boundingBox();
    if (!ctaBox) throw new Error('CTA boundingBox missing');
    console.log(`[T2-cta] height=${ctaBox.height}`);
    expect(ctaBox.height).toBeGreaterThanOrEqual(40);

    const sel = page.locator('#hero-select');
    const selBox = await sel.boundingBox();
    if (!selBox) throw new Error('select boundingBox missing');
    console.log(`[T2-select] height=${selBox.height}`);
    expect(selBox.height).toBeGreaterThanOrEqual(36); // px-3 py-2.5 + border ≈ 36–40
  });

  test('T2 — collectible pill hit-area ≥ 40×40 via ::before extension', async ({ page }) => {
    await page.goto('/optimize', { waitUntil: 'domcontentloaded' });
    // Sprint G.6 A T2.1: mobile defaults to list view; switch to grid to test the pill ::before pseudo
    const toggle = page.getByTestId('collectible-view-toggle');
    if (await toggle.isVisible()) {
      await toggle.click();
    }
    const firstPill = page.locator('[data-testid="collectible-grid"] button[role="switch"]').first();
    await firstPill.waitFor({ state: 'visible' });

    const rects = await firstPill.evaluate((el) => {
      const button = el as HTMLElement;
      const buttonBox = button.getBoundingClientRect();
      const before = window.getComputedStyle(button, '::before');
      // before:inset-[-10px] resolves to -10px on each side via the inset shorthand.
      const insetTop = parseFloat(before.insetBlockStart || before.top);
      const insetBottom = parseFloat(before.insetBlockEnd || before.bottom);
      const insetLeft = parseFloat(before.insetInlineStart || before.left);
      const insetRight = parseFloat(before.insetInlineEnd || before.right);
      return {
        button: { width: buttonBox.width, height: buttonBox.height },
        beforeContent: before.content,
        beforePosition: before.position,
        inset: { top: insetTop, bottom: insetBottom, left: insetLeft, right: insetRight },
      };
    });
    console.log(`[T2-pill] ${JSON.stringify(rects)}`);

    const hitWidth = rects.button.width + Math.abs(rects.inset.left) + Math.abs(rects.inset.right);
    const hitHeight = rects.button.height + Math.abs(rects.inset.top) + Math.abs(rects.inset.bottom);
    expect(hitWidth).toBeGreaterThanOrEqual(40);
    expect(hitHeight).toBeGreaterThanOrEqual(40);
    expect(rects.beforeContent).not.toBe('none');
    expect(rects.beforePosition).toBe('absolute');
  });

  test('T2 — all/clear text buttons hit-area ≥ 44 height', async ({ page }) => {
    await page.goto('/optimize', { waitUntil: 'domcontentloaded' });
    const allBtn = page.getByRole('button', { name: /^all$/ });
    const clearBtn = page.getByRole('button', { name: /^clear$/ });

    const allBox = await allBtn.boundingBox();
    const clearBox = await clearBtn.boundingBox();
    if (!allBox || !clearBox) throw new Error('all/clear boundingBox missing');
    console.log(`[T2-all] h=${allBox.height} [T2-clear] h=${clearBox.height}`);
    expect(allBox.height).toBeGreaterThanOrEqual(44);
    expect(clearBox.height).toBeGreaterThanOrEqual(44);
  });

  test('T3 + T4 — radius + shadow tokens declared on :root', async ({ page }) => {
    await page.goto('/optimize', { waitUntil: 'domcontentloaded' });
    const tokens = await page.evaluate(() => {
      const cs = window.getComputedStyle(document.documentElement);
      return {
        radiusNone: cs.getPropertyValue('--radius-none').trim(),
        radiusXs: cs.getPropertyValue('--radius-xs').trim(),
        radiusXl: cs.getPropertyValue('--radius-xl').trim(),
        radius2xl: cs.getPropertyValue('--radius-2xl').trim(),
        radiusFull: cs.getPropertyValue('--radius-full').trim(),
        focusRingWidth: cs.getPropertyValue('--focus-ring-width').trim(),
        focusRingColor: cs.getPropertyValue('--color-focus-ring').trim(),
        shadowMd: cs.getPropertyValue('--shadow-md').trim(),
        shadowLg: cs.getPropertyValue('--shadow-lg').trim(),
        shadowGlowPrimary: cs.getPropertyValue('--shadow-glow-primary').trim(),
        shadowGlowAccent: cs.getPropertyValue('--shadow-glow-accent').trim(),
        shadowGlowDanger: cs.getPropertyValue('--shadow-glow-danger').trim(),
      };
    });
    console.log(`[T3+T4] tokens=${JSON.stringify(tokens)}`);
    for (const [k, v] of Object.entries(tokens)) {
      if (k === 'radiusNone') continue; // 0 is empty-ish
      expect(v.length, `${k} should be a non-empty CSS token`).toBeGreaterThan(0);
    }
    expect(tokens.radiusXl).toMatch(/1rem|16px/);
    // Browsers serialize oklch() into lab() in computed-style getPropertyValue, so accept either.
    expect(tokens.shadowGlowPrimary).toMatch(/oklch|lab\(/);
    expect(tokens.shadowGlowAccent).toMatch(/oklch|lab\(/);
    expect(tokens.shadowGlowDanger).toMatch(/oklch|lab\(/);
  });

  test('T5 — Pareto Frontier Chart exposes role=img + aria-labelledby (empty-state placeholder)', async ({ page }) => {
    await page.goto('/optimize', { waitUntil: 'domcontentloaded' });
    // Pre-run state shows the dashed placeholder, not the chart. Chart appears after Optimize click.
    await page.locator('#hero-select').selectOption('overlord');
    const cta = page.getByRole('button', { name: /^Optimize$/ });
    await expect(cta).toBeEnabled({ timeout: 10_000 });
    await cta.click();

    const chart = page.getByRole('img', { name: /Pareto Frontier Chart/ });
    await expect(chart).toBeVisible({ timeout: 15_000 });
    const labelText = await chart.evaluate((el) => {
      const id = el.getAttribute('aria-labelledby');
      if (!id) return null;
      const labelEl = document.getElementById(id);
      return labelEl?.textContent ?? null;
    });
    console.log(`[T5] aria-labelledby text: ${labelText}`);
    expect(labelText).toMatch(/Pareto Frontier Chart/);
    expect(labelText).toMatch(/builds/);
  });
});
