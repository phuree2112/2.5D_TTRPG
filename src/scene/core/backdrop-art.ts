// Distant parallax silhouettes (Prompt §6: mountains, forest, castle), drawn as pixel art.
// White shapes on transparent; the shader tints them with the mood (atmospheric perspective).
// Red channel carries a little shading (1 = lit edge, darker below).

import { PixelImage } from './pixel-art';
import { rng } from './sprite-art';

const shade = (v: number): readonly [number, number, number, number] => {
  const c = Math.round(160 + 95 * v);
  return [c, c, c, 255];
};

function ridge(width: number, seed: number, octaves: number[]): number[] {
  const random = rng(seed);
  const waves = octaves.map((amp, i) => ({
    amp,
    freq: (i + 1) * 2,
    phase: random() * Math.PI * 2,
  }));
  return Array.from({ length: width }, (_, x) => {
    const t = (x / width) * Math.PI * 2; // whole sines, so the strip tiles around the cylinder
    return waves.reduce((sum, w) => sum + Math.sin(t * w.freq + w.phase) * w.amp, 0);
  });
}

export function mountains(width = 512, height = 96): PixelImage {
  const image = new PixelImage(width, height);
  const line = ridge(width, 21, [0.35, 0.2, 0.08, 0.04]);
  for (let x = 0; x < width; x++) {
    const top = Math.round(height * (0.42 - line[x]! * 0.6));
    for (let y = Math.max(0, top); y < height; y++) {
      const depth = (y - top) / height;
      image.set(x, y, shade(y - top < 3 ? 1 : 0.55 - depth * 0.5));
    }
  }
  return image;
}

export function forest(width = 512, height = 64): PixelImage {
  const image = new PixelImage(width, height);
  const random = rng(33);
  const base = Math.round(height * 0.7);
  for (let y = base; y < height; y++) for (let x = 0; x < width; x++) image.set(x, y, shade(0.3));
  for (let cx = 0; cx < width; cx += 6 + Math.floor(random() * 6)) {
    const h = 14 + Math.floor(random() * 26);
    for (let y = 0; y < h; y++) {
      const half = Math.max(1, Math.round((y / h) * 6));
      for (let x = cx - half; x <= cx + half; x++) {
        image.set(((x % width) + width) % width, base - h + y, shade(x < cx ? 0.6 : 0.35));
      }
    }
  }
  return image;
}

export function castleHills(width = 512, height = 64): PixelImage {
  const image = new PixelImage(width, height);
  const line = ridge(width, 47, [0.12, 0.06]);
  for (let x = 0; x < width; x++) {
    const top = Math.round(height * (0.72 - line[x]!));
    for (let y = top; y < height; y++) image.set(x, y, shade(y - top < 2 ? 0.8 : 0.4));
  }
  // A castle on one hill: wall, keep and towers with crenellations.
  const cx = Math.round(width * 0.3);
  const ground = Math.round(height * 0.62);
  const block = (x0: number, w: number, h: number) => {
    for (let y = ground - h; y < ground + 4; y++) {
      for (let x = x0; x < x0 + w; x++) image.set(x, y, shade(x < x0 + 2 ? 0.9 : 0.5));
    }
    for (let x = x0; x < x0 + w; x += 2) image.set(x, ground - h - 1, shade(0.5));
  };
  block(cx - 18, 36, 12);
  block(cx - 22, 6, 20);
  block(cx + 16, 6, 20);
  block(cx - 5, 10, 28);
  return image;
}
