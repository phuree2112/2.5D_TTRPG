import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, Color, Matrix4, PlaneGeometry, ShaderMaterial, Vector3 } from 'three';
import type { InstancedMesh } from 'three';
import { useSession } from '../../app/state/session';
import { useSettings } from '../../app/state/settings';
import { useReducedMotion } from '../../app/state/useReducedMotion';
import { cameraActions } from '../camera-actions';
import { flicker, selectLights } from '../core/atmosphere';
import { LIGHT_PRESETS } from '../core/lights';
import type { SceneLight } from '../core/lights';
import { QUALITY_PRESETS } from '../core/quality';
import { POOL_MAX, poolUniforms, setPoolSize } from './light-pool';

// Real lights vs fake lights (Prompt §5 light budget): the N lights nearest the camera focus
// feed the light pool; every light gets a glow sprite, and fake lights also get a warm
// additive floor decal so the pool of light is still there.

const INTENSITY = 14;

function additive(vertex: string): ShaderMaterial {
  return new ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vColor;
      void main() {
        float d = length(vUv - 0.5) * 2.0;
        float a = pow(max(0.0, 1.0 - d), 2.2);
        if (a < 0.01) discard;
        gl_FragColor = vec4(vColor * a, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
    blending: AdditiveBlending,
    transparent: true,
    depthWrite: false,
  });
}

const GLOW_VERTEX = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vColor;
  void main() {
    vUv = uv;
    vColor = instanceColor;
    vec4 mv = modelViewMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    mv.xy += position.xy * length(instanceMatrix[0].xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

const DECAL_VERTEX = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vColor;
  void main() {
    vUv = uv;
    vColor = instanceColor;
    gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  }
`;

export function LightPool({ lights }: { lights: SceneLight[] }) {
  const size = useSession((s) => QUALITY_PRESETS[s.preset].poolLights);
  const ambient = useSettings((s) => s.ambientMotion);
  const reducedMotion = useReducedMotion();
  const animate = ambient && !reducedMotion;

  useLayoutEffect(() => setPoolSize(size), [size]);

  const colors = useMemo(
    () => lights.map((l) => new Color(LIGHT_PRESETS[l.preset].color)),
    [lights],
  );
  const glowGeometry = useMemo(() => new PlaneGeometry(1, 1), []);
  const decalGeometry = useMemo(() => new PlaneGeometry(1, 1).rotateX(-Math.PI / 2), []);
  const glowMaterial = useMemo(() => additive(GLOW_VERTEX), []);
  const decalMaterial = useMemo(() => additive(DECAL_VERTEX), []);
  useEffect(
    () => () => {
      [glowGeometry, decalGeometry, glowMaterial, decalMaterial].forEach((r) => r.dispose());
    },
    [glowGeometry, decalGeometry, glowMaterial, decalMaterial],
  );

  const glows = useRef<InstancedMesh>(null);
  const decals = useRef<InstancedMesh>(null);
  const scratch = useMemo(() => ({ v: new Vector3(), m: new Matrix4(), c: new Color() }), []);

  useFrame(({ camera }) => {
    const { v, m, c } = scratch;
    const real = new Set(
      selectLights(lights, cameraActions.getView().target, Math.min(size, POOL_MAX)),
    );
    const time = poolUniforms.uAmbientTime.value;
    camera.updateMatrixWorld();
    let count = 0;
    lights.forEach((light, index) => {
      const preset = LIGHT_PRESETS[light.preset];
      const f = animate ? flicker(time, index + 1, preset.flicker.amount, preset.flicker.hz) : 1;
      const isReal = real.has(light.id);
      if (isReal) {
        v.set(light.x, light.y, light.z).applyMatrix4(camera.matrixWorldInverse);
        poolUniforms.uPoolPos.value[count]!.set(v.x, v.y, v.z, preset.radius);
        poolUniforms.uPoolColor.value[count]!.set(
          colors[index]!.r,
          colors[index]!.g,
          colors[index]!.b,
        ).multiplyScalar(preset.intensity * INTENSITY * f);
        count++;
      }
      c.copy(colors[index]!).multiplyScalar(1.6 * f);
      glows.current?.setMatrixAt(
        index,
        m.makeScale(0.9 * f, 0.9 * f, 1).setPosition(light.x, light.y, light.z),
      );
      glows.current?.setColorAt(index, c);
      const r = isReal ? 0 : preset.radius * 0.8 * f;
      c.copy(colors[index]!).multiplyScalar(0.55 * preset.intensity);
      decals.current?.setMatrixAt(index, m.makeScale(r, 1, r).setPosition(light.x, 0.03, light.z));
      decals.current?.setColorAt(index, c);
    });
    poolUniforms.uPoolCount.value = count;
    for (const mesh of [glows.current, decals.current]) {
      if (!mesh) continue;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
    const d = window.__DIORAMA_DIAGNOSTICS__;
    if (d) d.lights = { real: count, fake: lights.length - count };
  });

  return (
    <>
      <instancedMesh
        ref={glows}
        args={[glowGeometry, glowMaterial, lights.length]}
        frustumCulled={false}
        renderOrder={5}
      />
      <instancedMesh
        ref={decals}
        args={[decalGeometry, decalMaterial, lights.length]}
        frustumCulled={false}
        renderOrder={2}
      />
    </>
  );
}
