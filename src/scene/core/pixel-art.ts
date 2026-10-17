// Tiny pixel-art toolkit for procedural sprites and textures (Prompt §12: when no asset with a
// clear licence is available, draw one in code). Coordinates are top-left origin, like the art.

export type RGBA = readonly [number, number, number, number];

const CLEAR: RGBA = [0, 0, 0, 0];

export class PixelImage {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8Array;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.data = new Uint8Array(width * height * 4);
  }

  get(x: number, y: number): number[] {
    const i = (y * this.width + x) * 4;
    return Array.from(this.data.slice(i, i + 4));
  }

  set(x: number, y: number, color: RGBA): void {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return;
    this.data.set(color, (y * this.width + x) * 4);
  }

  filled(x: number, y: number): boolean {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return false;
    return this.data[(y * this.width + x) * 4 + 3]! > 0;
  }
}

export function fromRows(rows: string[], palette: Record<string, RGBA>): PixelImage {
  const width = Math.max(...rows.map((r) => r.length));
  const image = new PixelImage(width, rows.length);
  rows.forEach((row, y) => {
    [...row].forEach((key, x) => {
      if (key === '.') return;
      const color = palette[key];
      if (!color) throw new Error(`Colour "${key}" is not in the palette`);
      image.set(x, y, color);
    });
  });
  return image;
}

/** One texture-array layer: the image bottom-centred, rows ordered bottom-up for WebGL. */
export function layerData(image: PixelImage, layerWidth: number, layerHeight: number): Uint8Array {
  if (image.width > layerWidth || image.height > layerHeight) {
    throw new Error(
      `Image ${image.width}×${image.height} does not fit ${layerWidth}×${layerHeight}`,
    );
  }
  const out = new Uint8Array(layerWidth * layerHeight * 4);
  const left = Math.floor((layerWidth - image.width) / 2);
  for (let y = 0; y < image.height; y++) {
    const glRow = image.height - 1 - y; // bottom-aligned, flipped
    for (let x = 0; x < image.width; x++) {
      const src = (y * image.width + x) * 4;
      out.set(image.data.subarray(src, src + 4), (glRow * layerWidth + left + x) * 4);
    }
  }
  return out;
}

/** Recolour edge pixels (filled pixels with a transparent 4-neighbour). */
export function outline(image: PixelImage, color: RGBA): void {
  const edges: [number, number][] = [];
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      if (!image.filled(x, y)) continue;
      if (
        !image.filled(x - 1, y) ||
        !image.filled(x + 1, y) ||
        !image.filled(x, y - 1) ||
        !image.filled(x, y + 1)
      )
        edges.push([x, y]);
    }
  }
  for (const [x, y] of edges) image.set(x, y, color);
}

export { CLEAR };
