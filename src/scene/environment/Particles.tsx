import { useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  ShaderMaterial,
  Vector3,
} from 'three';
import { useEnvironment } from '../../app/state/environment';
import { useSession } from '../../app/state/session';
import { rng } from '../core/sprite-art';
import { QUALITY_PRESETS } from '../core/quality';
import { poolUniforms } from '../lighting/light-pool';
import { cameraActions } from '../camera-actions';
import { useMood } from './useMood';
import { useFrame } from '@react-three/fiber';

// Instanced points, all motion in the vertex shader (no per-frame CPU work; Prompt §5.8, §6):
// dust motes by day, fireflies at night, embers over the campfire, and camera-attached rain or
// snow. Counts follow the quality preset.

const WEATHER_COUNT = { low: 300, medium: 1000, high: 2000 } as const;
/** Fireflies are sparse: this share of the dust motes (Visual.md §4.1). */
const FIREFLY_SHARE = 0.12;
const BOX = new Vector3(26, 14, 26);

function points(count: number, seed: number, place: (r: () => number) => [number, number, number]) {
  const random = rng(seed);
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    positions.set(place(random), i * 3);
    seeds[i] = random();
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(positions, 3));
  g.setAttribute('aSeed', new BufferAttribute(seeds, 1));
  return g;
}

function material(vertex: string, fragment: string, extra: Record<string, { value: unknown }>) {
  return new ShaderMaterial({
    uniforms: { uAmbientTime: poolUniforms.uAmbientTime, uPixelRatio: { value: 1 }, ...extra },
    vertexShader: vertex,
    fragmentShader: fragment,
    blending: AdditiveBlending,
    transparent: true,
    depthWrite: false,
  });
}

const SOFT_DOT = /* glsl */ `
  uniform vec3 uColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    float a = smoothstep(1.0, 0.2, d) * vAlpha;
    if (a < 0.01) discard;
    gl_FragColor = vec4(uColor * a, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export function AmbientParticles({
  extent,
  campfire,
}: {
  extent: { width: number; depth: number };
  campfire: { x: number; z: number };
}) {
  const mood = useMood();
  const count = useSession((s) => QUALITY_PRESETS[s.preset].particles);
  const dpr = useThree((s) => s.viewport.dpr);
  const fireflies = mood.particles === 'fireflies';

  const motes = useMemo(
    () => points(count, 5, (r) => [r() * extent.width, 0.2 + r() * 2.6, r() * extent.depth]),
    [count, extent.width, extent.depth],
  );
  const embers = useMemo(
    () =>
      points(Math.max(20, Math.round(count / 8)), 9, (r) => [
        campfire.x + (r() - 0.5) * 0.5,
        0,
        campfire.z + (r() - 0.5) * 0.5,
      ]),
    [count, campfire.x, campfire.z],
  );
  const moteMaterial = useMemo(
    () =>
      material(
        /* glsl */ `
          uniform float uAmbientTime;
          uniform float uPixelRatio;
          uniform float uFireflies;
          attribute float aSeed;
          varying float vAlpha;
          void main() {
            vec3 p = position;
            float t = uAmbientTime;
            p.x += sin(t * 0.3 + aSeed * 6.28) * 0.5;
            p.y += sin(t * 0.5 + aSeed * 12.0) * 0.3;
            p.z += cos(t * 0.27 + aSeed * 9.0) * 0.5;
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            gl_PointSize = (uFireflies > 0.5 ? 4.5 : 3.5) * uPixelRatio * (30.0 / -mv.z);
            // Fireflies glow in short pulses, each on its own beat.
            float blink = 0.5 + 0.5 * sin(t * (1.4 + aSeed) + aSeed * 40.0);
            vAlpha = uFireflies > 0.5 ? pow(blink, 4.0) : 0.35;
            gl_Position = projectionMatrix * mv;
          }
        `,
        SOFT_DOT,
        { uColor: { value: new Color() }, uFireflies: { value: 0 } },
      ),
    [],
  );
  const emberMaterial = useMemo(
    () =>
      material(
        /* glsl */ `
          uniform float uAmbientTime;
          uniform float uPixelRatio;
          attribute float aSeed;
          varying float vAlpha;
          void main() {
            float rise = mod(aSeed * 2.5 + uAmbientTime * (0.5 + aSeed * 0.4), 2.5);
            vec3 p = position + vec3(sin(uAmbientTime * 1.3 + aSeed * 20.0) * 0.15 * rise, 0.25 + rise, cos(uAmbientTime + aSeed * 11.0) * 0.15 * rise);
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            gl_PointSize = 4.0 * uPixelRatio * (30.0 / -mv.z);
            vAlpha = 1.0 - rise / 2.5;
            gl_Position = projectionMatrix * mv;
          }
        `,
        SOFT_DOT,
        { uColor: { value: new Color('#ffb34d').multiplyScalar(2.2) } },
      ),
    [],
  );
  useEffect(() => () => [motes, embers].forEach((g) => g.dispose()), [motes, embers]);
  useEffect(
    () => () => [moteMaterial, emberMaterial].forEach((m) => m.dispose()),
    [moteMaterial, emberMaterial],
  );

  useEffect(() => {
    moteMaterial.uniforms.uFireflies!.value = fireflies ? 1 : 0;
    (moteMaterial.uniforms.uColor!.value as Color)
      .set(fireflies ? '#d8f27a' : '#fff3d6')
      .multiplyScalar(fireflies ? 1.8 : 0.9);
    motes.setDrawRange(0, fireflies ? Math.ceil(count * FIREFLY_SHARE) : count);
    for (const m of [moteMaterial, emberMaterial]) m.uniforms.uPixelRatio!.value = dpr;
  }, [fireflies, dpr, count, motes, moteMaterial, emberMaterial]);

  return (
    <>
      <points geometry={motes} material={moteMaterial} frustumCulled={false} renderOrder={6} />
      <points geometry={embers} material={emberMaterial} frustumCulled={false} renderOrder={6} />
    </>
  );
}

/** Rain or snow in a box that follows the camera focus (camera-attached, not map-wide). */
export function Weather() {
  const weather = useEnvironment((s) => s.weather);
  const preset = useSession((s) => s.preset);
  const dpr = useThree((s) => s.viewport.dpr);
  const falling = weather === 'rain' || weather === 'snow';
  const count = WEATHER_COUNT[preset];

  const geometry = useMemo(
    () => points(count, 13, (r) => [(r() - 0.5) * BOX.x, r() * BOX.y, (r() - 0.5) * BOX.z]),
    [count],
  );
  const shader = useMemo(
    () =>
      material(
        /* glsl */ `
          uniform float uAmbientTime;
          uniform float uPixelRatio;
          uniform float uSnow;
          uniform float uWind;
          uniform vec3 uCenter;
          uniform vec3 uBox;
          attribute float aSeed;
          varying float vAlpha;
          void main() {
            float speed = uSnow > 0.5 ? 0.9 : 9.0;
            vec3 p = position;
            p.y = mod(p.y - uAmbientTime * speed * (0.8 + aSeed * 0.4), uBox.y) - 2.0;
            p.x = mod(p.x + uBox.x * 0.5 + uAmbientTime * uWind * (uSnow > 0.5 ? 0.6 : 2.0), uBox.x) - uBox.x * 0.5;
            if (uSnow > 0.5) p.x += sin(uAmbientTime + aSeed * 30.0) * 0.4;
            vec4 mv = modelViewMatrix * vec4(p + uCenter, 1.0);
            gl_PointSize = (uSnow > 0.5 ? 6.0 : 10.0) * uPixelRatio * (30.0 / -mv.z);
            vAlpha = uSnow > 0.5 ? 0.85 : 0.45;
            gl_Position = projectionMatrix * mv;
          }
        `,
        /* glsl */ `
          uniform vec3 uColor;
          uniform float uSnow;
          varying float vAlpha;
          void main() {
            vec2 c = gl_PointCoord - 0.5;
            float a = uSnow > 0.5 ? smoothstep(0.5, 0.15, length(c)) : step(abs(c.x), 0.06) * (1.0 - abs(c.y) * 1.6);
            a *= vAlpha;
            if (a < 0.01) discard;
            gl_FragColor = vec4(uColor * a, 1.0);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }
        `,
        {
          uColor: { value: new Color() },
          uSnow: { value: 0 },
          uWind: poolUniforms.uWind,
          uCenter: { value: new Vector3() },
          uBox: { value: BOX },
        },
      ),
    [],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => shader.dispose(), [shader]);

  useEffect(() => {
    shader.uniforms.uSnow!.value = weather === 'snow' ? 1 : 0;
    (shader.uniforms.uColor!.value as Color).set(weather === 'snow' ? '#ffffff' : '#aac4d8');
    shader.uniforms.uPixelRatio!.value = dpr;
  }, [weather, dpr, shader]);

  useFrame(() => {
    const { target } = cameraActions.getView();
    (shader.uniforms.uCenter!.value as Vector3).set(target.x, 0, target.z);
  });

  if (!falling) return null;
  return <points geometry={geometry} material={shader} frustumCulled={false} renderOrder={7} />;
}
