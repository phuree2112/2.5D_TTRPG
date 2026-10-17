import type { WebGLRenderer } from 'three';

export type DioramaDiagnostics = {
  ready: boolean;
  webgl2: boolean;
  renderer: WebGLRenderer['info'];
};

declare global {
  interface Window {
    /** Read by Playwright and the debug overlay (Engineering.md §17). */
    __DIORAMA_DIAGNOSTICS__?: DioramaDiagnostics;
  }
}
