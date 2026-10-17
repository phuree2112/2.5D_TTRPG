import { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { PauseWhenHidden, publishDiagnostics, SceneDiagnostics } from './diagnostics';
import { QUALITY_PRESETS } from './core/quality';
import { useSession } from '../app/state/session';
import { DemoTable } from './environment/DemoTable';
import { CameraRig } from './camera/CameraRig';
import { QualityGovernor } from './quality/QualityGovernor';

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
      <CameraRig />
    </Canvas>
  );
}
