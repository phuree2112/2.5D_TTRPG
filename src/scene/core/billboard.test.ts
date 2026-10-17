import { describe, expect, it } from 'vitest';
import { cylindricalYaw, rotateAroundY } from './billboard';

describe('cylindricalYaw', () => {
  it('is 0 when the camera is straight ahead along +Z', () => {
    expect(cylindricalYaw({ x: 2, z: 2 }, { x: 2, z: 10 })).toBeCloseTo(0);
  });

  it('turns a quarter when the camera moves to +X', () => {
    expect(cylindricalYaw({ x: 0, z: 0 }, { x: 5, z: 0 })).toBeCloseTo(Math.PI / 2);
  });

  it('turns to face the camera wherever it orbits', () => {
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const camera = { x: Math.sin(a) * 10, z: Math.cos(a) * 10 };
      const yaw = cylindricalYaw({ x: 0, z: 0 }, camera);
      // The quad's facing direction (+Z rotated by yaw) points at the camera.
      expect(Math.sin(yaw)).toBeCloseTo(camera.x / 10);
      expect(Math.cos(yaw)).toBeCloseTo(camera.z / 10);
    }
  });
});

describe('rotateAroundY (mirrors the vertex shader)', () => {
  it('turns the quad edge so the sprite stays perpendicular to the camera', () => {
    const yaw = Math.PI / 2;
    const p = rotateAroundY({ x: 1, y: 0.5, z: 0 }, yaw);
    expect(p.x).toBeCloseTo(0);
    expect(p.y).toBeCloseTo(0.5);
    expect(p.z).toBeCloseTo(-1);
  });
});
