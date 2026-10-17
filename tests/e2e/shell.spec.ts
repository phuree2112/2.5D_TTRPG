import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { camera, expectAzimuth, openTable, twoFingerGesture } from './helpers';

const Q = Math.PI / 4;

test.describe('desktop tool rail', () => {
  test.skip(({ isMobile }) => isMobile, 'desktop layout');

  test('opens a tool flyout with its shortcut and closes it with Esc', async ({ page }) => {
    await openTable(page);
    await page.keyboard.press('3');
    const flyout = page.getByRole('dialog', { name: 'Props' });
    await expect(flyout).toBeVisible();
    await expect(flyout).toContainText('arrives in Phase 5');

    await page.keyboard.press('Escape');
    await expect(flyout).toBeHidden();
    await expect(
      page.getByRole('toolbar', { name: 'Tools' }).getByRole('button', { name: 'Props' }),
    ).toBeFocused();
  });

  test('moves to the left edge from Settings and remembers it', async ({ page }) => {
    await openTable(page);
    const rail = page.getByRole('toolbar', { name: 'Tools' });
    expect((await rail.boundingBox())!.x).toBeGreaterThan(1000);

    await page.keyboard.press(',');
    await page.getByRole('dialog', { name: 'Settings' }).getByText('Left', { exact: true }).click();
    await expect.poll(async () => (await rail.boundingBox())!.x).toBeLessThan(100);

    await page.reload();
    await page.waitForFunction(() => window.__DIORAMA_DIAGNOSTICS__?.ready === true);
    expect((await rail.boundingBox())!.x).toBeLessThan(100);
  });

  test('shows Build tools to the GM and hides them in the player preview', async ({ page }) => {
    await openTable(page);
    const rail = page.getByRole('toolbar', { name: 'Tools' });
    await rail.getByRole('button', { name: 'Build' }).click();
    await expect(rail.getByRole('button', { name: 'Terrain' })).toBeVisible();

    await page.keyboard.press(',');
    await page.getByRole('switch', { name: 'Preview as a player' }).check();
    await expect(rail.getByRole('button', { name: 'Build' })).toHaveCount(0);
  });

  test('finds and opens a tool from the command palette', async ({ page }) => {
    await openTable(page);
    await page.keyboard.press('Control+k');
    const palette = page.getByRole('dialog', { name: 'Search tools' });
    await expect(palette).toBeVisible();
    await page.keyboard.type('lig');
    await expect(palette.getByRole('option').first()).toContainText('Lights');
    await page.keyboard.press('Enter');
    await expect(palette).toBeHidden();
    await expect(page.getByRole('dialog', { name: 'Lights' })).toBeVisible();
  });

  test('lists shortcuts in the help sheet, and single-key shortcuts can be turned off', async ({
    page,
  }) => {
    await openTable(page);
    await page.keyboard.press('?');
    await expect(page.getByRole('dialog', { name: 'Keyboard shortcuts' })).toContainText(
      'Floors & stairs',
    );
    await page.keyboard.press('Escape');

    await page.keyboard.press(',');
    await page.getByRole('switch', { name: 'Single-key shortcuts' }).uncheck();
    await page.keyboard.press('Escape');
    await page.keyboard.press('v');
    await expect(page.getByRole('dialog', { name: 'Select' })).toHaveCount(0);
  });

  test('passes an axe accessibility scan with a flyout open', async ({ page }) => {
    await openTable(page);
    await page.keyboard.press('Shift+C');
    await expect(page.getByRole('dialog', { name: 'Camera' })).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });
});

test.describe('camera', () => {
  test('Q and E rotate in 45° steps', async ({ page, isMobile }) => {
    test.skip(isMobile, 'keyboard');
    await openTable(page);
    await expectAzimuth(page, Q);
    await page.keyboard.press('e');
    await expectAzimuth(page, 2 * Q);
    await page.keyboard.press('q');
    await page.keyboard.press('q');
    await expectAzimuth(page, 0);
  });

  test('switches to the top-down view and back', async ({ page }) => {
    await openTable(page);
    const bar = page.getByRole('group', { name: 'Camera' });
    await bar.getByRole('button', { name: 'Top-down view' }).click();
    await expect.poll(async () => (await camera(page)).mode).toBe('topdown');
    await expect.poll(async () => (await camera(page)).polar).toBeLessThan(0.01);

    await bar.getByRole('button', { name: 'Top-down view' }).click();
    await expect.poll(async () => (await camera(page)).mode).toBe('orbit');
    await expect.poll(async () => (await camera(page)).polar).toBeGreaterThan(0.4);
  });

  test('keeps the camera inside the tilt range set in Settings', async ({ page, isMobile }) => {
    test.skip(isMobile, 'opens Settings with its shortcut');
    await openTable(page);
    await expect.poll(async () => (await camera(page)).polar).toBeCloseTo((55 * Math.PI) / 180, 2);
    await page.keyboard.press(',');
    await page.getByRole('slider', { name: 'Lowest' }).fill('50');
    await expect
      .poll(async () => (await camera(page)).polar)
      .toBeLessThanOrEqual((50 * Math.PI) / 180 + 1e-3);
  });

  test('rotates with a two-finger twist and zooms with a pinch', async ({ page }) => {
    await openTable(page);
    const box = (await page.locator('canvas').boundingBox())!;
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;

    const before = await camera(page);
    await twoFingerGesture(
      page,
      [
        [cx - 80, cy],
        [cx + 80, cy],
      ],
      [
        [cx - 70, cy - 40],
        [cx + 70, cy + 40],
      ],
    );
    await expect.poll(async () => (await camera(page)).azimuth).not.toBeCloseTo(before.azimuth, 2);

    const beforePinch = await camera(page);
    await twoFingerGesture(
      page,
      [
        [cx - 40, cy],
        [cx + 40, cy],
      ],
      [
        [cx - 120, cy],
        [cx + 120, cy],
      ],
    );
    await expect
      .poll(async () => (await camera(page)).distance)
      .toBeLessThan(beforePinch.distance - 1);
  });
});

test.describe('phone layout', () => {
  test.skip(({ isMobile }) => !isMobile, 'phone layout');

  test('opens tools from the All tools sheet, one panel at a time', async ({ page }) => {
    await openTable(page);
    await page.getByRole('button', { name: 'All tools' }).click();
    const sheet = page.getByRole('dialog', { name: 'All tools' });
    await expect(sheet).toBeVisible();

    await sheet.getByRole('searchbox').fill('qual');
    await sheet.getByRole('button', { name: 'Quality' }).click();
    await expect(page.getByRole('dialog', { name: 'Quality' })).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(1);
  });

  test('uses 44 px or larger touch targets on the rail and camera bar', async ({ page }) => {
    await openTable(page);
    const buttons = page.locator('[role=toolbar] button, [role=group][aria-label=Camera] button');
    for (const button of await buttons.all()) {
      const box = (await button.boundingBox())!;
      expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(44);
    }
  });

  test('collapses the rail to a handle and brings it back', async ({ page }) => {
    await openTable(page);
    await page.getByRole('button', { name: 'Hide tool rail' }).click();
    await expect(page.getByRole('toolbar', { name: 'Tools' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Show tool rail' }).click();
    await expect(page.getByRole('toolbar', { name: 'Tools' })).toBeVisible();
  });

  test('passes an axe accessibility scan with a sheet open', async ({ page }) => {
    await openTable(page);
    await page.getByRole('button', { name: 'All tools' }).click();
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });
});

test('shows renderer counters with ?debug=1', async ({ page }) => {
  await openTable(page, '?debug=1');
  await expect(page.getByLabel('Debug information')).toContainText('Draw calls');
});
