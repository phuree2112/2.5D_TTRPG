import type { WebGLRenderer } from 'three';

export type DioramaDiagnostics = {
  ready: boolean;
  webgl2: boolean;
  renderer: WebGLRenderer['info'];
  /** Frames rendered since load (demand rendering: only when something changed). */
  frames: number;
  /** All passes of the previous frame (info.autoReset is off; reset once per frame). */
  lastFrame: { calls: number; triangles: number };
  preset: string;
  dpr: number;
  camera: {
    mode: 'orbit' | 'topdown';
    azimuth: number;
    polar: number;
    distance: number;
    zoom: number;
    target: [number, number, number];
  };
};

declare global {
  interface Window {
    /** Read by Playwright and the debug overlay (Engineering.md §17). */
    __DIORAMA_DIAGNOSTICS__?: DioramaDiagnostics;
  }
}
