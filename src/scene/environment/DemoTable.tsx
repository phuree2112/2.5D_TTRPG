import { useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { Object3D } from 'three';
import { cellCenter, gridExtent, gridLineSegments } from '../core/grid';
import { grassTexture, rng, stoneTexture, woodTexture } from '../core/sprite-art';
import type { SpriteKind } from '../core/sprite-art';
import { SpriteBatch } from '../sprites/SpriteBatch';
import type { SpriteItem } from '../sprites/SpriteBatch';
import { createTileTexture } from '../sprites/textures';
import type { GridSpec } from '../core/grid';
import { QUALITY_PRESETS } from '../core/quality';
import { useSettings } from '../../app/state/settings';
import { useSession } from '../../app/state/session';

// Demo diorama: a pixel-grass board on a table, with nature sprites, stone pillars and crates.
// Terrain painting and props from the library arrive in Phase 5.

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

      {/* Board: soil sides, pixel grass on top */}
      <mesh position={[cx, -BOARD_THICKNESS / 2 - 0.001, cz]} receiveShadow castShadow>
        <boxGeometry args={[extent.width + 0.6, BOARD_THICKNESS, extent.depth + 0.6]} />
        <meshLambertMaterial color="#4a3a28" />
      </mesh>
      <Grass width={extent.width + 0.6} depth={extent.depth + 0.6} x={cx} z={cz} />

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

function Grass({ width, depth, x, z }: { width: number; depth: number; x: number; z: number }) {
  // The grass tile covers 4 × 4 cells (24 px per cell, matching the sprites).
  const texture = useMemo(
    () => createTileTexture(grassTexture(), width / 4, depth / 4),
    [width, depth],
  );
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <mesh rotation-x={-Math.PI / 2} position={[x, 0, z]} receiveShadow>
      <planeGeometry args={[width, depth]} />
      <meshLambertMaterial map={texture} />
    </mesh>
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
      <lineBasicMaterial color="#eee8dc" transparent opacity={0.13} depthWrite={false} />
    </lineSegments>
  );
}

// Nature and campfire as camera-facing pixel sprites; stone and wood stay 3D with pixel
// textures. That mix is what reads as HD-2D (Visual.md §2.1).
function Landmarks({ grid }: { grid: GridSpec }) {
  const textures = useMemo(
    () => ({
      stone: createTileTexture(stoneTexture(), 1, 2),
      wood: createTileTexture(woodTexture()),
    }),
    [],
  );
  useEffect(() => () => Object.values(textures).forEach((t) => t.dispose()), [textures]);

  const at = (col: number, row: number) => {
    const c = cellCenter(grid, { col, row });
    return [c.x, 0, c.z] as const;
  };
  const last = { col: grid.width - 2, row: grid.depth - 2 };
  const mid = { col: Math.floor(grid.width / 2), row: Math.floor(grid.depth / 2) };
  const corners = [at(1, 1), at(last.col, 1), at(1, last.row), at(last.col, last.row)];
  const sprites = useMemo(() => natureSprites(grid), [grid]);

  return (
    <group>
      {corners.map(([x, , z], i) => (
        <mesh key={i} position={[x, 0.8, z]} castShadow receiveShadow>
          <boxGeometry args={[0.7, 1.6, 0.7]} />
          <meshLambertMaterial map={textures.stone} />
        </mesh>
      ))}
      {[
        [last.col - 4, last.row - 6],
        [last.col - 3, last.row - 6],
        [last.col - 4, last.row - 5],
      ].map(([col, row]) => {
        const [x, , z] = at(col!, row!);
        return (
          <mesh key={`${col}-${row}`} position={[x, 0.3, z]} castShadow receiveShadow>
            <boxGeometry args={[0.6, 0.6, 0.6]} />
            <meshLambertMaterial map={textures.wood} />
          </mesh>
        );
      })}
      <SpriteBatch items={[...sprites, { kind: 'campfire', ...xz(at(mid.col, mid.row)) }]} />
    </group>
  );
}

const xz = ([x, , z]: readonly [number, number, number]) => ({ x, z });

/** Trees and bushes around the edge of the board, clear of the tokens in the middle. */
function natureSprites(grid: GridSpec): SpriteItem[] {
  const random = rng(42);
  const items: SpriteItem[] = [];
  const kinds: SpriteKind[] = ['pine', 'pine', 'oak', 'oak', 'autumn'];
  for (let row = 0; row < grid.depth; row++) {
    for (let col = 0; col < grid.width; col++) {
      const edge = Math.min(col, row, grid.width - 1 - col, grid.depth - 1 - row);
      const chance = edge === 0 ? 0.55 : edge === 1 ? 0.3 : edge === 2 ? 0.08 : 0;
      if (random() >= chance) continue;
      const c = cellCenter(grid, { col, row });
      const jitter = () => (random() - 0.5) * 0.5;
      const kind = random() < 0.25 ? 'bush' : kinds[Math.floor(random() * kinds.length)]!;
      items.push({ kind, x: c.x + jitter(), z: c.z + jitter(), scale: 0.85 + random() * 0.35 });
    }
  }
  // A grove of autumn trees and a few bushes inside the map for depth.
  for (const [col, row] of [
    [4, 22],
    [5, 24],
    [3, 25],
    [26, 5],
    [25, 7],
  ] as const) {
    const c = cellCenter(grid, { col, row });
    items.push({ kind: row > 20 ? 'autumn' : 'pine', x: c.x, z: c.z, scale: 1.1 });
  }
  return items;
}
