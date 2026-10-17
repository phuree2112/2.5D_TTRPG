import { TOKEN_IMAGE_SIZE } from '../../tokens/core/sample-art';
import { getTokenImage } from '../../tokens/images';

const cache = new Map<string, string>();

/** Data URL of a token image for <img> previews in panels. */
export function tokenPreview(imageId: string): string | undefined {
  const cached = cache.get(imageId);
  if (cached) return cached;
  const image = getTokenImage(imageId);
  if (!image) return undefined;
  const canvas = Object.assign(document.createElement('canvas'), {
    width: TOKEN_IMAGE_SIZE,
    height: TOKEN_IMAGE_SIZE,
  });
  const ctx = canvas.getContext('2d')!;
  ctx.putImageData(
    new ImageData(new Uint8ClampedArray(image.rgba), TOKEN_IMAGE_SIZE, TOKEN_IMAGE_SIZE),
    0,
    0,
  );
  const url = canvas.toDataURL('image/png');
  cache.set(imageId, url);
  return url;
}
