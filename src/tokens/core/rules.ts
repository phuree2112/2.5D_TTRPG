// Token rules (Prompt §4): sizes, footprints, snapping, distance and timing. Pure: no React or three.

import { cellCenter, worldToCell } from '../../scene/core/grid';
import type { Cell, GridSpec, Vec2 } from '../../scene/core/grid';

export type SizeCategory = 'tiny' | 'small' | 'medium' | 'large' | 'huge' | 'gargantuan';
export type DiagonalRule = 'chebyshev' | 'alternating' | 'euclidean';
export type Hp = { current: number; max: number; temp: number };
export type HpStatus = 'healthy' | 'bloodied' | 'critical' | 'down';

export const SIZE_CELLS: Record<SizeCategory, number> = {
  tiny: 0.5,
  small: 1,
  medium: 1,
  large: 2,
  huge: 3,
  gargantuan: 4,
};

/** Cells a token occupies along one side (tiny tokens still take a cell for snapping). */
const span = (size: SizeCategory) => Math.max(1, SIZE_CELLS[size]);

/** 90 % of the occupied cells, so neighbouring rings never merge (Visual.md §3.1). */
export function tokenDiameter(size: SizeCategory): number {
  return SIZE_CELLS[size] * 0.9;
}

/** World centre of a token whose footprint starts at `cell` (its top-left cell). */
export function footprintCenter(grid: GridSpec, cell: Cell, size: SizeCategory): Vec2 {
  if (grid.type === 'hex') return cellCenter(grid, cell);
  const n = span(size);
  return { x: cell.col + n / 2, z: cell.row + n / 2 };
}

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

/** The footprint cell for a token dropped at `point`, kept fully on the map. */
export function snapCell(grid: GridSpec, point: Vec2, size: SizeCategory): Cell {
  if (grid.type === 'hex') {
    const inside = {
      x: clamp(point.x, 0.5, grid.width - 0.01),
      z: clamp(point.z, 0.6, grid.depth * 0.866 - 0.01),
    };
    return worldToCell(grid, inside) ?? { col: 0, row: 0 };
  }
  const n = span(size);
  const anchor = (v: number) => (n % 2 === 1 ? Math.floor(v) - (n - 1) / 2 : Math.round(v - n / 2));
  return {
    col: clamp(anchor(point.x), 0, grid.width - n),
    row: clamp(anchor(point.z), 0, grid.depth - n),
  };
}

function toAxial({ col, row }: Cell) {
  return { q: col - (row - (row & 1)) / 2, r: row };
}

/** Distance in cells. Square grids follow the room's diagonal rule; hex grids count steps. */
export function gridDistance(grid: GridSpec, a: Cell, b: Cell, rule: DiagonalRule): number {
  if (grid.type === 'hex') {
    const p = toAxial(a);
    const q = toAxial(b);
    const dq = q.q - p.q;
    const dr = q.r - p.r;
    return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2;
  }
  const dx = Math.abs(b.col - a.col);
  const dz = Math.abs(b.row - a.row);
  if (rule === 'euclidean') return Math.hypot(dx, dz);
  if (rule === 'chebyshev') return Math.max(dx, dz);
  const diagonal = Math.min(dx, dz);
  return Math.max(dx, dz) - diagonal + diagonal + Math.floor(diagonal / 2);
}

export function formatDistance(cells: number, unitsPerCell = 5, unit = 'ft'): string {
  const value = Math.round(cells * unitsPerCell * 10) / 10;
  return `${value} ${unit}`;
}

/** 6 cells per second, clamped to 200–1200 ms (Visual.md §8.2). */
export function moveDurationMs(cells: number): number {
  return clamp(Math.round((cells / 6) * 1000), 200, 1200);
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

export function hpStatus(hp: Hp): HpStatus {
  if (hp.current <= 0) return 'down';
  const ratio = hp.current / Math.max(hp.max, 1);
  if (ratio > 0.5) return 'healthy';
  if (ratio > 0.25) return 'bloodied';
  return 'critical';
}

/** Square source rectangle for the circular crop, in source pixels (Prompt §4.2). */
export function cropRect(
  width: number,
  height: number,
  zoom: number,
  offset: { x: number; y: number },
): { x: number; y: number; size: number } {
  const size = Math.round(Math.min(width, height) / Math.max(zoom, 1));
  return {
    x: clamp(Math.round(width / 2 + offset.x - size / 2), 0, width - size),
    y: clamp(Math.round(height / 2 + offset.y - size / 2), 0, height - size),
    size,
  };
}
