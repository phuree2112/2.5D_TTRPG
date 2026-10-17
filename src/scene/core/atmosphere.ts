// Moods, time of day, colour grade, light budget and flicker (Visual.md §4, Prompt §5–6). Pure.
// Colours are sRGB in 0..1. Intensities are three.js units, calibrated on the demo table.

export type RGB = [number, number, number];

export type Grade = {
  /** −30..30: negative is cooler (blue), positive warmer (orange). */
  temperature: number;
  saturation: number;
  contrast: number;
  /** Added to dark tones, fading out toward highlights. */
  shadows: RGB;
};

export type Mood = {
  key: { color: RGB; intensity: number; elevation: number };
  hemi: { sky: RGB; ground: RGB; intensity: number };
  fog: { color: RGB; density: number };
  sky: { zenith: RGB; horizon: RGB; clouds: number; stars: number };
  grade: Grade;
  bloom: number;
  vignette: number;
  /** Ambient particles: dust in daylight, fireflies at night. */
  particles: 'dust' | 'fireflies';
};

export type MoodId = 'warmDay' | 'dusk' | 'night' | 'dungeon' | 'cold';

const rgb = (hex: string): RGB => [
  parseInt(hex.slice(1, 3), 16) / 255,
  parseInt(hex.slice(3, 5), 16) / 255,
  parseInt(hex.slice(5, 7), 16) / 255,
];
const scaled = (hex: string, k: number): RGB => rgb(hex).map((v) => v * k) as RGB;

export const MOODS: Record<MoodId, Mood> = {
  warmDay: {
    key: { color: rgb('#ffe2b0'), intensity: 2.8, elevation: 50 },
    hemi: { sky: rgb('#9cc7e8'), ground: rgb('#6b5a3e'), intensity: 1.4 },
    fog: { color: rgb('#cfe0e8'), density: 0.008 },
    sky: { zenith: rgb('#5e9bd6'), horizon: rgb('#cfe0e8'), clouds: 0.8, stars: 0 },
    grade: { temperature: 8, saturation: 1.1, contrast: 1.05, shadows: scaled('#1e3a4a', 0.3) },
    bloom: 0.4,
    vignette: 0.25,
    particles: 'dust',
  },
  dusk: {
    key: { color: rgb('#ff9a5a'), intensity: 1.9, elevation: 12 },
    hemi: { sky: rgb('#6e6fa8'), ground: rgb('#3b2a2e'), intensity: 1.0 },
    fog: { color: rgb('#a57585'), density: 0.01 },
    sky: { zenith: rgb('#3c3f7a'), horizon: rgb('#f29a6b'), clouds: 0.7, stars: 0.2 },
    grade: { temperature: 15, saturation: 1.15, contrast: 1.1, shadows: scaled('#2b2147', 0.35) },
    bloom: 0.7,
    vignette: 0.35,
    particles: 'dust',
  },
  night: {
    key: { color: rgb('#8fa8ff'), intensity: 0.8, elevation: 40 },
    hemi: { sky: rgb('#2a3d66'), ground: rgb('#14161e'), intensity: 1.1 },
    fog: { color: rgb('#121a2e'), density: 0.018 },
    sky: { zenith: rgb('#0b1426'), horizon: rgb('#1b2a4a'), clouds: 0.25, stars: 1 },
    grade: { temperature: -12, saturation: 0.85, contrast: 1.15, shadows: scaled('#0b1430', 0.4) },
    bloom: 1.0,
    vignette: 0.45,
    particles: 'fireflies',
  },
  dungeon: {
    key: { color: rgb('#ffffff'), intensity: 0, elevation: 60 },
    hemi: { sky: rgb('#3a332c'), ground: rgb('#0e0c0a'), intensity: 0.7 },
    fog: { color: rgb('#0e0b09'), density: 0.028 },
    sky: { zenith: rgb('#0a0908'), horizon: rgb('#1a1512'), clouds: 0, stars: 0 },
    grade: { temperature: 5, saturation: 0.9, contrast: 1.2, shadows: [0, 0, 0] },
    bloom: 0.9,
    vignette: 0.5,
    particles: 'dust',
  },
  cold: {
    key: { color: rgb('#ddebff'), intensity: 2.3, elevation: 30 },
    hemi: { sky: rgb('#bfd6ea'), ground: rgb('#8c9aa8'), intensity: 1.5 },
    fog: { color: rgb('#dce6ee'), density: 0.016 },
    sky: { zenith: rgb('#8fb3d9'), horizon: rgb('#e4ecf2'), clouds: 0.9, stars: 0 },
    grade: { temperature: -10, saturation: 0.8, contrast: 0.95, shadows: scaled('#1c2a38', 0.4) },
    bloom: 0.3,
    vignette: 0.2,
    particles: 'dust',
  },
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpRgb = (a: RGB, b: RGB, t: number): RGB => [
  lerp(a[0], b[0], t),
  lerp(a[1], b[1], t),
  lerp(a[2], b[2], t),
];

export function blendMoods(a: Mood, b: Mood, t: number): Mood {
  return {
    key: {
      color: lerpRgb(a.key.color, b.key.color, t),
      intensity: lerp(a.key.intensity, b.key.intensity, t),
      elevation: lerp(a.key.elevation, b.key.elevation, t),
    },
    hemi: {
      sky: lerpRgb(a.hemi.sky, b.hemi.sky, t),
      ground: lerpRgb(a.hemi.ground, b.hemi.ground, t),
      intensity: lerp(a.hemi.intensity, b.hemi.intensity, t),
    },
    fog: {
      color: lerpRgb(a.fog.color, b.fog.color, t),
      density: lerp(a.fog.density, b.fog.density, t),
    },
    sky: {
      zenith: lerpRgb(a.sky.zenith, b.sky.zenith, t),
      horizon: lerpRgb(a.sky.horizon, b.sky.horizon, t),
      clouds: lerp(a.sky.clouds, b.sky.clouds, t),
      stars: lerp(a.sky.stars, b.sky.stars, t),
    },
    grade: {
      temperature: lerp(a.grade.temperature, b.grade.temperature, t),
      saturation: lerp(a.grade.saturation, b.grade.saturation, t),
      contrast: lerp(a.grade.contrast, b.grade.contrast, t),
      shadows: lerpRgb(a.grade.shadows, b.grade.shadows, t),
    },
    bloom: lerp(a.bloom, b.bloom, t),
    vignette: lerp(a.vignette, b.vignette, t),
    particles: t < 0.5 ? a.particles : b.particles,
  };
}

// Time-of-day keyframes (hours). Between two frames the moods blend (Visual.md §4.1).
const DAY: [number, MoodId][] = [
  [0, 'night'],
  [5, 'night'],
  [7, 'dusk'],
  [9, 'warmDay'],
  [17, 'warmDay'],
  [20, 'dusk'],
  [22, 'night'],
  [24, 'night'],
];

export function moodAt(hours: number): Mood {
  const t = ((hours % 24) + 24) % 24;
  for (let i = 0; i < DAY.length - 1; i++) {
    const [h0, m0] = DAY[i]!;
    const [h1, m1] = DAY[i + 1]!;
    if (t >= h0 && t <= h1) return blendMoods(MOODS[m0], MOODS[m1], (t - h0) / (h1 - h0));
  }
  return MOODS.night;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/**
 * Power S-curve around mid-grey. Unlike a straight line through 0.5 it never clips: the darks
 * keep their detail, which matters at night when most of the image sits below 0.2.
 */
function contrastCurve(v: number, contrast: number): number {
  const x = clamp01(v);
  return x < 0.5 ? 0.5 * (2 * x) ** contrast : 1 - 0.5 * (2 * (1 - x)) ** contrast;
}

/** Colour grade applied to every LUT entry (display space). */
export function gradeColor([r0, g0, b0]: RGB, grade: Grade): RGB {
  // White balance as channel gains, so black stays black.
  const k = grade.temperature / 100;
  let r = r0 * (1 + k * 0.3);
  let g = g0 * (1 + k * 0.05);
  let b = b0 * (1 - k * 0.3);
  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  r = luma + (r - luma) * grade.saturation;
  g = luma + (g - luma) * grade.saturation;
  b = luma + (b - luma) * grade.saturation;
  r = contrastCurve(r, grade.contrast);
  g = contrastCurve(g, grade.contrast);
  b = contrastCurve(b, grade.contrast);
  const weight = (1 - clamp01(luma)) ** 2;
  return [
    clamp01(r + grade.shadows[0] * weight),
    clamp01(g + grade.shadows[1] * weight),
    clamp01(b + grade.shadows[2] * weight),
  ];
}

/** Ids of the `count` lights nearest the camera focus; the rest render as fake lights. */
export function selectLights(
  lights: readonly { id: string; x: number; z: number }[],
  focus: { x: number; z: number },
  count: number,
): string[] {
  return [...lights]
    .map((l) => ({ id: l.id, d: (l.x - focus.x) ** 2 + (l.z - focus.z) ** 2 }))
    .sort((a, b) => a.d - b.d)
    .slice(0, count)
    .map((l) => l.id);
}

/** Torch flicker: three detuned sines, ±amount around 1, different per seed. */
export function flicker(time: number, seed: number, amount: number, hz: number): number {
  if (amount === 0) return 1;
  const w = time * hz * Math.PI * 2;
  const n =
    Math.sin(w * 0.5 + seed * 1.7) * 0.5 +
    Math.sin(w * 0.23 + seed * 3.1) * 0.3 +
    Math.sin(w * 1.31 + seed * 0.7) * 0.2;
  return 1 + amount * n;
}
