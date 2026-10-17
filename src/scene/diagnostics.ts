import { useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { WebGLRenderer } from 'three';
import type { DioramaDiagnostics } from './diagnostics-global';
import { useSession } from '../app/state/session';

export function publishDiagnostics(gl: WebGLRenderer): DioramaDiagnostics {
  // Count every pass of a frame together (Engineering.md §17).
  gl.info.autoReset = false;
  const diagnostics: DioramaDiagnostics = {
    ready: true,
    webgl2: gl.capabilities.isWebGL2,
    renderer: gl.info,
    frames: 0,
    lastFrame: { calls: 0, triangles: 0 },
    preset: useSession.getState().preset,
    dpr: gl.getPixelRatio(),
    camera: { mode: 'orbit', azimuth: 0, polar: 0, distance: 0, zoom: 1, target: [0, 0, 0] },
  };
  window.__DIORAMA_DIAGNOSTICS__ = diagnostics;
  return diagnostics;
}

/** Runs first in every frame: records the previous frame's counters, then resets them. */
export function SceneDiagnostics() {
  const preset = useSession((s) => s.preset);
  const dpr = useThree((s) => s.viewport.dpr);

  useEffect(() => {
    const d = window.__DIORAMA_DIAGNOSTICS__;
    if (!d) return;
    d.preset = preset;
    d.dpr = dpr;
  }, [preset, dpr]);

  useFrame(({ gl }) => {
    const d = window.__DIORAMA_DIAGNOSTICS__;
    if (!d) return;
    d.lastFrame.calls = gl.info.render.calls;
    d.lastFrame.triangles = gl.info.render.triangles;
    d.frames++;
    gl.info.reset();
  }, -1000);

  return null;
}

/** Stop rendering while the tab is hidden (Engineering.md §5.2). */
export function PauseWhenHidden() {
  const setFrameloop = useThree((s) => s.setFrameloop);
  const invalidate = useThree((s) => s.invalidate);

  useEffect(() => {
    const onChange = () => {
      if (document.visibilityState === 'hidden') {
        setFrameloop('never');
      } else {
        setFrameloop('demand');
        invalidate();
      }
    };
    document.addEventListener('visibilitychange', onChange);
    return () => document.removeEventListener('visibilitychange', onChange);
  }, [setFrameloop, invalidate]);

  return null;
}
