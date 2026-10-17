import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { useSession } from '../../app/state/session';
import { useSettings } from '../../app/state/settings';
import { useReducedMotion } from '../../app/state/useReducedMotion';
import { QUALITY_PRESETS } from '../core/quality';
import { poolUniforms } from '../lighting/light-pool';

/**
 * Drives clouds, wind, water, particles, weather and flicker (Engineering.md §5.2). Renders at
 * 20–30 Hz only while Ambient motion is on and motion is not reduced; otherwise the scene is
 * still and draws nothing while idle (WCAG 2.2.2, battery). requestAnimationFrame also stops in
 * hidden tabs.
 */
export function AmbientTicker() {
  const ambient = useSettings((s) => s.ambientMotion);
  const reducedMotion = useReducedMotion();
  const hz = useSession((s) => QUALITY_PRESETS[s.preset].ambientHz);
  const invalidate = useThree((s) => s.invalidate);

  useEffect(() => {
    if (!ambient || reducedMotion) return;
    let raf = 0;
    let last = performance.now();
    let pending = 0;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      pending += Math.min(now - last, 100) / 1000;
      last = now;
      if (pending < 1 / hz) return;
      const wind = poolUniforms.uWind.value;
      poolUniforms.uAmbientTime.value += pending;
      poolUniforms.uCloudOffset.value.x += pending * 0.004 * (0.3 + wind);
      poolUniforms.uCloudOffset.value.y += pending * 0.0025 * (0.3 + wind);
      pending = 0;
      const d = window.__DIORAMA_DIAGNOSTICS__;
      if (d) d.ambientTicks = (d.ambientTicks ?? 0) + 1;
      invalidate();
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [ambient, reducedMotion, hz, invalidate]);

  return null;
}
