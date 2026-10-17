import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { createPortal, useFrame, useThree } from '@react-three/fiber';
import type { RootState } from '@react-three/fiber';
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  InstancedBufferAttribute,
  Matrix4,
  MeshBasicMaterial,
  PlaneGeometry,
  Vector3,
} from 'three';
import type { InstancedMesh, OrthographicCamera, PerspectiveCamera } from 'three';
import { useSettings } from '../../app/state/settings';
import { useTokens } from '../../app/state/tokens';
import type { Faction, Token } from '../../app/state/tokens';
import { useReducedMotion } from '../../app/state/useReducedMotion';
import { createBlobTexture } from '../../scene/sprites/textures';
import { hpView } from '../core/labels';
import {
  easeInOutCubic,
  footprintCenter,
  hpStatus,
  moveDurationMs,
  tokenDiameter,
} from '../core/rules';
import { useTokenDrag } from '../drag-state';
import { getTokenImage } from '../images';
import { createLabelMaterial, drawLabel, LABEL_SIZE, labelUniforms } from './labels';
import { LayeredTexture } from './layered-texture';
import { createTokenDepthMaterial, createTokenMaterial, tokenTime } from './token-material';
import { useSession } from '../../app/state/session';
import { QUALITY_PRESETS } from '../../scene/core/quality';
import { markActive } from '../../scene/activity';
import { overlayScene } from '../../scene/overlay-scene';

const CAPACITY = 128;
const BASE_LIFT = 0.06;

// Faction colours (Okabe & Ito) and ring patterns (Visual.md §3.3).
const FACTION: Record<Faction, { color: string; pattern: number }> = {
  player: { color: '#56b4e9', pattern: 0 },
  enemy: { color: '#d55e00', pattern: 1 },
  ally: { color: '#009e73', pattern: 2 },
  neutral: { color: '#f0e442', pattern: 3 },
};
const HIDDEN = { color: '#cc79a7', pattern: 4 };
// Light backdrop behind the art, tinted by faction, so dark characters stay readable.
const BACKDROP = new Color('#d8d0bf');

type Motion = {
  x: number;
  z: number;
  fromX: number;
  fromZ: number;
  toX: number;
  toZ: number;
  start: number;
  duration: number;
};

function faceGeometry(): BufferGeometry {
  // Circle units: x -0.6..0.6 around the centre line, y -0.1..1.45 (Pop-out headroom).
  const g = new BufferGeometry();
  g.setAttribute(
    'position',
    new BufferAttribute(
      new Float32Array([-0.6, -0.1, 0, 0.6, -0.1, 0, 0.6, 1.45, 0, -0.6, 1.45, 0]),
      3,
    ),
  );
  g.setIndex([0, 1, 2, 0, 2, 3]);
  const n = CAPACITY * 2;
  g.setAttribute('aLayer', new InstancedBufferAttribute(new Float32Array(n), 1));
  g.setAttribute('aMode', new InstancedBufferAttribute(new Float32Array(n), 1));
  g.setAttribute('aRing', new InstancedBufferAttribute(new Float32Array(n * 4), 4));
  g.setAttribute('aFlags', new InstancedBufferAttribute(new Float32Array(n * 4), 4));
  g.setAttribute('aBackdrop', new InstancedBufferAttribute(new Float32Array(n * 3), 3));
  return g;
}

function labelHeight(token: Token, diameter: number): number {
  if (token.displayMode === 'flat') return 0.12 + diameter * 0.35;
  if (token.displayMode === 'popout') return BASE_LIFT + diameter * 1.32 + 0.04;
  return BASE_LIFT + diameter + 0.06;
}

/** Expose tokens and their screen positions for e2e tests (Engineering.md §17). */
function publish(list: Token[], motion: Map<string, Motion>, get: () => RootState) {
  const d = window.__DIORAMA_DIAGNOSTICS__;
  if (!d) return;
  d.tokens = list.map((t) => ({
    id: t.id,
    name: t.name,
    col: t.cell.col,
    row: t.cell.row,
    mode: t.displayMode,
  }));
  d.projectToken = (id: string) => {
    const m = motion.get(id);
    const token = useTokens.getState().tokens[id];
    if (!m || !token) return null;
    const { camera, size, gl } = get();
    const rect = gl.domElement.getBoundingClientRect();
    const height =
      token.displayMode === 'flat' ? 0.02 : BASE_LIFT + tokenDiameter(token.size) * 0.5;
    const p = new Vector3(m.x, height, m.z).project(camera);
    return {
      x: rect.left + ((p.x + 1) / 2) * size.width,
      y: rect.top + ((1 - p.y) / 2) * size.height,
    };
  };
}

export function TokenLayer() {
  const tokens = useTokens((s) => s.tokens);
  const order = useTokens((s) => s.order);
  const selectedId = useTokens((s) => s.selectedId);
  const grid = useSettings((s) => s.grid);
  const hpSetting = useSettings((s) => s.hpVisibility);
  const viewAsPlayer = useSettings((s) => s.viewAsPlayer);
  const reducedMotion = useReducedMotion();
  // Medium/High: silhouette shadows from proxies; Low: soft blob decals (Visual.md §4.3).
  const shadowMap = useSession((s) => QUALITY_PRESETS[s.preset].shadowMapSize > 0);
  const invalidate = useThree((s) => s.invalidate);
  const get = useThree((s) => s.get);

  const images = useMemo(() => new LayeredTexture(256, 256, 32, true), []);
  const labels = useMemo(
    () => new LayeredTexture(LABEL_SIZE.width, LABEL_SIZE.height, 32, false),
    [],
  );
  const faceMaterial = useMemo(() => createTokenMaterial(images), [images]);
  const depthMaterial = useMemo(() => createTokenDepthMaterial(images), [images]);
  const proxyMaterial = useMemo(() => new MeshBasicMaterial({ colorWrite: false }), []);
  const labelMaterial = useMemo(() => createLabelMaterial(labels), [labels]);
  const blobMaterial = useMemo(
    () =>
      new MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.45,
        alphaMap: createBlobTexture(),
        depthWrite: false,
      }),
    [],
  );
  const faces = useMemo(() => faceGeometry(), []);
  const labelGeometry = useMemo(() => {
    const g = new PlaneGeometry(1, 1).translate(0, 0.5, 0);
    g.setAttribute('aLabel', new InstancedBufferAttribute(new Float32Array(CAPACITY), 1));
    return g;
  }, []);
  const blobGeometry = useMemo(() => new PlaneGeometry(1, 1).rotateX(-Math.PI / 2), []);

  const faceMesh = useRef<InstancedMesh>(null);
  const labelMesh = useRef<InstancedMesh>(null);
  const blobMesh = useRef<InstancedMesh>(null);
  const proxyMesh = useRef<InstancedMesh>(null);
  const motion = useRef(new Map<string, Motion>());
  const layout = useRef<{ faces: string[]; bases: string[] }>({ faces: [], bases: [] });
  const labelSignature = useRef(new Map<string, string>());
  const dirty = useRef(true);

  useEffect(
    () => () => {
      [faces, labelGeometry, blobGeometry].forEach((g) => g.dispose());
      [faceMaterial, labelMaterial, blobMaterial, depthMaterial, proxyMaterial].forEach((m) =>
        m.dispose(),
      );
      blobMaterial.alphaMap?.dispose();
      images.dispose();
      labels.dispose();
    },
    [
      faces,
      labelGeometry,
      blobGeometry,
      faceMaterial,
      labelMaterial,
      blobMaterial,
      depthMaterial,
      proxyMaterial,
      images,
      labels,
    ],
  );

  // Rebuild per-instance data when tokens or viewing settings change.
  useLayoutEffect(() => {
    const viewer = viewAsPlayer ? 'player' : 'gm';
    const list = order
      .map((id) => tokens[id])
      .filter((t): t is Token => Boolean(t) && !(viewer === 'player' && t!.hidden));
    const bases = list.filter((t) => t.displayMode !== 'flat');
    layout.current = { faces: list.map((t) => t.id), bases: bases.map((t) => t.id) };

    const attr = (name: string) => faces.getAttribute(name) as InstancedBufferAttribute;
    const [aLayer, aMode, aRing, aFlags, aBackdrop] = [
      'aLayer',
      'aMode',
      'aRing',
      'aFlags',
      'aBackdrop',
    ].map(attr);
    const aLabel = labelGeometry.getAttribute('aLabel') as InstancedBufferAttribute;
    const color = new Color();
    const backdrop = new Color();

    const write = (index: number, token: Token, mode: number) => {
      const ring = token.hidden ? HIDDEN : FACTION[token.faction];
      color.set(ring.color);
      backdrop.copy(BACKDROP).lerp(color, 0.3);
      aLayer!.setX(
        index,
        images.layer(token.imageId, () => getTokenImage(token.imageId)?.rgba),
      );
      aMode!.setX(index, mode);
      aRing!.setXYZW(index, color.r, color.g, color.b, ring.pattern);
      aFlags!.setXYZW(
        index,
        token.id === selectedId ? 1 : 0,
        token.hidden ? 1 : 0,
        hpStatus(token.hp) === 'down' ? 1 : 0,
        0,
      );
      aBackdrop!.setXYZ(index, backdrop.r, backdrop.g, backdrop.b);
    };
    list.forEach((t, i) =>
      write(i, t, t.displayMode === 'flat' ? 0 : t.displayMode === 'standee' ? 1 : 2),
    );
    bases.forEach((t, j) => write(list.length + j, t, 3));
    [aLayer, aMode, aRing, aFlags, aBackdrop].forEach((a) => (a!.needsUpdate = true));

    // Labels: redraw only when what they show changes.
    const seen = new Set<string>();
    list.forEach((t, i) => {
      const view = hpView({ faction: t.faction, viewer, setting: hpSetting });
      // Exact numbers only on the selected token, so a full table stays readable.
      const shown = view === 'numbers' && t.id !== selectedId ? 'bar' : view;
      const signature = `${t.name}|${t.hp.current}/${t.hp.max}/${t.hp.temp}|${shown}`;
      const changed = labelSignature.current.get(t.id) !== signature;
      labelSignature.current.set(t.id, signature);
      aLabel.setX(
        i,
        labels.layer(t.id, () => drawLabel(t, shown), changed),
      );
      seen.add(t.id);
    });
    for (const id of [...labelSignature.current.keys()]) {
      if (!seen.has(id)) {
        labelSignature.current.delete(id);
        labels.release(id);
        motion.current.delete(id);
      }
    }
    aLabel.needsUpdate = true;

    // Start a move animation when a token's cell changed (Visual.md §8.2).
    const now = performance.now();
    for (const t of list) {
      const to = footprintCenter(grid, t.cell, t.size);
      const m = motion.current.get(t.id);
      if (!m) {
        motion.current.set(t.id, {
          x: to.x,
          z: to.z,
          fromX: to.x,
          fromZ: to.z,
          toX: to.x,
          toZ: to.z,
          start: now,
          duration: 0,
        });
      } else if (m.toX !== to.x || m.toZ !== to.z) {
        const drag = useTokenDrag.getState().drag;
        const fromX = drag?.tokenId === t.id ? drag.x : m.x;
        const fromZ = drag?.tokenId === t.id ? drag.z : m.z;
        const distance = Math.hypot(to.x - fromX, to.z - fromZ);
        Object.assign(m, {
          fromX,
          fromZ,
          toX: to.x,
          toZ: to.z,
          start: now,
          duration: reducedMotion ? 0 : moveDurationMs(distance),
        });
      }
    }

    if (faceMesh.current) faceMesh.current.count = list.length + bases.length;
    if (labelMesh.current) labelMesh.current.count = list.length;
    if (blobMesh.current) blobMesh.current.count = list.length;
    if (proxyMesh.current && faceMesh.current) {
      // Proxies share the face instances; they render only in the shadow pass (layer 1).
      proxyMesh.current.instanceMatrix = faceMesh.current.instanceMatrix;
      proxyMesh.current.count = faceMesh.current.count;
      proxyMesh.current.layers.set(1);
    }
    dirty.current = true;
    publish(list, motion.current, get);
    invalidate();
  }, [
    tokens,
    order,
    selectedId,
    grid,
    hpSetting,
    viewAsPlayer,
    reducedMotion,
    faces,
    labelGeometry,
    images,
    labels,
    invalidate,
    get,
    shadowMap,
  ]);

  // Redraw labels once the web fonts have loaded (first draws may use a fallback font).
  useEffect(() => {
    void document.fonts.ready.then(() => {
      labelSignature.current.clear();
      useTokens.setState((s) => ({ tokens: { ...s.tokens } }));
    });
  }, []);

  const matrix = useMemo(() => new Matrix4(), []);
  useFrame((state) => {
    const now = performance.now();
    let moving = false;
    for (const m of motion.current.values()) {
      if (m.duration <= 0 || now >= m.start + m.duration) {
        m.x = m.toX;
        m.z = m.toZ;
        continue;
      }
      const t = easeInOutCubic((now - m.start) / m.duration);
      m.x = m.fromX + (m.toX - m.fromX) * t;
      m.z = m.fromZ + (m.toZ - m.fromZ) * t;
      moving = true;
    }
    const drag = useTokenDrag.getState().drag;

    // Constant-size labels need world units per pixel for the current camera.
    const camera = state.camera;
    if ((camera as PerspectiveCamera).isPerspectiveCamera) {
      const fov = ((camera as PerspectiveCamera).fov * Math.PI) / 180;
      labelUniforms.uPixelWorld.value = (2 * Math.tan(fov / 2)) / state.size.height;
      labelUniforms.uOrtho.value = 0;
    } else {
      labelUniforms.uPixelWorld.value = 1 / (camera as OrthographicCamera).zoom;
      labelUniforms.uOrtho.value = 1;
    }
    tokenTime.value = state.clock.elapsedTime;

    if (moving || drag || dirty.current) {
      dirty.current = false;
      const { faces: faceIds, bases } = layout.current;
      const tokensNow = useTokens.getState().tokens;
      const place = (id: string) => {
        const m = motion.current.get(id);
        const lifted = drag?.tokenId === id;
        return {
          x: lifted ? drag.x : (m?.x ?? 0),
          z: lifted ? drag.z : (m?.z ?? 0),
          y: lifted ? 0.12 : 0,
        };
      };
      faceIds.forEach((id, i) => {
        const token = tokensNow[id];
        if (!token) return;
        const p = place(id);
        const d = tokenDiameter(token.size);
        faceMesh.current?.setMatrixAt(i, matrix.makeScale(d, d, d).setPosition(p.x, p.y, p.z));
        labelMesh.current?.setMatrixAt(
          i,
          matrix.makeScale(1, 1, 1).setPosition(p.x, p.y + labelHeight(token, d), p.z),
        );
        blobMesh.current?.setMatrixAt(
          i,
          matrix.makeScale(d * 0.95, 1, d * 0.95).setPosition(p.x, 0.011, p.z),
        );
      });
      bases.forEach((id, j) => {
        const token = tokensNow[id];
        if (!token) return;
        const p = place(id);
        const d = tokenDiameter(token.size);
        faceMesh.current?.setMatrixAt(
          faceIds.length + j,
          matrix.makeScale(d, d, d).setPosition(p.x, p.y, p.z),
        );
      });
      for (const mesh of [faceMesh.current, labelMesh.current, blobMesh.current]) {
        if (mesh) mesh.instanceMatrix.needsUpdate = true;
      }
      state.gl.shadowMap.needsUpdate = true;
    }
    if (moving || drag) markActive();
    if (moving) invalidate();
  });

  return (
    <>
      <instancedMesh
        ref={faceMesh}
        args={[faces, faceMaterial, CAPACITY * 2]}
        frustumCulled={false}
      />
      {shadowMap ? (
        <instancedMesh
          ref={proxyMesh}
          args={[faces, proxyMaterial, CAPACITY * 2]}
          customDepthMaterial={depthMaterial}
          castShadow
          frustumCulled={false}
        />
      ) : (
        <instancedMesh
          ref={blobMesh}
          args={[blobGeometry, blobMaterial, CAPACITY]}
          frustumCulled={false}
          renderOrder={1}
        />
      )}
      {createPortal(
        <instancedMesh
          ref={labelMesh}
          args={[labelGeometry, labelMaterial, CAPACITY]}
          frustumCulled={false}
        />,
        overlayScene,
      )}
    </>
  );
}
