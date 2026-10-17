import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';

/** Load the app with instant camera moves, and wait until the scene has rendered. */
export async function openTable(page: Page, query = '') {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`/${query}`);
  await page.waitForFunction(() => window.__DIORAMA_DIAGNOSTICS__?.ready === true);
}

export function camera(page: Page) {
  return page.evaluate(() => {
    const c = window.__DIORAMA_DIAGNOSTICS__!.camera;
    return { mode: c.mode, azimuth: c.azimuth, polar: c.polar, distance: c.distance };
  });
}

export async function expectAzimuth(page: Page, radians: number) {
  await expect
    .poll(async () => (await camera(page)).azimuth, { timeout: 5000 })
    .toBeCloseTo(radians, 2);
}

/** Dispatch a two-finger touch gesture on the canvas from `from` to `to` positions. */
export async function twoFingerGesture(
  page: Page,
  from: [[number, number], [number, number]],
  to: [[number, number], [number, number]],
  steps = 10,
) {
  await page.evaluate(
    ({ from, to, steps }) => {
      const canvas = document.querySelector('canvas')!;
      const fire = (type: string, id: number, [x, y]: [number, number]) =>
        canvas.dispatchEvent(
          new PointerEvent(type, {
            pointerId: id,
            pointerType: 'touch',
            isPrimary: id === 1,
            clientX: x,
            clientY: y,
            bubbles: true,
          }),
        );
      fire('pointerdown', 1, from[0]);
      fire('pointerdown', 2, from[1]);
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        for (const [index, id] of [
          [0, 1],
          [1, 2],
        ] as const) {
          const a = from[index];
          const b = to[index];
          fire('pointermove', id, [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
        }
      }
      fire('pointerup', 1, to[0]);
      fire('pointerup', 2, to[1]);
    },
    { from, to, steps },
  );
}
