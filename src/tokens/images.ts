// Token images (256 × 256 RGBA, top-left origin), shared by the renderer and the UI.
// Sample images are drawn on first use. Uploads add themselves here (Phase 9 moves them to
// storage; for now they live for the session).

import { SAMPLE_TOKENS, tokenImage } from './core/sample-art';

export type TokenImage = {
  rgba: Uint8Array;
  /** Encoded WebP of the cropped upload (≤ 512 px), kept for the data layer. */
  webp?: Blob;
};

const images = new Map<string, TokenImage>();
const listeners = new Set<() => void>();

export function getTokenImage(id: string): TokenImage | undefined {
  const existing = images.get(id);
  if (existing) return existing;
  const sample = id.startsWith('sample:') && SAMPLE_TOKENS.find((s) => `sample:${s.id}` === id);
  if (!sample) return undefined;
  const image = { rgba: tokenImage(sample.draw()) };
  images.set(id, image);
  return image;
}

const uploads: string[] = [];

/** Images imported this session, newest last. */
export function listUploads(): readonly string[] {
  return uploads;
}

export function putTokenImage(id: string, image: TokenImage): void {
  images.set(id, image);
  if (!id.startsWith('sample:') && !uploads.includes(id)) uploads.push(id);
  listeners.forEach((listener) => listener());
}

export function subscribeTokenImages(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
