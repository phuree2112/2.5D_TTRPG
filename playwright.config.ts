import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;
// Headless Chromium needs SwiftShader for WebGL (Engineering.md §18).
const chromiumWebGL = { launchOptions: { args: ['--enable-unsafe-swiftshader'] } };

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'], ...chromiumWebGL } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 7'], ...chromiumWebGL } },
    { name: 'mobile-safari', use: { ...devices['iPhone 14'] } },
  ],
  // The production preview serves the same CSP headers as Vercel (vite.config.ts).
  webServer: {
    command: `npm run build && npm run preview -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
