import { describe, expect, it } from 'vitest';
import { cloudNoise } from './noise';

describe('cloudNoise', () => {
  it('fills a size × size single-channel image', () => {
    expect(cloudNoise(64, 1)).toHaveLength(64 * 64);
  });

  it('is deterministic for a seed', () => {
    expect(cloudNoise(32, 7)).toEqual(cloudNoise(32, 7));
    expect(cloudNoise(32, 7)).not.toEqual(cloudNoise(32, 8));
  });

  it('tiles without a seam: opposite edges are neighbours', () => {
    const size = 64;
    const n = cloudNoise(size, 3);
    let edge = 0;
    let inner = 0;
    for (let y = 0; y < size; y++) {
      edge += Math.abs(n[y * size + size - 1]! - n[y * size]!);
      inner += Math.abs(n[y * size + 31]! - n[y * size + 32]!);
    }
    // A seam would make the wrap-around step much larger than an ordinary step.
    expect(edge).toBeLessThan(inner * 2 + size * 4);
  });

  it('uses most of the value range', () => {
    const n = cloudNoise(64, 5);
    expect(Math.max(...n) - Math.min(...n)).toBeGreaterThan(120);
  });
});
