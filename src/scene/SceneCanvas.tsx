import { Canvas } from '@react-three/fiber';
import { publishDiagnostics } from './diagnostics';

// Empty diorama table for Phase 1. Demand rendering from the start (Engineering.md §5.2).
export default function SceneCanvas() {
  return (
    <Canvas
      frameloop="demand"
      dpr={[1, 1.5]}
      camera={{ fov: 30, position: [8, 9, 8], near: 0.1, far: 200 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => publishDiagnostics(gl)}
      aria-label="Game table"
      role="img"
    >
      <color attach="background" args={['#15222a']} />
    </Canvas>
  );
}
