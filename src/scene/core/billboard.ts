// Cylindrical billboards (Engineering.md §7.3): a sprite turns only around the vertical axis
// to face the camera position, so it never tilts and its feet stay on the ground. The vertex
// shader in scene/sprites does the same maths per vertex; these functions are its reference.

type XZ = { x: number; z: number };
type XYZ = { x: number; y: number; z: number };

/** Yaw that turns a quad facing +Z toward the camera. */
export function cylindricalYaw(center: XZ, camera: XZ): number {
  return Math.atan2(camera.x - center.x, camera.z - center.z);
}

/** Rotate a local quad vertex around the vertical axis. */
export function rotateAroundY(p: XYZ, yaw: number): XYZ {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  return { x: p.x * c + p.z * s, y: p.y, z: -p.x * s + p.z * c };
}
