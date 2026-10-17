// Token hit tests that mirror how tokens are drawn (Engineering.md §8.3): upright tokens are
// rectangles turned toward the camera around the vertical axis; flat tokens are discs on the floor.

type V3 = { x: number; y: number; z: number };
export type Ray = { origin: V3; dir: V3 };

/** Distance along the ray to an upright, camera-facing rectangle standing on `base`, or null. */
export function hitUpright(
  ray: Ray,
  base: V3,
  width: number,
  height: number,
  camera: V3,
): number | null {
  let nx = camera.x - base.x;
  let nz = camera.z - base.z;
  const length = Math.hypot(nx, nz) || 1;
  nx /= length;
  nz /= length;
  const denom = ray.dir.x * nx + ray.dir.z * nz;
  if (Math.abs(denom) < 1e-6) return null;
  const t = ((base.x - ray.origin.x) * nx + (base.z - ray.origin.z) * nz) / denom;
  if (t < 0) return null;
  const hx = ray.origin.x + ray.dir.x * t - base.x;
  const hy = ray.origin.y + ray.dir.y * t - base.y;
  const hz = ray.origin.z + ray.dir.z * t - base.z;
  const across = hx * nz - hz * nx; // along the rectangle's horizontal edge
  return Math.abs(across) <= width / 2 && hy >= 0 && hy <= height ? t : null;
}

/** Distance along the ray to a horizontal disc centred on `center`, or null. */
export function hitFlat(ray: Ray, center: V3, radius: number): number | null {
  if (Math.abs(ray.dir.y) < 1e-6) return null;
  const t = (center.y - ray.origin.y) / ray.dir.y;
  if (t < 0) return null;
  const dx = ray.origin.x + ray.dir.x * t - center.x;
  const dz = ray.origin.z + ray.dir.z * t - center.z;
  return dx * dx + dz * dz <= radius * radius ? t : null;
}
