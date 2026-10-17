import { readFileSync } from 'node:fs';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';

type VercelHeaderRule = { source: string; headers: { key: string; value: string }[] };

// `vite preview` serves the same security headers as Vercel, so CSP problems show up locally.
function vercelHeaders(): Record<string, string> {
  const config = JSON.parse(readFileSync(new URL('./vercel.json', import.meta.url), 'utf8')) as {
    headers?: VercelHeaderRule[];
  };
  const global = config.headers?.find((rule) => rule.source === '/(.*)');
  return Object.fromEntries((global?.headers ?? []).map(({ key, value }) => [key, value]));
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    target: 'es2022',
    sourcemap: true,
    // The three.js + R3F chunk is lazy and budgeted separately in .size-limit.json.
    chunkSizeWarningLimit: 1000,
  },
  preview: {
    headers: vercelHeaders(),
  },
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    environment: 'node',
  },
});
