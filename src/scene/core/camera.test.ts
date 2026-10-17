import { describe, expect, it } from 'vitest';
import { snapAzimuth, stepAzimuth } from './camera';

const Q = Math.PI / 4;

describe('stepAzimuth (Q/E keys)', () => {
  it('turns 45° from a snapped angle', () => {
    expect(stepAzimuth(0, 1)).toBeCloseTo(Q);
    expect(stepAzimuth(Q, -1)).toBeCloseTo(0);
  });

  it('goes to the next 45° mark in the chosen direction from an in-between angle', () => {
    expect(stepAzimuth(0.1, 1)).toBeCloseTo(Q);
    expect(stepAzimuth(0.1, -1)).toBeCloseTo(0);
    expect(stepAzimuth(-0.1, 1)).toBeCloseTo(0);
  });

  it('treats an angle within floating-point noise of a mark as on the mark', () => {
    expect(stepAzimuth(Q + 1e-9, 1)).toBeCloseTo(2 * Q);
  });

  it('keeps turning past a full circle without wrapping (camera-controls azimuth is continuous)', () => {
    expect(stepAzimuth(2 * Math.PI, 1)).toBeCloseTo(2 * Math.PI + Q);
  });
});

describe('snapAzimuth (45° snap button)', () => {
  it('rounds to the nearest 45° mark', () => {
    expect(snapAzimuth(0.5)).toBeCloseTo(Q);
    expect(snapAzimuth(0.3)).toBeCloseTo(0);
    expect(snapAzimuth(-0.5)).toBeCloseTo(-Q);
  });
});
