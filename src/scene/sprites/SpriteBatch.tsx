import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { InstancedBufferAttribute, Matrix4, MeshBasicMaterial, PlaneGeometry } from 'three';
import type { InstancedMesh } from 'three';
import { PIXELS_PER_UNIT, SPRITE_LAYER, SPRITES } from '../core/sprite-art';
import type { SpriteKind } from '../core/sprite-art';
import { createBillboardMaterial } from './billboard-material';
import { createBlobTexture, createSpriteArray } from './textures';

export type SpriteItem = { kind: SpriteKind; x: number; z: number; scale?: number };

const WIDTH = SPRITE_LAYER.width / PIXELS_PER_UNIT;
const HEIGHT = SPRITE_LAYER.height / PIXELS_PER_UNIT;

/** Blob shadow diameter per sprite, in world units (Low-quality shadow; Visual.md §4.3). */
const SHADOW: Record<SpriteKind, number> = {
  knight: 0.55,
  ranger: 0.55,
  pine: 1.0,
  oak: 1.25,
  autumn: 1.25,
  bush: 0.75,
  campfire: 0.7,
};

/** All camera-facing pixel sprites in one draw call (Engineering.md §7.3). */
export function SpriteBatch({ items }: { items: SpriteItem[] }) {
  const texture = useMemo(() => createSpriteArray(), []);
  const material = useMemo(() => createBillboardMaterial(texture), [texture]);

  const geometry = useMemo(() => {
    const g = new PlaneGeometry(WIDTH, HEIGHT);
    g.translate(0, HEIGHT / 2, 0); // anchor at the feet
    const layers = new Float32Array(items.map((i) => SPRITES[i.kind].layer));
    const emissive = new Float32Array(items.map((i) => ('emissive' in SPRITES[i.kind] ? 1 : 0)));
    g.setAttribute('aLayer', new InstancedBufferAttribute(layers, 1));
    g.setAttribute('aEmissive', new InstancedBufferAttribute(emissive, 1));
    return g;
  }, [items]);

  const shadowGeometry = useMemo(() => new PlaneGeometry(1, 1).rotateX(-Math.PI / 2), []);
  const shadowMaterial = useMemo(
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
  const shadows = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const matrix = new Matrix4();
    items.forEach((item, i) => {
      const s = item.scale ?? 1; // uniform: the shader rotates before the instance scale
      matrix.makeScale(s, s, s).setPosition(item.x, 0, item.z);
      m.setMatrixAt(i, matrix);
      const d = SHADOW[item.kind] * s;
      shadows.current?.setMatrixAt(
        i,
        matrix.makeScale(d, 1, d * 0.8).setPosition(item.x, 0.01, item.z),
      );
    });
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
    if (shadows.current) {
      shadows.current.instanceMatrix.needsUpdate = true;
      shadows.current.computeBoundingSphere();
    }
  }, [items, geometry]);

  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(
    () => () => {
      material.dispose();
      texture.dispose();
      shadowGeometry.dispose();
      shadowMaterial.alphaMap?.dispose();
      shadowMaterial.dispose();
    },
    [material, texture, shadowGeometry, shadowMaterial],
  );

  return (
    <>
      <instancedMesh ref={mesh} args={[geometry, material, items.length]} />
      <instancedMesh
        ref={shadows}
        args={[shadowGeometry, shadowMaterial, items.length]}
        renderOrder={1}
      />
    </>
  );
}
