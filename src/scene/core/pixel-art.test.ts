import { describe, expect, it } from 'vitest';
import { fromRows, layerData, outline, PixelImage } from './pixel-art';

const palette = { r: [255, 0, 0, 255], b: [0, 0, 255, 255] } as const;

describe('fromRows', () => {
  it('reads rows top to bottom, with "." as transparent', () => {
    const image = fromRows(['r.', '.b'], palette);
    expect(image.width).toBe(2);
    expect(image.height).toBe(2);
    expect(image.get(0, 0)).toEqual([255, 0, 0, 255]); // top-left
    expect(image.get(1, 0)).toEqual([0, 0, 0, 0]);
    expect(image.get(1, 1)).toEqual([0, 0, 255, 255]);
  });

  it('pads short rows with transparency', () => {
    const image = fromRows(['rr', 'r'], palette);
    expect(image.get(1, 1)).toEqual([0, 0, 0, 0]);
  });

  it('rejects colours missing from the palette', () => {
    expect(() => fromRows(['x'], palette)).toThrow(/x/);
  });
});

describe('layerData', () => {
  it('places the image bottom-centred in the layer, bottom row first (WebGL order)', () => {
    const image = fromRows(['r'], palette);
    const data = layerData(image, 3, 2);
    expect(data.length).toBe(3 * 2 * 4);
    // WebGL row 0 is the bottom of the texture; the pixel sits at x = 1 there.
    expect(Array.from(data.slice(4, 8))).toEqual([255, 0, 0, 255]);
    expect(Array.from(data.slice(0, 4))).toEqual([0, 0, 0, 0]);
    expect(Array.from(data.slice(16, 20))).toEqual([0, 0, 0, 0]);
  });

  it('refuses images larger than the layer', () => {
    expect(() => layerData(new PixelImage(4, 1), 3, 3)).toThrow();
  });
});

describe('outline', () => {
  it('darkens the filled pixels that touch transparency', () => {
    const image = fromRows(['rrr', 'rrr', 'rrr'], palette);
    outline(image, [1, 2, 3, 255]);
    expect(image.get(0, 0)).toEqual([1, 2, 3, 255]);
    expect(image.get(1, 1)).toEqual([255, 0, 0, 255]); // the centre is enclosed
  });
});
