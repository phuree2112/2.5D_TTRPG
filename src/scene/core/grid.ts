// Grid math (Engineering.md §6). 1 cell = 1 world unit; Y is up, so the grid lies in X/Z.
// Hex grids are pointy-top with odd rows shifted right ("odd-r" offset), using the axial
// conversions from Red Blob Games' "Hexagonal Grids".

export type GridSpec = { type: 'square' | 'hex'; width: number; depth: number };
export type Cell = { col: number; row: number };
export type Vec2 = { x: number; z: number };

/** Hex circumradius that makes a hex exactly 1 unit wide across its flat sides. */
export const HEX_SIZE = 1 / Math.sqrt(3);
const HEX_ROW_STEP = 1.5 * HEX_SIZE;

export function cellCenter(spec: GridSpec, cell: Cell): Vec2 {
  if (spec.type === 'square') return { x: cell.col + 0.5, z: cell.row + 0.5 };
  return {
    x: cell.col + 0.5 + (cell.row & 1 ? 0.5 : 0),
    z: HEX_SIZE + cell.row * HEX_ROW_STEP,
  };
}

function inside(spec: GridSpec, cell: Cell): boolean {
  return cell.col >= 0 && cell.row >= 0 && cell.col < spec.width && cell.row < spec.depth;
}

function hexAtPoint(p: Vec2): Cell {
  // Fractional axial coordinates relative to the centre of hex (0, 0).
  const x = p.x - 0.5;
  const z = p.z - HEX_SIZE;
  const q = ((Math.sqrt(3) / 3) * x - z / 3) / HEX_SIZE;
  const r = ((2 / 3) * z) / HEX_SIZE;
  // Cube rounding: round all three, then fix the one with the largest error.
  const s = -q - r;
  let rq = Math.round(q);
  let rr = Math.round(r);
  const rs = Math.round(s);
  const dq = Math.abs(rq - q);
  const dr = Math.abs(rr - r);
  const ds = Math.abs(rs - s);
  if (dq > dr && dq > ds) rq = -rr - rs;
  else if (dr > ds) rr = -rq - rs;
  return { col: rq + (rr - (rr & 1)) / 2, row: rr };
}

export function worldToCell(spec: GridSpec, p: Vec2): Cell | null {
  const cell =
    spec.type === 'square' ? { col: Math.floor(p.x), row: Math.floor(p.z) } : hexAtPoint(p);
  return inside(spec, cell) ? cell : null;
}

export function gridExtent(spec: GridSpec): { width: number; depth: number } {
  if (spec.type === 'square') return { width: spec.width, depth: spec.depth };
  return {
    width: spec.width + (spec.depth > 1 ? 0.5 : 0),
    depth: 2 * HEX_SIZE + (spec.depth - 1) * HEX_ROW_STEP,
  };
}

/** Line segments as [x1, z1, x2, z2, …]; shared hex edges appear once. */
export function gridLineSegments(spec: GridSpec): Float32Array {
  const out: number[] = [];
  if (spec.type === 'square') {
    for (let x = 0; x <= spec.width; x++) out.push(x, 0, x, spec.depth);
    for (let z = 0; z <= spec.depth; z++) out.push(0, z, spec.width, z);
    return new Float32Array(out);
  }

  const seen = new Set<string>();
  const key = (x: number, z: number) => `${x.toFixed(4)},${z.toFixed(4)}`;
  for (let row = 0; row < spec.depth; row++) {
    for (let col = 0; col < spec.width; col++) {
      const c = cellCenter(spec, { col, row });
      const corners = Array.from({ length: 6 }, (_, i) => {
        const angle = (Math.PI / 180) * (60 * i - 30);
        return { x: c.x + HEX_SIZE * Math.cos(angle), z: c.z + HEX_SIZE * Math.sin(angle) };
      });
      corners.forEach((a, i) => {
        const b = corners[(i + 1) % 6]!;
        const ka = key(a.x, a.z);
        const kb = key(b.x, b.z);
        const edge = ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;
        if (seen.has(edge)) return;
        seen.add(edge);
        out.push(a.x, a.z, b.x, b.z);
      });
    }
  }
  return new Float32Array(out);
}
