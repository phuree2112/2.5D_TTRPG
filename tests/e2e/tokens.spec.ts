import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { openTable } from './helpers';
import { testPng } from './png';

type TokenInfo = { id: string; name: string; col: number; row: number; mode: string };

const tokens = (page: Page) =>
  page.evaluate(() => window.__DIORAMA_DIAGNOSTICS__?.tokens ?? []) as Promise<TokenInfo[]>;

async function token(page: Page, name: string): Promise<TokenInfo> {
  const found = (await tokens(page)).find((t) => t.name === name);
  if (!found) throw new Error(`No token named ${name}`);
  return found;
}

async function screenOf(page: Page, id: string) {
  const point = await page.evaluate(
    (tokenId) => window.__DIORAMA_DIAGNOSTICS__!.projectToken!(tokenId),
    id,
  );
  if (!point) throw new Error('Token not on screen');
  return point;
}

test.describe('tokens', () => {
  test.skip(({ isMobile }) => isMobile, 'mouse and keyboard');

  test('seeds the 20-token benchmark scene (Prompt §13)', async ({ page }) => {
    await openTable(page);
    await expect.poll(async () => (await tokens(page)).length).toBe(20);
  });

  test('selects a token by clicking it and shows its settings', async ({ page }) => {
    await openTable(page);
    await page.keyboard.press('v');
    const mage = await token(page, 'Mage');
    const p = await screenOf(page, mage.id);
    await page.mouse.click(p.x, p.y);
    await expect(page.getByRole('region', { name: 'Selected: Mage' })).toBeVisible();
  });

  test('drags a token and snaps it to a cell', async ({ page }) => {
    await openTable(page);
    const mage = await token(page, 'Mage');
    const p = await screenOf(page, mage.id);
    await page.mouse.move(p.x, p.y);
    await page.mouse.down();
    await page.mouse.move(p.x + 60, p.y, { steps: 4 });
    await page.mouse.move(p.x + 140, p.y + 10, { steps: 6 });
    await page.mouse.up();
    await expect
      .poll(async () => {
        const moved = await token(page, 'Mage');
        return moved.col !== mage.col || moved.row !== mage.row;
      })
      .toBe(true);
    const moved = await token(page, 'Mage');
    expect(Number.isInteger(moved.col) && Number.isInteger(moved.row)).toBe(true);
  });

  test('moves the selected token one cell with an arrow key', async ({ page }) => {
    await openTable(page);
    const cleric = await token(page, 'Cleric');
    const p = await screenOf(page, cleric.id);
    await page.mouse.click(p.x, p.y);
    await page.keyboard.press('ArrowUp');
    await expect
      .poll(async () => {
        const moved = await token(page, 'Cleric');
        return Math.abs(moved.col - cleric.col) + Math.abs(moved.row - cleric.row);
      })
      .toBe(1);
  });

  test('switches the selected token between Flat, Standee and Pop-out', async ({ page }) => {
    await openTable(page);
    await page.keyboard.press('v');
    // Select through the panel's token list (the accessible way into the scene).
    await page
      .getByRole('region', { name: 'On the table' })
      .getByRole('button', { name: /Wolf 1/ })
      .click();
    const panel = page.getByRole('region', { name: 'Selected: Wolf 1' });
    await panel.getByText('Flat', { exact: true }).click();
    await expect.poll(async () => (await token(page, 'Wolf 1')).mode).toBe('flat');
    await panel.getByText('Pop-out', { exact: true }).click();
    await expect.poll(async () => (await token(page, 'Wolf 1')).mode).toBe('popout');
  });

  test('moves with tap-then-tap using the Move tool (WCAG 2.5.7)', async ({ page }) => {
    await openTable(page);
    await page.keyboard.press('m');
    await page.keyboard.press('Escape');
    const rogue = await token(page, 'Rogue');
    const p = await screenOf(page, rogue.id);
    await page.mouse.click(p.x, p.y);
    await page.mouse.click(p.x - 160, p.y + 40);
    await expect
      .poll(async () => {
        const moved = await token(page, 'Rogue');
        return moved.col !== rogue.col || moved.row !== rogue.row;
      })
      .toBe(true);
  });

  test('adds a sample token from the library', async ({ page }) => {
    await openTable(page);
    await page.keyboard.press('Shift+T');
    await page
      .getByRole('dialog', { name: 'Token library' })
      .getByRole('button', { name: 'Add Bear' })
      .click();
    await expect.poll(async () => (await tokens(page)).length).toBe(21);
  });

  test('imports an image, crops it and puts it on the table', async ({ page }) => {
    await openTable(page);
    await page.keyboard.press('Shift+I');
    const panel = page.getByRole('dialog', { name: 'Import token' });
    await panel.locator('input[type=file]').setInputFiles({
      name: 'red-knight.png',
      mimeType: 'image/png',
      buffer: testPng(),
    });
    await expect(panel.getByRole('img', { name: /Crop preview/ })).toBeVisible();
    await expect(panel.getByLabel('Name')).toHaveValue('red-knight');
    await panel.getByRole('button', { name: 'Add to table' }).click();
    await expect(panel.getByText('Added red-knight')).toBeVisible();
    await expect.poll(async () => (await tokens(page)).map((t) => t.name)).toContain('red-knight');
  });

  test('rejects files that are not images', async ({ page }) => {
    await openTable(page);
    await page.keyboard.press('Shift+I');
    const panel = page.getByRole('dialog', { name: 'Import token' });
    await panel.locator('input[type=file]').setInputFiles({
      name: 'notes.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('hello'),
    });
    await expect(panel.getByRole('alert')).toHaveText('Use a PNG, WebP or JPEG image.');
  });

  test('passes an axe scan with the Select panel open', async ({ page }) => {
    await openTable(page);
    await page.keyboard.press('v');
    const mage = await token(page, 'Mage');
    const p = await screenOf(page, mage.id);
    await page.mouse.click(p.x, p.y);
    await expect(page.getByRole('region', { name: 'Selected: Mage' })).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });
});
