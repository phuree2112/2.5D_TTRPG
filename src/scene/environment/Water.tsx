import { useEffect, useMemo } from 'react';
import { CircleGeometry, MeshLambertMaterial, Vector3 } from 'three';
import { withLightPool } from '../lighting/light-pool';
import { useLitMaterial } from '../lighting/useLitMaterial';

// A small animated pond (Prompt §6: simple water shader). Two scrolling noise samples ripple
// the colour, bright ripples sparkle, and the edge foams. Lit by the light pool and fogged.

export function Pond({ x, z, radius }: { x: number; z: number; radius: number }) {
  const material = useMemo(() => {
    const m = new MeshLambertMaterial({ color: '#3c8fa6', transparent: true, opacity: 0.92 });
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uPond = { value: new Vector3(x, z, radius) };
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform vec3 uPond;')
        .replace(
          '#include <map_fragment>',
          `#include <map_fragment>
float dtWave = 0.5 * (
  texture2D(uCloudMap, vDtWorld.xz * 0.45 + vec2(uAmbientTime * 0.03, uAmbientTime * 0.021)).r +
  texture2D(uCloudMap, vDtWorld.xz * 0.8 - vec2(uAmbientTime * 0.02, -uAmbientTime * 0.015)).r);
diffuseColor.rgb *= 0.8 + 0.45 * dtWave;
float dtEdge = length(vDtWorld.xz - uPond.xy) / uPond.z;
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.82, 0.9, 0.93), smoothstep(0.86, 0.97, dtEdge));`,
        )
        .replace(
          '#include <emissivemap_fragment>',
          `#include <emissivemap_fragment>
totalEmissiveRadiance += vec3(0.75, 0.88, 1.0) * smoothstep(0.74, 0.82, dtWave) * 0.35;`,
        );
    };
    m.customProgramCacheKey = () => 'pond-v1';
    return withLightPool(m);
  }, [x, z, radius]);
  const water = useMemo(() => new CircleGeometry(radius, 48).rotateX(-Math.PI / 2), [radius]);
  const bank = useMemo(() => new CircleGeometry(radius + 0.3, 48).rotateX(-Math.PI / 2), [radius]);
  const soil = useLitMaterial({ color: '#4a3a28' });
  useEffect(
    () => () => [material, water, bank].forEach((r) => r.dispose()),
    [material, water, bank],
  );

  return (
    <>
      <mesh geometry={bank} material={soil} position={[x, 0.004, z]} receiveShadow />
      <mesh geometry={water} material={material} position={[x, 0.012, z]} receiveShadow />
    </>
  );
}
