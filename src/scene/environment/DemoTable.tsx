import { useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { Object3D } from 'three';
import { cellCenter, gridExtent, gridLineSegments } from '../core/grid';
import type { GridSpec } from '../core/grid';
import { QUALITY_PRESETS } from '../core/quality';
import { useSettings } from '../../app/state/settings';
import { useSession } from '../../app/state/session';

// Placeholder diorama for Phase 2: a board on a table with a grid and a few landmarks, so
// rotation and tilt are easy to judge. Terrain, props and real lighting arrive in Phases 4–5.

const BOARD_THICKNESS = 0.4;
const SUN_ELEVATION = (50 * Math.PI) / 180;
// Back-left of the default camera, so shadows fall toward the viewer (classic diorama light).
const SUN_AZIMUTH = (-110 * Math.PI) / 180;

export function DemoTable() {
  const grid = useSettings((s) => s.grid);
  const shadowMapSize = useSession((s) => QUALITY_PRESETS[s.preset].shadowMapSize);
  const extent = gridExtent(grid);
  const cx = extent.width / 2;
  const cz = extent.depth / 2;

  // Shadow maps render only when something that casts shadows changes (Engineering.md §7.4).
  const get = useThree((s) => s.get);
  useEffect(() => {
    const { gl, invalidate } = get();
    gl.shadowMap.needsUpdate = true;
    invalidate();
  }, [get, grid, shadowMapSize]);

  return (
    <>
      <Lights
        cx={cx}
        cz={cz}
        reach={Math.max(extent.width, extent.depth)}
        shadowMapSize={shadowMapSize}
      />

      {/* Table top */}
      <mesh rotation-x={-Math.PI / 2} position={[cx, -BOARD_THICKNESS, cz]} receiveShadow>
        <planeGeometry args={[extent.width + 40, extent.depth + 40]} />
        <meshLambertMaterial color="#2a2420" />
      </mesh>

      {/* Board */}
      <mesh position={[cx, -BOARD_THICKNESS / 2, cz]} receiveShadow castShadow>
        <boxGeometry args={[extent.width + 0.6, BOARD_THICKNESS, extent.depth + 0.6]} />
        <meshLambertMaterial color="#56623f" />
      </mesh>

      <GridLines grid={grid} />
      <Landmarks grid={grid} />
    </>
  );
}

function Lights({
  cx,
  cz,
  reach,
  shadowMapSize,
}: {
  cx: number;
  cz: number;
  reach: number;
  shadowMapSize: number;
}) {
  const target = useMemo(() => new Object3D(), []);
  const distance = reach * 1.2;
  const position: [number, number, number] = [
    cx + Math.cos(SUN_ELEVATION) * Math.sin(SUN_AZIMUTH) * distance,
    Math.sin(SUN_ELEVATION) * distance,
    cz + Math.cos(SUN_ELEVATION) * Math.cos(SUN_AZIMUTH) * distance,
  ];
  const half = reach / 2 + 2;

  return (
    <>
      <hemisphereLight args={['#9cc7e8', '#6b5a3e', 1.4]} />
      <primitive object={target} position={[cx, 0, cz]} />
      {/* Remount when the shadow map size changes: three.js allocates a shadow map only once. */}
      <directionalLight
        key={shadowMapSize}
        color="#ffe2b0"
        intensity={2.6}
        position={position}
        target={target}
        castShadow={shadowMapSize > 0}
        shadow-mapSize={[shadowMapSize || 512, shadowMapSize || 512]}
        shadow-camera-left={-half}
        shadow-camera-right={half}
        shadow-camera-top={half}
        shadow-camera-bottom={-half}
        shadow-camera-near={1}
        shadow-camera-far={distance * 2}
        shadow-normalBias={0.03}
      />
    </>
  );
}

function GridLines({ grid }: { grid: GridSpec }) {
  const positions = useMemo(() => {
    const segments = gridLineSegments(grid);
    const xyz = new Float32Array((segments.length / 2) * 3);
    for (let i = 0, j = 0; i < segments.length; i += 2, j += 3) {
      xyz[j] = segments[i]!;
      xyz[j + 1] = 0.005;
      xyz[j + 2] = segments[i + 1]!;
    }
    return xyz;
  }, [grid]);

  return (
    <lineSegments key={`${grid.type}-${grid.width}-${grid.depth}`}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <lineBasicMaterial color="#eee8dc" transparent opacity={0.22} depthWrite={false} />
    </lineSegments>
  );
}

function Landmarks({ grid }: { grid: GridSpec }) {
  const at = (col: number, row: number) => {
    const c = cellCenter(grid, { col, row });
    return [c.x, 0, c.z] as const;
  };
  const last = { col: grid.width - 2, row: grid.depth - 2 };
  const mid = { col: Math.floor(grid.width / 2), row: Math.floor(grid.depth / 2) };
  const corners = [at(1, 1), at(last.col, 1), at(1, last.row), at(last.col, last.row)];

  return (
    <group>
      {corners.map(([x, , z], i) => (
        <mesh key={i} position={[x, 0.8, z]} castShadow receiveShadow>
          <boxGeometry args={[0.7, 1.6, 0.7]} />
          <meshLambertMaterial color="#8a8f86" />
        </mesh>
      ))}

      {/* Tree */}
      <group position={at(mid.col - 4, mid.row - 3)}>
        <mesh position={[0, 0.4, 0]} castShadow>
          <cylinderGeometry args={[0.12, 0.16, 0.8, 6]} />
          <meshLambertMaterial color="#8a5a36" />
        </mesh>
        <mesh position={[0, 1.3, 0]} castShadow>
          <coneGeometry args={[0.7, 1.4, 7]} />
          <meshLambertMaterial color="#4f7a3a" />
        </mesh>
      </group>

      {/* Crates */}
      {[
        [mid.col + 3, mid.row + 2],
        [mid.col + 4, mid.row + 2],
      ].map(([col, row]) => (
        <mesh
          key={`${col}-${row}`}
          position={[at(col!, row!)[0], 0.3, at(col!, row!)[2]]}
          castShadow
        >
          <boxGeometry args={[0.6, 0.6, 0.6]} />
          <meshLambertMaterial color="#a0703f" />
        </mesh>
      ))}

      {/* Campfire marker */}
      <mesh position={[at(mid.col, mid.row)[0], 0.25, at(mid.col, mid.row)[2]]}>
        <coneGeometry args={[0.25, 0.5, 6]} />
        <meshLambertMaterial color="#ff9a3c" emissive="#ff7a2e" emissiveIntensity={1.5} />
      </mesh>
    </group>
  );
}
