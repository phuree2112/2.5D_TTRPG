import { useEffect, useState } from 'react';

const deg = (radians: number) => Math.round((radians * 180) / Math.PI);

/** `?debug=1`: renderer counters (Prompt §13). Polls twice a second, never per frame. */
export function DebugOverlay() {
  const [lines, setLines] = useState<string[]>(['Waiting for the scene…']);

  useEffect(() => {
    let lastFrames = 0;
    let lastTime = performance.now();
    const id = window.setInterval(() => {
      const d = window.__DIORAMA_DIAGNOSTICS__;
      if (!d) return;
      const now = performance.now();
      const fps = ((d.frames - lastFrames) * 1000) / (now - lastTime);
      lastFrames = d.frames;
      lastTime = now;
      setLines([
        `Rendered ${fps.toFixed(0)} fps (on demand)`,
        `Draw calls ${d.lastFrame.calls}  Triangles ${d.lastFrame.triangles.toLocaleString()}`,
        `Preset ${d.preset}  DPR ${d.dpr.toFixed(2)}`,
        `Camera ${d.camera.mode}  azimuth ${deg(d.camera.azimuth)}°  polar ${deg(d.camera.polar)}°`,
        `Real lights ${d.lights?.real ?? 0}  Fake lights ${d.lights?.fake ?? 0}  Visible levels 1`,
        `Post-processing ${d.postfx ? 'on' : 'off'}`,
      ]);
    }, 500);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div
      aria-label="Debug information"
      className="pointer-events-none absolute top-16 left-1/2 z-30 -translate-x-1/2 rounded-button bg-ink/80 px-3 py-2 text-xs text-bone tabular-nums"
    >
      {lines.map((line) => (
        <p key={line}>{line}</p>
      ))}
    </div>
  );
}
