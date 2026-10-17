// Camera math for the 2.5D orbit camera (Prompt §3, Engineering.md §8.1).

const STEP = Math.PI / 4;
const EPSILON = 1e-6;

const degrees = (d: number) => (d * Math.PI) / 180;

/** Polar angle limits measured from straight down (Settings can change them). */
export const POLAR_LIMITS = { min: degrees(25), max: degrees(75) };
export const DEFAULT_POLAR = degrees(55);
export const DEFAULT_AZIMUTH = Math.PI / 4;
export const FIELD_OF_VIEW = 30;

/** Q/E: the next 45° mark in the given direction. Azimuth is continuous (no wrapping). */
export function stepAzimuth(azimuth: number, direction: 1 | -1): number {
  const steps = azimuth / STEP;
  const nearest = Math.round(steps);
  const onMark = Math.abs(steps - nearest) < EPSILON;
  if (onMark) return (nearest + direction) * STEP;
  return (direction > 0 ? Math.ceil(steps) : Math.floor(steps)) * STEP;
}

/** The 45° snap button: the nearest 45° mark. */
export function snapAzimuth(azimuth: number): number {
  return Math.round(azimuth / STEP) * STEP;
}
