import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { InstancedBufferAttribute, Matrix4, MeshBasicMaterial, PlaneGeometry } from 'three';
import type { InstancedMesh } from 'three';
import { useSession } from '../../app/state/session';
import { PIXELS_PER_UNIT, SPRITE_LAYER, SPRITES } from '../core/sprite-art';
import type { SpriteKind } from '../core/sprite-art';
import { QUALITY_PRESETS } from '../core/quality';
import { createBillboardMaterial, createSpriteDepthMaterial } from './billboard-material';
import { createBlobTexture, createSpriteArray } from './textures';

export type SpriteItem = { kind: SpriteKind; x: number; z: number; scale?: number };

const WIDTH = SPRITE_LAYER.width / PIXELS_PER_UNIT;
const HEIGHT = SPRITE_LAYER.height / PIXELS_PER_UNIT;
const SHADOW_LAYER = 1;

/** Blob shadow diameter per sprite, in world units (Low quality; Visual.md §4.3). */
const BLOB: Record<SpriteKind, number> = {
  knight: 0.55,
  ranger: 0.55,
  pine: 1.0,
  oak: 1.25,
  autumn: 1.25,
  bush: 0.75,
  campfire: 0.7,
  torch: 0.35,
};

/**
 * All camera-facing pixel sprites in one draw call (Engineering.md §7.3). Shadows: blob decals
 * on Low; on Medium/High, invisible proxies on layer 1 that face the key light, so the shadow
 * keeps the sprite's silhouette whatever the camera does (Prompt §5.2).
 */
export function SpriteBatch({ items }: { items: SpriteItem[] }) {
  const shadowMap = useSession((s) => QUALITY_PRESETS[s.preset].shadowMapSize > 0);
  const get = useThree((s) => s.get);
  const texture = useMemo(() => createSpriteArray(), []);
  const material = useMemo(() => createBillboardMaterial(texture, HEIGHT), [texture]);
  const depthMaterial = useMemo(() => createSpriteDepthMaterial(texture), [texture]);
  const proxyMaterial = useMemo(() => new MeshBasicMaterial({ colorWrite: false }), []);

  const geometry = useMemo(() => {
    const g = new PlaneGeometry(WIDTH, HEIGHT);
    g.translate(0, HEIGHT / 2, 0); // anchor at the feet
    const flag = (key: 'emissive' | 'sway') =>
      new Float32Array(items.map((i) => (key in SPRITES[i.kind] ? 1 : 0)));
    const layers = new Float32Array(items.map((i) => SPRITES[i.kind].layer));
    g.setAttribute('aLayer', new InstancedBufferAttribute(layers, 1));
    g.setAttribute('aEmissive', new InstancedBufferAttribute(flag('emissive'), 1));
    g.setAttribute('aSway', new InstancedBufferAttribute(flag('sway'), 1));
    return g;
  }, [items]);

  const blobGeometry = useMemo(() => new PlaneGeometry(1, 1).rotateX(-Math.PI / 2), []);
  const blobMaterial = useMemo(
    () =>
      new MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.4,
        alphaMap: createBlobTexture(),
        depthWrite: false,
      }),
    [],
  );

  const mesh = useRef<InstancedMesh>(null);
  const proxies = useRef<InstancedMesh>(null);
  const blobs = useRef<InstancedMesh>(null);

  useLayoutEffect(() => {
    const matrix = new Matrix4();
    items.forEach((item, i) => {
      const s = item.scale ?? 1; // uniform: the shader rotates before the instance scale
      matrix.makeScale(s, s, s).setPosition(item.x, 0, item.z);
      mesh.current?.setMatrixAt(i, matrix);
      proxies.current?.setMatrixAt(i, matrix);
      const d = BLOB[item.kind] * s;
      blobs.current?.setMatrixAt(
        i,
        matrix.makeScale(d, 1, d * 0.8).setPosition(item.x, 0.01, item.z),
      );
    });
    for (const m of [mesh.current, proxies.current, blobs.current]) {
      if (!m) continue;
      m.instanceMatrix.needsUpdate = true;
      m.computeBoundingSphere();
    }
    proxies.current?.layers.set(SHADOW_LAYER);
    const { gl, invalidate } = get();
    gl.shadowMap.needsUpdate = true;
    invalidate();
  }, [items, geometry, shadowMap, get]);

  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(
    () => () => {
      [material, depthMaterial, proxyMaterial, blobMaterial].forEach((m) => m.dispose());
      blobMaterial.alphaMap?.dispose();
      texture.dispose();
      blobGeometry.dispose();
    },
    [material, depthMaterial, proxyMaterial, blobMaterial, texture, blobGeometry],
  );

  return (
    <>
      <instancedMesh ref={mesh} args={[geometry, material, items.length]} />
      {shadowMap ? (
        <instancedMesh
          ref={proxies}
          args={[geometry, proxyMaterial, items.length]}
          customDepthMaterial={depthMaterial}
          castShadow
          frustumCulled={false}
        />
      ) : (
        <instancedMesh
          ref={blobs}
          args={[blobGeometry, blobMaterial, items.length]}
          renderOrder={1}
        />
      )}
    </>
  );
}
