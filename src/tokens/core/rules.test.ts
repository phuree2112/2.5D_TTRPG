import { describe, expect, it } from 'vitest';
import type { GridSpec } from '../../scene/core/grid';
import {
  cropRect,
  easeInOutCubic,
  footprintCenter,
  formatDistance,
  gridDistance,
  hpStatus,
  moveDurationMs,
  snapCell,
  tokenDiameter,
} from './rules';

const square: GridSpec = { type: 'square', width: 10, depth: 10 };
const hex: GridSpec = { type: 'hex', width: 10, depth: 10 };

describe('token size (Prompt §4.2)', () => {
  it('is 90 % of the cells it occupies', () => {
    expect(tokenDiameter('tiny')).toBeCloseTo(0.45);
    expect(tokenDiameter('medium')).toBeCloseTo(0.9);
    expect(tokenDiameter('large')).toBeCloseTo(1.8);
    expect(tokenDiameter('gargantuan')).toBeCloseTo(3.6);
  });
});

describe('footprintCenter', () => {
  it('centres a medium token in its cell', () => {
    expect(footprintCenter(square, { col: 2, row: 3 }, 'medium')).toEqual({ x: 2.5, z: 3.5 });
  });

  it('centres a large token on the corner shared by its 2 × 2 cells', () => {
    expect(footprintCenter(square, { col: 2, row: 3 }, 'large')).toEqual({ x: 3, z: 4 });
  });

  it('uses the hex centre on hex grids', () => {
    const c = footprintCenter(hex, { col: 0, row: 1 }, 'medium');
    expect(c.x).toBeCloseTo(1);
  });
});

describe('snapCell', () => {
  it('snaps a medium token to the cell under the point', () => {
    expect(snapCell(square, { x: 4.9, z: 1.2 }, 'medium')).toEqual({ col: 4, row: 1 });
  });

  it('snaps a large token so its centre lands on the nearest grid corner', () => {
    expect(snapCell(square, { x: 4.9, z: 1.2 }, 'large')).toEqual({ col: 4, row: 0 });
  });

  it('keeps the whole footprint on the map', () => {
    expect(snapCell(square, { x: 9.9, z: 9.9 }, 'huge')).toEqual({ col: 7, row: 7 });
    expect(snapCell(square, { x: -3, z: 0.2 }, 'medium')).toEqual({ col: 0, row: 0 });
  });

  it('snaps to hexes on hex grids', () => {
    expect(snapCell(hex, { x: 1.01, z: 0.6 }, 'medium')).toEqual({ col: 1, row: 0 });
  });
});

describe('gridDistance', () => {
  const a = { col: 0, row: 0 };
  const b = { col: 3, row: 2 };

  it('counts every diagonal as one cell under the 5e default rule', () => {
    expect(gridDistance(square, a, b, 'chebyshev')).toBe(3);
  });

  it('alternates 1 and 2 for diagonals under the 5/10 rule', () => {
    expect(gridDistance(square, a, b, 'alternating')).toBe(4);
    expect(gridDistance(square, a, { col: 3, row: 3 }, 'alternating')).toBe(4);
  });

  it('measures straight-line distance under the Euclidean rule', () => {
    expect(gridDistance(square, a, b, 'euclidean')).toBeCloseTo(Math.hypot(3, 2));
  });

  it('counts hex steps on hex grids', () => {
    expect(gridDistance(hex, { col: 0, row: 0 }, { col: 2, row: 0 }, 'chebyshev')).toBe(2);
    expect(gridDistance(hex, { col: 0, row: 0 }, { col: 0, row: 2 }, 'chebyshev')).toBe(2);
  });
});

describe('formatDistance', () => {
  it('converts cells to feet by default', () => {
    expect(formatDistance(3)).toBe('15 ft');
  });

  it('rounds to one decimal in metres', () => {
    expect(formatDistance(Math.hypot(3, 2), 1.5, 'm')).toBe('5.4 m');
  });
});

describe('movement timing (Visual.md §8.2)', () => {
  it('moves at 6 cells per second, between 200 ms and 1.2 s', () => {
    expect(moveDurationMs(3)).toBe(500);
    expect(moveDurationMs(0.2)).toBe(200);
    expect(moveDurationMs(30)).toBe(1200);
  });

  it('eases in and out', () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5);
    expect(easeInOutCubic(1)).toBe(1);
    expect(easeInOutCubic(0.1)).toBeLessThan(0.1);
  });
});

describe('hpStatus (Visual.md §3.5)', () => {
  it('maps HP to the status words and bar states', () => {
    expect(hpStatus({ current: 30, max: 30, temp: 0 })).toBe('healthy');
    expect(hpStatus({ current: 15, max: 30, temp: 0 })).toBe('bloodied');
    expect(hpStatus({ current: 7, max: 30, temp: 0 })).toBe('critical');
    expect(hpStatus({ current: 0, max: 30, temp: 5 })).toBe('down');
  });
});

describe('cropRect (token import)', () => {
  it('takes the largest centred square at zoom 1', () => {
    expect(cropRect(800, 600, 1, { x: 0, y: 0 })).toEqual({ x: 100, y: 0, size: 600 });
  });

  it('shrinks the square when zooming in', () => {
    expect(cropRect(800, 600, 2, { x: 0, y: 0 })).toEqual({ x: 250, y: 150, size: 300 });
  });

  it('moves with the offset but never leaves the image', () => {
    expect(cropRect(800, 600, 2, { x: 100, y: -40 })).toEqual({ x: 350, y: 110, size: 300 });
    expect(cropRect(800, 600, 2, { x: 9999, y: 9999 })).toEqual({ x: 500, y: 300, size: 300 });
  });
});
