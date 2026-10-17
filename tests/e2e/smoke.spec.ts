import { expect, test } from '@playwright/test';

test.describe('app shell @smoke', () => {
  test('loads the table in Local Demo mode without console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    page.on('pageerror', (error) => errors.push(error.message));

    await page.goto('/');

    await expect(page).toHaveTitle('DioramaTable');
    await expect(page.getByRole('heading', { name: 'DioramaTable' })).toBeVisible();
    await expect(page.getByText('Local demo')).toBeVisible();
    await expect(page.getByRole('img', { name: 'Game table' })).toBeVisible();

    await page.waitForFunction(() => window.__DIORAMA_DIAGNOSTICS__?.ready === true);
    const webgl2 = await page.evaluate(() => window.__DIORAMA_DIAGNOSTICS__?.webgl2);
    expect(webgl2).toBe(true);

    // Content-Security-Policy violations are reported as console errors.
    expect(errors).toEqual([]);
  });

  test('serves the security headers configured for Vercel', async ({ request }) => {
    const response = await request.get('/');
    const csp = response.headers()['content-security-policy'];
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
  });
});
