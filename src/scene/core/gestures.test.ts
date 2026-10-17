import { describe, expect, it } from 'vitest';
import { classifyTwoFinger, twoFingerDelta } from './gestures';
import type { FingerPair } from './gestures';

const start: FingerPair = [
  { x: 100, y: 200 },
  { x: 200, y: 200 },
];

function rotate(pair: FingerPair, radians: number): FingerPair {
  const cx = (pair[0].x + pair[1].x) / 2;
  const cy = (pair[0].y + pair[1].y) / 2;
  const turn = ({ x, y }: { x: number; y: number }) => ({
    x: cx + (x - cx) * Math.cos(radians) - (y - cy) * Math.sin(radians),
    y: cy + (x - cx) * Math.sin(radians) + (y - cy) * Math.cos(radians),
  });
  return [turn(pair[0]), turn(pair[1])];
}

describe('classifyTwoFinger', () => {
  it('stays pending for tiny movements', () => {
    const current: FingerPair = [
      { x: 101, y: 201 },
      { x: 201, y: 199 },
    ];
    expect(classifyTwoFinger(start, current)).toBe('pending');
  });

  it('recognises a twist', () => {
    expect(classifyTwoFinger(start, rotate(start, (12 * Math.PI) / 180))).toBe('twist');
  });

  it('recognises a pinch', () => {
    const current: FingerPair = [
      { x: 80, y: 200 },
      { x: 220, y: 200 },
    ];
    expect(classifyTwoFinger(start, current)).toBe('pinch');
  });

  it('recognises both fingers dragging up together as tilt', () => {
    const current: FingerPair = [
      { x: 100, y: 170 },
      { x: 200, y: 170 },
    ];
    expect(classifyTwoFinger(start, current)).toBe('tilt');
  });

  it('does not call it tilt when the fingers move vertically in opposite directions', () => {
    const current: FingerPair = [
      { x: 100, y: 180 },
      { x: 200, y: 220 },
    ];
    expect(classifyTwoFinger(start, current)).not.toBe('tilt');
  });
});

describe('twoFingerDelta', () => {
  it('reports the twist angle, pinch scale and vertical drag between two frames', () => {
    const turned = rotate(start, 0.2);
    const delta = twoFingerDelta(start, turned);
    expect(delta.angle).toBeCloseTo(0.2);
    expect(delta.scale).toBeCloseTo(1);
    expect(delta.dy).toBeCloseTo(0);
  });

  it('reports scale > 1 when the fingers spread', () => {
    const current: FingerPair = [
      { x: 50, y: 200 },
      { x: 250, y: 200 },
    ];
    expect(twoFingerDelta(start, current).scale).toBeCloseTo(2);
  });

  it('measures the angle change across the ±180° seam', () => {
    const a: FingerPair = [
      { x: 200, y: 200.0001 },
      { x: 100, y: 200 },
    ];
    const b = rotate(a, 0.1);
    expect(twoFingerDelta(a, b).angle).toBeCloseTo(0.1);
  });
});
