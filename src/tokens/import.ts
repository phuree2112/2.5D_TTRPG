// Token import (Prompt §4.2): decode, crop to a square chosen in the circular preview, then
// produce the 256 px texture image and a ≤ 512 px WebP for storage. Runs in the browser.

import { TOKEN_IMAGE_SIZE } from './core/sample-art';

export const ACCEPTED_TYPES = ['image/png', 'image/webp', 'image/jpeg'];
const MAX_BYTES = 15 * 1024 * 1024;

export type Crop = { x: number; y: number; size: number };

export async function decodeImage(file: File): Promise<ImageBitmap> {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    throw new Error('Use a PNG, WebP or JPEG image.');
  }
  if (file.size > MAX_BYTES) throw new Error('This image is over 15 MB. Use a smaller one.');
  return createImageBitmap(file);
}

function draw(bitmap: ImageBitmap, crop: Crop, size: number) {
  const canvas = Object.assign(document.createElement('canvas'), { width: size, height: size });
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  // Small images (pixel art) stay crisp; large photos are smoothed when scaled down.
  ctx.imageSmoothingEnabled = crop.size > size;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, crop.x, crop.y, crop.size, crop.size, 0, 0, size, size);
  return { canvas, ctx };
}

export function cropToRgba(bitmap: ImageBitmap, crop: Crop): Uint8Array {
  const { ctx } = draw(bitmap, crop, TOKEN_IMAGE_SIZE);
  return new Uint8Array(ctx.getImageData(0, 0, TOKEN_IMAGE_SIZE, TOKEN_IMAGE_SIZE).data.buffer);
}

/** WebP at most 512 px (Prompt §4.2), kept for the data layer in Phase 9. */
export function cropToWebp(bitmap: ImageBitmap, crop: Crop): Promise<Blob | null> {
  const { canvas } = draw(bitmap, crop, Math.min(512, crop.size));
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', 0.9));
}
