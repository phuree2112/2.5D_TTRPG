// Quality presets (Engineering.md §7.7) and the auto-quality governor (§7.7, Prompt §13).
//
// drei's PerformanceMonitor divides frames by wall-clock time, which reads an idle
// demand-rendered scene as a very slow device. This governor only measures frames that
// follow each other closely (a continuous rendering streak).

export type QualityPreset = 'low' | 'medium' | 'high';

export type QualitySettings = {
  dprCap: number;
  /** Real point lights in the light pool. */
  poolLights: number;
  /** Key-light shadow map size; 0 = no shadow map (blob shadows only). */
  shadowMapSize: number;
  postProcessing: boolean;
  antialias: boolean;
  ambientHz: number;
  particles: number;
};

export const QUALITY_PRESETS: Record<QualityPreset, QualitySettings> = {
  low: {
    dprCap: 1,
    poolLights: 2,
    shadowMapSize: 0,
    postProcessing: false,
    antialias: false,
    ambientHz: 20,
    particles: 100,
  },
  medium: {
    dprCap: 1.5,
    poolLights: 4,
    shadowMapSize: 1024,
    postProcessing: true,
    antialias: true,
    ambientHz: 30,
    particles: 400,
  },
  high: {
    dprCap: 2,
    poolLights: 8,
    shadowMapSize: 2048,
    postProcessing: true,
    antialias: true,
    ambientHz: 30,
    particles: 1000,
  },
};

const ORDER: QualityPreset[] = ['low', 'medium', 'high'];

export function initialPreset(env: { coarsePointer: boolean }): QualityPreset {
  return env.coarsePointer ? 'medium' : 'high';
}

// Frames further apart than this are not part of a continuous streak.
const STREAK_GAP_MS = 100;
const WINDOW_FRAMES = 30;
const WINDOWS = 4;
const AGREE = 3; // windows out of WINDOWS that must agree
const LOWER_FPS = 48;
const UPPER_FPS = 57;
const MAX_FLIPS = 3;

export type GovernorState = {
  preset: QualityPreset;
  locked: boolean;
  flips: number;
  lastChange: 'up' | 'down' | null;
  windowMs: number;
  windowFrames: number;
  averages: number[];
};

export function createGovernor(preset: QualityPreset): GovernorState {
  return {
    preset,
    locked: false,
    flips: 0,
    lastChange: null,
    windowMs: 0,
    windowFrames: 0,
    averages: [],
  };
}

export function governorStep(
  s: GovernorState,
  frameMs: number,
): { state: GovernorState; change?: 'up' | 'down' } {
  if (s.locked || frameMs > STREAK_GAP_MS || frameMs <= 0) return { state: s };

  const windowMs = s.windowMs + frameMs;
  const windowFrames = s.windowFrames + 1;
  if (windowFrames < WINDOW_FRAMES) return { state: { ...s, windowMs, windowFrames } };

  const averages = [...s.averages, (windowFrames * 1000) / windowMs].slice(-WINDOWS);
  const reset = { ...s, windowMs: 0, windowFrames: 0, averages };
  if (averages.length < WINDOWS) return { state: reset };

  const slow = averages.filter((fps) => fps < LOWER_FPS).length >= AGREE;
  const fast = averages.filter((fps) => fps >= UPPER_FPS).length >= AGREE;
  const index = ORDER.indexOf(s.preset);
  const change = slow && index > 0 ? 'down' : fast && index < ORDER.length - 1 ? 'up' : null;
  if (!change) return { state: reset };

  const flips = s.lastChange && s.lastChange !== change ? s.flips + 1 : s.flips;
  const preset = ORDER[index + (change === 'up' ? 1 : -1)]!;
  return {
    state: {
      ...reset,
      preset,
      averages: [],
      lastChange: change,
      flips,
      locked: flips >= MAX_FLIPS - 1,
    },
    change,
  };
}
