import { describe, expect, it } from 'vitest';
import { hitFlat, hitUpright } from './picking';

const down = { origin: { x: 0, y: 10, z: 0 }, dir: { x: 0, y: -1, z: 0 } };

describe('hitUpright (camera-facing standee)', () => {
  const camera = { x: 0, y: 2, z: 10 };
  const ray = (x: number, y: number) => ({ origin: { x, y, z: 10 }, dir: { x: 0, y: 0, z: -1 } });

  it('hits inside the token rectangle', () => {
    const t = hitUpright(ray(0.2, 0.5), { x: 0, y: 0, z: 0 }, 0.9, 1, camera);
    expect(t).toBeCloseTo(10);
  });

  it('misses beside or above it', () => {
    expect(hitUpright(ray(0.6, 0.5), { x: 0, y: 0, z: 0 }, 0.9, 1, camera)).toBeNull();
    expect(hitUpright(ray(0, 1.2), { x: 0, y: 0, z: 0 }, 0.9, 1, camera)).toBeNull();
  });

  it('faces the camera from any side', () => {
    const side = { origin: { x: 10, y: 0.5, z: 0 }, dir: { x: -1, y: 0, z: 0 } };
    expect(hitUpright(side, { x: 0, y: 0, z: 0 }, 0.9, 1, { x: 10, y: 2, z: 0 })).toBeCloseTo(10);
  });
});

describe('hitFlat (token lying on the floor)', () => {
  it('hits within the disc radius', () => {
    expect(hitFlat(down, { x: 0.3, y: 0, z: 0 }, 0.45)).toBeCloseTo(10);
  });

  it('misses outside it', () => {
    expect(hitFlat(down, { x: 0.6, y: 0, z: 0 }, 0.45)).toBeNull();
  });
});
