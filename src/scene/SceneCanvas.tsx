import { lazy, Suspense, useState } from 'react';
import { AgXToneMapping } from 'three';
import { Canvas } from '@react-three/fiber';
import { PauseWhenHidden, publishDiagnostics, SceneDiagnostics } from './diagnostics';
import { QUALITY_PRESETS } from './core/quality';
import { useSession } from '../app/state/session';
import { DemoTable } from './environment/DemoTable';
import { CameraRig } from './camera/CameraRig';
import { QualityGovernor } from './quality/QualityGovernor';
import { TokenLayer } from '../tokens/render/TokenLayer';
import { DragHighlight } from '../tokens/render/DragHighlight';
import { TokenInteraction } from '../tokens/interaction/TokenInteraction';
import { AmbientTicker } from './environment/AmbientTicker';
import { FinalRender } from './overlay';

// Post-processing is its own chunk: Low quality never downloads it (Engineering.md §17).
const PostFX = lazy(() => import('./postfx/PostFX'));

// Demand rendering from the start (Engineering.md §5.2).
export default function SceneCanvas() {
  const preset = useSession((s) => s.preset);
  // Antialiasing is fixed when the WebGL context is created, so it follows the starting preset.
  const [antialias] = useState(() => QUALITY_PRESETS[useSession.getState().preset].antialias);

  return (
    <Canvas
      frameloop="demand"
      dpr={[1, QUALITY_PRESETS[preset].dprCap]}
      shadows="percentage"
      gl={{ antialias, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        gl.shadowMap.autoUpdate = false;
        // Tone mapping without the composer (Low). The composer takes over on Medium/High.
        gl.toneMapping = AgXToneMapping;
        publishDiagnostics(gl);
      }}
      aria-label="Game table"
      role="img"
    >
      <color attach="background" args={['#15222a']} />
      <SceneDiagnostics />
      <PauseWhenHidden />
      <QualityGovernor />
      <DemoTable />
      <TokenLayer />
      <DragHighlight />
      <TokenInteraction />
      <CameraRig />
      <AmbientTicker />
      <FinalRender />
      {QUALITY_PRESETS[preset].postProcessing && (
        <Suspense fallback={null}>
          <PostFX />
        </Suspense>
      )}
    </Canvas>
  );
}
