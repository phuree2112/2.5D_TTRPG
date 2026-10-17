// Two-finger touch gestures (Prompt §3): twist = rotate, pinch = zoom, both fingers
// dragging vertically together = tilt. The first component to pass its threshold wins
// and stays locked for the rest of the gesture (Engineering.md §8.2).

export type Point = { x: number; y: number };
export type FingerPair = [Point, Point];
export type TwoFingerMode = 'pending' | 'twist' | 'pinch' | 'tilt';

const LOCK_PX = 8;
const LOCK_ANGLE = (6 * Math.PI) / 180;

const span = ([a, b]: FingerPair) => Math.hypot(b.x - a.x, b.y - a.y);
const heading = ([a, b]: FingerPair) => Math.atan2(b.y - a.y, b.x - a.x);
const centroid = ([a, b]: FingerPair): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

function angleBetween(from: number, to: number): number {
  let d = to - from;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return d;
}

export function twoFingerDelta(
  prev: FingerPair,
  current: FingerPair,
): { angle: number; scale: number; dx: number; dy: number } {
  const from = centroid(prev);
  const to = centroid(current);
  return {
    angle: angleBetween(heading(prev), heading(current)),
    scale: span(current) / Math.max(span(prev), 1),
    dx: to.x - from.x,
    dy: to.y - from.y,
  };
}

export function classifyTwoFinger(start: FingerPair, current: FingerPair): TwoFingerMode {
  const delta = twoFingerDelta(start, current);
  const radius = span(start) / 2;

  // Compare all three in pixels of finger travel.
  const twistPx = Math.abs(delta.angle) >= LOCK_ANGLE ? Math.abs(delta.angle) * radius : 0;
  const pinchPx = Math.abs(span(current) - span(start));
  const dy0 = current[0].y - start[0].y;
  const dy1 = current[1].y - start[1].y;
  const together = Math.sign(dy0) === Math.sign(dy1) && dy0 !== 0;
  const tiltPx = together ? Math.min(Math.abs(dy0), Math.abs(dy1)) : 0;

  const best = Math.max(twistPx, pinchPx, tiltPx);
  if (best < LOCK_PX) return 'pending';
  if (best === twistPx) return 'twist';
  if (best === pinchPx) return 'pinch';
  return 'tilt';
}
