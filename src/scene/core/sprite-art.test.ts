import { describe, expect, it } from 'vitest';
import { layerData } from './pixel-art';
import { grassTexture, SPRITE_LAYER, SPRITES } from './sprite-art';

describe('sprite art', () => {
  it('fits every sprite in a texture-array layer', () => {
    for (const [name, sprite] of Object.entries(SPRITES)) {
      expect(
        () => layerData(sprite.draw(), SPRITE_LAYER.width, SPRITE_LAYER.height),
        name,
      ).not.toThrow();
    }
  });

  it('gives every sprite its own layer', () => {
    const layers = Object.values(SPRITES).map((s) => s.layer);
    expect(new Set(layers).size).toBe(layers.length);
    expect(Math.max(...layers)).toBe(layers.length - 1);
  });

  it('stands every sprite on its bottom row (no floating feet)', () => {
    for (const [name, sprite] of Object.entries(SPRITES)) {
      const image = sprite.draw();
      const bottom = Array.from({ length: image.width }, (_, x) =>
        image.filled(x, image.height - 1),
      );
      expect(bottom.some(Boolean), name).toBe(true);
    }
  });

  it('draws the same grass every time (seeded)', () => {
    expect(grassTexture().data).toEqual(grassTexture().data);
  });
});
