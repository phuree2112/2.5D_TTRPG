import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { openTable } from './helpers';

const atmosphere = (page: Page) => page.evaluate(() => window.__DIORAMA_DIAGNOSTICS__!.atmosphere!);
const ticks = (page: Page) =>
  page.evaluate(() => window.__DIORAMA_DIAGNOSTICS__!.ambientTicks ?? 0);

async function openEnvironment(page: Page) {
  await page.keyboard.press('Shift+E');
  const panel = page.getByRole('dialog', { name: 'Environment' });
  await expect(panel).toBeVisible();
  return panel;
}

/** Start with a fixed quality preset instead of Auto. */
async function openWithQuality(page: Page, quality: 'low' | 'medium' | 'high') {
  await page.addInitScript((q) => {
    localStorage.setItem(
      'dioramatable:settings',
      JSON.stringify({ state: { qualityMode: q }, version: 1 }),
    );
  }, quality);
  await openTable(page);
}

test.describe('lighting budget per preset (Prompt §5, Visual.md §4.3)', () => {
  // The demo table has 7 lights: a campfire, 4 torches, a lantern and a magic light.
  const cases = [
    { quality: 'low', real: 2, postfx: false },
    { quality: 'medium', real: 4, postfx: true },
    { quality: 'high', real: 7, postfx: true },
  ] as const;

  for (const { quality, real, postfx } of cases) {
    test(`${quality}: ${real} real lights, post-processing ${postfx ? 'on' : 'off'}`, async ({
      page,
    }) => {
      await openWithQuality(page, quality);
      await expect
        .poll(() => page.evaluate(() => window.__DIORAMA_DIAGNOSTICS__!.lights))
        .toEqual({ real, fake: 7 - real });
      await expect
        .poll(() => page.evaluate(() => window.__DIORAMA_DIAGNOSTICS__!.postfx ?? false))
        .toBe(postfx);
    });
  }
});

test.describe('environment panel', () => {
  test.skip(({ isMobile }) => isMobile, 'keyboard shortcuts');

  test('time of day drives the mood, and a fixed mood overrides it', async ({ page }) => {
    await openTable(page);
    const panel = await openEnvironment(page);
    const time = panel.locator('input[name=time-of-day]');

    await time.fill('12');
    await expect.poll(async () => (await atmosphere(page)).keyIntensity).toBeGreaterThan(2);
    expect((await atmosphere(page)).particles).toBe('dust');

    await time.fill('23');
    await expect.poll(async () => (await atmosphere(page)).particles).toBe('fireflies');
    expect((await atmosphere(page)).keyIntensity).toBeLessThan(1);

    await panel.getByRole('radio', { name: 'Dungeon' }).check({ force: true });
    await expect.poll(async () => (await atmosphere(page)).keyIntensity).toBe(0);
  });

  test('switches weather', async ({ page }) => {
    await openTable(page);
    const panel = await openEnvironment(page);
    const clearFog = (await atmosphere(page)).fogDensity;

    await panel.getByRole('radio', { name: 'Rain' }).check({ force: true });
    await expect.poll(async () => (await atmosphere(page)).weather).toBe('rain');

    await panel.getByRole('radio', { name: 'Fog' }).check({ force: true });
    await expect.poll(async () => (await atmosphere(page)).weather).toBe('fog');
    expect((await atmosphere(page)).fogDensity).toBeGreaterThan(clearFog);

    await panel.getByRole('radio', { name: 'Clear' }).check({ force: true });
    await expect.poll(async () => (await atmosphere(page)).fogDensity).toBeCloseTo(clearFog, 5);
  });

  test('has no axe violations while open', async ({ page }) => {
    await openTable(page);
    await openEnvironment(page);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });
});

test.describe('ambient motion (WCAG 2.2.2 Pause, Stop, Hide)', () => {
  test.skip(({ isMobile }) => isMobile, 'keyboard shortcuts');

  test('stays still under Reduced Motion', async ({ page }) => {
    await openTable(page); // emulates prefers-reduced-motion: reduce
    const before = await ticks(page);
    await page.waitForTimeout(800);
    expect(await ticks(page)).toBe(before);
  });

  test('animates by default and stops when switched off', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/');
    await page.waitForFunction(() => window.__DIORAMA_DIAGNOSTICS__?.ready === true);
    const start = await ticks(page);
    await expect.poll(() => ticks(page)).toBeGreaterThan(start + 3);

    const panel = await openEnvironment(page);
    await panel.getByRole('switch', { name: 'Ambient motion' }).click();
    await page.waitForTimeout(300);
    const stopped = await ticks(page);
    await page.waitForTimeout(800);
    expect(await ticks(page)).toBe(stopped);
  });
});
