import {
  DataArrayTexture,
  DataTexture,
  LinearMipmapLinearFilter,
  NearestFilter,
  RepeatWrapping,
  SRGBColorSpace,
} from 'three';
import { layerData } from '../core/pixel-art';
import type { PixelImage } from '../core/pixel-art';
import { SPRITE_LAYER, SPRITES } from '../core/sprite-art';

// Pixel art stays crisp up close (NearestFilter) and does not shimmer far away (mipmaps).
// Visual.md §2.2, Engineering.md §7.3.

export function createSpriteArray(): DataArrayTexture {
  const { width, height } = SPRITE_LAYER;
  const sprites = Object.values(SPRITES).sort((a, b) => a.layer - b.layer);
  const layerBytes = width * height * 4;
  const data = new Uint8Array(layerBytes * sprites.length);
  sprites.forEach((sprite, i) => data.set(layerData(sprite.draw(), width, height), i * layerBytes));

  const texture = new DataArrayTexture(data, width, height, sprites.length);
  texture.colorSpace = SRGBColorSpace;
  texture.magFilter = NearestFilter;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

export function createTileTexture(image: PixelImage, repeatX = 1, repeatY = 1): DataTexture {
  // Bottom-up row order does not matter for tiling textures.
  const texture = new DataTexture(image.data, image.width, image.height);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.magFilter = NearestFilter;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

/** Soft round shadow for blob shadows: alpha falls off from the centre (alphaMap reads green). */
export function createBlobTexture(size = 32): DataTexture {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x + 0.5 - size / 2, y + 0.5 - size / 2) / (size / 2);
      const a = Math.round(255 * Math.max(0, 1 - d) ** 1.5);
      data.set([a, a, a, 255], (y * size + x) * 4);
    }
  }
  const texture = new DataTexture(data, size, size);
  texture.minFilter = LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}
