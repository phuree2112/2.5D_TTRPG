import { describe, expect, it } from 'vitest';
import { cellCenter, gridExtent, gridLineSegments, HEX_SIZE, worldToCell } from './grid';
import type { GridSpec } from './grid';

const square: GridSpec = { type: 'square', width: 3, depth: 2 };
const hex: GridSpec = { type: 'hex', width: 5, depth: 4 };
const segmentCount = (spec: GridSpec) => gridLineSegments(spec).length / 4;

describe('square grid', () => {
  it('puts cell centres half a unit in from the cell corner', () => {
    expect(cellCenter(square, { col: 2, row: 1 })).toEqual({ x: 2.5, z: 1.5 });
  });

  it('maps a world point to the cell that contains it', () => {
    expect(worldToCell(square, { x: 2.9, z: 0.1 })).toEqual({ col: 2, row: 0 });
  });

  it('returns null for points outside the grid', () => {
    expect(worldToCell(square, { x: -0.1, z: 0 })).toBeNull();
    expect(worldToCell(square, { x: 3, z: 0.5 })).toBeNull();
  });

  it('has one line per column and row boundary', () => {
    expect(segmentCount(square)).toBe(4 + 3);
  });

  it('spans width × depth world units', () => {
    expect(gridExtent(square)).toEqual({ width: 3, depth: 2 });
  });
});

describe('hex grid (pointy-top, odd rows shifted right)', () => {
  it('places the first hex so its top point touches z = 0', () => {
    expect(cellCenter(hex, { col: 0, row: 0 })).toEqual({ x: 0.5, z: HEX_SIZE });
  });

  it('shifts odd rows half a cell to the right', () => {
    const c = cellCenter(hex, { col: 0, row: 1 });
    expect(c.x).toBeCloseTo(1);
    expect(c.z).toBeCloseTo(HEX_SIZE * 2.5);
  });

  it('maps every cell centre back to its own cell', () => {
    for (let row = 0; row < hex.depth; row++) {
      for (let col = 0; col < hex.width; col++) {
        expect(worldToCell(hex, cellCenter(hex, { col, row }))).toEqual({ col, row });
      }
    }
  });

  it('assigns a point just past a shared edge to the neighbouring hex', () => {
    expect(worldToCell(hex, { x: 1.01, z: HEX_SIZE })).toEqual({ col: 1, row: 0 });
  });

  it('draws shared edges once', () => {
    expect(segmentCount({ type: 'hex', width: 1, depth: 1 })).toBe(6);
    expect(segmentCount({ type: 'hex', width: 2, depth: 1 })).toBe(11);
    expect(segmentCount({ type: 'hex', width: 1, depth: 2 })).toBe(11);
  });

  it('includes the half-cell offset of odd rows in its width', () => {
    const extent = gridExtent({ type: 'hex', width: 3, depth: 2 });
    expect(extent.width).toBeCloseTo(3.5);
    expect(extent.depth).toBeCloseTo(HEX_SIZE * 3.5);
  });
});
