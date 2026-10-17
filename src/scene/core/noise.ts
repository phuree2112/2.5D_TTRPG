// Tileable value-noise fBm for clouds, cloud shadows and water (Prompt §6). Pure and seeded.

function lattice(cells: number, seed: number): Float32Array {
  const values = new Float32Array(cells * cells);
  let t = seed >>> 0;
  for (let i = 0; i < values.length; i++) {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    values[i] = ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  }
  return values;
}

const smooth = (t: number) => t * t * (3 - 2 * t);

/** One channel, 0–255, `size` × `size`, wrapping seamlessly in both directions. */
export function cloudNoise(size: number, seed: number): Uint8Array {
  const out = new Float32Array(size * size);
  let amplitude = 1;
  let total = 0;
  for (let octave = 0; octave < 4; octave++) {
    const cells = 4 << octave; // 4, 8, 16, 32 lattice cells per tile
    const grid = lattice(cells, seed * 31 + octave);
    const at = (x: number, y: number) =>
      grid[((y + cells) % cells) * cells + ((x + cells) % cells)]!;
    for (let y = 0; y < size; y++) {
      const fy = (y / size) * cells;
      const y0 = Math.floor(fy);
      const ty = smooth(fy - y0);
      for (let x = 0; x < size; x++) {
        const fx = (x / size) * cells;
        const x0 = Math.floor(fx);
        const tx = smooth(fx - x0);
        const top = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * tx;
        const bottom = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * tx;
        out[y * size + x]! += (top + (bottom - top) * ty) * amplitude;
      }
    }
    total += amplitude;
    amplitude *= 0.5;
  }
  let min = Infinity;
  let max = -Infinity;
  for (const v of out) {
    min = Math.min(min, v);
    max = Math.max(max, v);
  }
  const bytes = new Uint8Array(size * size);
  for (let i = 0; i < out.length; i++)
    bytes[i] = Math.round(((out[i]! - min) / (max - min || total)) * 255);
  return bytes;
}
