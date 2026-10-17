import { useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { Color } from 'three';
import { cellCenter, gridExtent, gridLineSegments } from '../core/grid';
import type { GridSpec } from '../core/grid';
import type { SceneLight } from '../core/lights';
import { QUALITY_PRESETS } from '../core/quality';
import { grassTexture, rng, stoneTexture, woodTexture } from '../core/sprite-art';
import type { SpriteKind } from '../core/sprite-art';
import { LightPool } from '../lighting/LightPool';
import { useLitMaterial } from '../lighting/useLitMaterial';
import { SpriteBatch } from '../sprites/SpriteBatch';
import type { SpriteItem } from '../sprites/SpriteBatch';
import { createTileTexture } from '../sprites/textures';
import { useSession } from '../../app/state/session';
import { useSettings } from '../../app/state/settings';
import { Atmosphere } from './Atmosphere';
import { AmbientParticles, Weather } from './Particles';
import { Pond } from './Water';
import { useMood } from './useMood';

// Demo diorama: a raised pixel-grass board in open country, with nature and torch sprites,
// stone pillars, crates and a pond. Terrain painting and the prop library arrive in Phase 5.

const BOARD_THICKNESS = 0.4;
const POND = { col: 5.5, row: 6.5, radius: 2 };

type Place = { col: number; row: number };

function layout(grid: GridSpec) {
  const at = ({ col, row }: Place) =>
    cellCenter(grid, { col: Math.round(col), row: Math.round(row) });
  const last = { col: grid.width - 2, row: grid.depth - 2 };
  const mid = { col: Math.floor(grid.width / 2), row: Math.floor(grid.depth / 2) };
  const pillars = [
    { col: 1, row: 1 },
    { col: last.col, row: 1 },
    { col: 1, row: last.row },
    { col: last.col, row: last.row },
  ].map(at);
  const center = at(mid);
  // Torches stand beside each pillar, toward the middle of the board.
  const torches = pillars.map((p) => {
    const dx = Math.sign(center.x - p.x);
    const dz = Math.sign(center.z - p.z);
    return { x: p.x + dx * 0.75, z: p.z + dz * 0.75 };
  });
  const crates = [
    { col: last.col - 4, row: last.row - 6 },
    { col: last.col - 3, row: last.row - 6 },
    { col: last.col - 4, row: last.row - 5 },
  ].map(at);
  const lantern = at({ col: last.col - 5, row: last.row - 7 });
  const magic = at({ col: 4, row: 14 });
  const pond = { x: POND.col, z: POND.row * (grid.type === 'hex' ? 0.866 : 1) };

  const lights: SceneLight[] = [
    { id: 'campfire', preset: 'campfire', x: center.x, y: 0.45, z: center.z },
    ...torches.map((t, i) => ({
      id: `torch-${i}`,
      preset: 'torch' as const,
      x: t.x,
      y: 1.0,
      z: t.z,
    })),
    { id: 'lantern', preset: 'lantern', x: lantern.x, y: 0.95, z: lantern.z },
    { id: 'magic', preset: 'magic', x: magic.x, y: 1.3, z: magic.z },
  ];
  return { pillars, torches, crates, lantern, center, pond, lights };
}

export function DemoTable() {
  const grid = useSettings((s) => s.grid);
  const shadowMapSize = useSession((s) => QUALITY_PRESETS[s.preset].shadowMapSize);
  const extent = gridExtent(grid);
  const center = { x: extent.width / 2, z: extent.depth / 2 };
  const scene = useMemo(() => layout(grid), [grid]);

  // Shadow maps render only when something that casts shadows changes (Engineering.md §7.4).
  const get = useThree((s) => s.get);
  useEffect(() => {
    const { gl, invalidate } = get();
    gl.shadowMap.needsUpdate = true;
    invalidate();
  }, [get, grid, shadowMapSize]);

  const soil = useLitMaterial({ color: '#4a3a28' });

  return (
    <>
      <Atmosphere center={center} reach={Math.max(extent.width, extent.depth)} />
      <LightPool lights={scene.lights} />
      <Countryside x={center.x} z={center.z} />

      {/* Board: soil sides, pixel grass on top */}
      <mesh
        position={[center.x, -BOARD_THICKNESS / 2 - 0.001, center.z]}
        material={soil}
        receiveShadow
        castShadow
      >
        <boxGeometry args={[extent.width + 0.6, BOARD_THICKNESS, extent.depth + 0.6]} />
      </mesh>
      <Grass width={extent.width + 0.6} depth={extent.depth + 0.6} x={center.x} z={center.z} />

      <GridLines grid={grid} />
      <Pond x={scene.pond.x} z={scene.pond.z} radius={POND.radius} />
      <Landmarks grid={grid} scene={scene} />
      <AmbientParticles extent={extent} campfire={scene.center} />
      <Weather />
    </>
  );
}

/** Open land around the board, so the diorama sits in a world that fades into fog. */
function Countryside({ x, z }: { x: number; z: number }) {
  const texture = useMemo(() => createTileTexture(grassTexture(), 40, 40), []);
  useEffect(() => () => texture.dispose(), [texture]);
  const material = useLitMaterial({ color: '#8c9a78', map: texture });
  return (
    <mesh
      rotation-x={-Math.PI / 2}
      position={[x, -BOARD_THICKNESS, z]}
      material={material}
      receiveShadow
    >
      <circleGeometry args={[150, 64]} />
    </mesh>
  );
}

function Grass({ width, depth, x, z }: { width: number; depth: number; x: number; z: number }) {
  // The grass tile covers 4 × 4 cells (24 px per cell, matching the sprites).
  const texture = useMemo(
    () => createTileTexture(grassTexture(), width / 4, depth / 4),
    [width, depth],
  );
  useEffect(() => () => texture.dispose(), [texture]);
  const material = useLitMaterial({ map: texture });
  return (
    <mesh rotation-x={-Math.PI / 2} position={[x, 0, z]} material={material} receiveShadow>
      <planeGeometry args={[width, depth]} />
    </mesh>
  );
}

const GRID_COLOR = new Color('#eee8dc');

function GridLines({ grid }: { grid: GridSpec }) {
  // The lines are unlit, so they would glow at night: scale them with the mood's light.
  const mood = useMood();
  const level = Math.min(
    1,
    Math.max(0.3, (mood.key.intensity / 2.8) * 0.7 + (mood.hemi.intensity / 1.4) * 0.3),
  );
  const color = useMemo(() => GRID_COLOR.clone().multiplyScalar(level), [level]);
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
      <lineBasicMaterial color={color} transparent opacity={0.13} depthWrite={false} />
    </lineSegments>
  );
}

// Nature, torches and the campfire as camera-facing pixel sprites; stone and wood stay 3D with
// pixel textures. That mix is what reads as HD-2D (Visual.md §2.1).
function Landmarks({ grid, scene }: { grid: GridSpec; scene: ReturnType<typeof layout> }) {
  const textures = useMemo(
    () => ({
      stone: createTileTexture(stoneTexture(), 1, 2),
      wood: createTileTexture(woodTexture()),
    }),
    [],
  );
  useEffect(() => () => Object.values(textures).forEach((t) => t.dispose()), [textures]);
  const stone = useLitMaterial({ map: textures.stone });
  const wood = useLitMaterial({ map: textures.wood });

  const sprites = useMemo(
    () => [
      ...natureSprites(grid, scene.pond),
      { kind: 'campfire' as const, ...scene.center },
      ...scene.torches.map((t) => ({ kind: 'torch' as const, ...t })),
      { kind: 'torch' as const, ...scene.lantern },
    ],
    [grid, scene],
  );

  return (
    <group>
      {scene.pillars.map((p, i) => (
        <mesh key={i} position={[p.x, 0.8, p.z]} material={stone} castShadow receiveShadow>
          <boxGeometry args={[0.7, 1.6, 0.7]} />
        </mesh>
      ))}
      {scene.crates.map((c) => (
        <mesh
          key={`${c.x}-${c.z}`}
          position={[c.x, 0.3, c.z]}
          material={wood}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[0.6, 0.6, 0.6]} />
        </mesh>
      ))}
      <SpriteBatch items={sprites} />
    </group>
  );
}

/** Trees and bushes around the edge of the board, clear of the tokens and the pond. */
function natureSprites(grid: GridSpec, pond: { x: number; z: number }): SpriteItem[] {
  const random = rng(42);
  const items: SpriteItem[] = [];
  const kinds: SpriteKind[] = ['pine', 'pine', 'oak', 'oak', 'autumn'];
  const clear = (x: number, z: number) => Math.hypot(x - pond.x, z - pond.z) > POND.radius + 0.8;
  for (let row = 0; row < grid.depth; row++) {
    for (let col = 0; col < grid.width; col++) {
      const edge = Math.min(col, row, grid.width - 1 - col, grid.depth - 1 - row);
      const chance = edge === 0 ? 0.55 : edge === 1 ? 0.3 : edge === 2 ? 0.08 : 0;
      if (random() >= chance) continue;
      const c = cellCenter(grid, { col, row });
      const jitter = () => (random() - 0.5) * 0.5;
      const kind = random() < 0.25 ? 'bush' : kinds[Math.floor(random() * kinds.length)]!;
      const item = { kind, x: c.x + jitter(), z: c.z + jitter(), scale: 0.85 + random() * 0.35 };
      if (clear(item.x, item.z)) items.push(item);
    }
  }
  // A grove of autumn trees and a few pines inside the map for depth.
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
  // Reeds by the pond.
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.4;
    items.push({
      kind: 'bush',
      x: pond.x + Math.cos(a) * (POND.radius + 0.35),
      z: pond.z + Math.sin(a) * (POND.radius + 0.35),
      scale: 0.6,
    });
  }
  return items;
}
