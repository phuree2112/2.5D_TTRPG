import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  BackSide,
  Color,
  CylinderGeometry,
  DataTexture,
  NearestFilter,
  RepeatWrapping,
  ShaderMaterial,
  SphereGeometry,
  SRGBColorSpace,
} from 'three';
import type { Mesh } from 'three';
import type { Mood, RGB } from '../core/atmosphere';
import { castleHills, forest, mountains } from '../core/backdrop-art';
import type { PixelImage } from '../core/pixel-art';
import { poolUniforms } from '../lighting/light-pool';
import { cameraActions } from '../camera-actions';

// Skydome with time-of-day gradient, drifting clouds and night stars; three parallax layers
// that move slower than the scene as the camera turns (Prompt §6). All cheap: no textures
// beyond one shared noise map and three small silhouette strips.

const linear = (c: RGB) => new Color().setRGB(c[0], c[1], c[2], SRGBColorSpace);

export function Sky({ mood, center }: { mood: Mood; center: { x: number; z: number } }) {
  const material = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: {
          uZenith: { value: new Color() },
          uHorizon: { value: new Color() },
          uClouds: { value: 0 },
          uStars: { value: 0 },
          uCloudMap: poolUniforms.uCloudMap,
          uCloudOffset: poolUniforms.uCloudOffset,
        },
        vertexShader: /* glsl */ `
          varying vec3 vDir;
          void main() {
            vDir = normalize(position);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 uZenith;
          uniform vec3 uHorizon;
          uniform float uClouds;
          uniform float uStars;
          uniform sampler2D uCloudMap;
          uniform vec2 uCloudOffset;
          varying vec3 vDir;
          float hash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
          void main() {
            vec3 dir = normalize(vDir);
            float h = dir.y;
            vec3 color = mix(uHorizon, uZenith, smoothstep(-0.02, 0.55, h));
            if (h > 0.0) {
              vec2 uv = dir.xz / (h + 0.18) * 0.18 + uCloudOffset * 3.0;
              float c = texture2D(uCloudMap, uv).r;
              c = smoothstep(0.5, 0.8, c) * uClouds * smoothstep(0.0, 0.25, h);
              color = mix(color, mix(uHorizon, vec3(1.0), 0.55), c * 0.75);
              float star = step(0.9965, hash(floor(dir * 420.0))) * uStars * smoothstep(0.08, 0.4, h);
              color += vec3(star) * (1.0 - c);
            } else {
              color = uHorizon * (0.75 + 0.25 * smoothstep(-0.3, 0.0, h));
            }
            gl_FragColor = vec4(color, 1.0);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }
        `,
        side: BackSide,
        depthWrite: false,
        fog: false,
      }),
    [],
  );
  const geometry = useMemo(() => new SphereGeometry(160, 32, 16), []);
  useEffect(() => () => [material, geometry].forEach((r) => r.dispose()), [material, geometry]);

  useEffect(() => {
    (material.uniforms.uZenith!.value as Color).copy(linear(mood.sky.zenith));
    (material.uniforms.uHorizon!.value as Color).copy(linear(mood.sky.horizon));
    material.uniforms.uClouds!.value = mood.sky.clouds;
    material.uniforms.uStars!.value = mood.sky.stars;
  }, [material, mood]);

  return (
    <mesh
      geometry={geometry}
      material={material}
      position={[center.x, 0, center.z]}
      renderOrder={-10}
      frustumCulled={false}
    />
  );
}

function stripTexture(image: PixelImage): DataTexture {
  // Rows bottom-up for WebGL.
  const data = new Uint8Array(image.data.length);
  const row = image.width * 4;
  for (let y = 0; y < image.height; y++)
    data.set(image.data.subarray(y * row, (y + 1) * row), (image.height - 1 - y) * row);
  const texture = new DataTexture(data, image.width, image.height);
  texture.wrapS = RepeatWrapping;
  texture.magFilter = NearestFilter;
  texture.minFilter = NearestFilter;
  texture.needsUpdate = true;
  return texture;
}

const LAYERS = [
  {
    draw: mountains,
    radius: 125,
    height: 38,
    base: -9,
    repeat: 2,
    follow: 0.75,
    fog: 0.62,
    shade: 0.55,
  },
  {
    draw: forest,
    radius: 100,
    height: 16,
    base: -4,
    repeat: 5,
    follow: 0.5,
    fog: 0.42,
    shade: 0.35,
  },
  {
    draw: castleHills,
    radius: 84,
    height: 14,
    base: -3,
    repeat: 1,
    follow: 0.28,
    fog: 0.3,
    shade: 0.28,
  },
] as const;

/** Distant silhouettes, tinted toward the horizon colour by distance. */
export function Parallax({ mood, center }: { mood: Mood; center: { x: number; z: number } }) {
  const layers = useMemo(
    () =>
      LAYERS.map((l) => {
        const material = new ShaderMaterial({
          uniforms: {
            uMap: { value: stripTexture(l.draw()) },
            uTint: { value: new Color() },
            uRepeat: { value: l.repeat },
          },
          vertexShader: /* glsl */ `
            varying vec2 vUv;
            void main() {
              vUv = uv;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `,
          fragmentShader: /* glsl */ `
            uniform sampler2D uMap;
            uniform vec3 uTint;
            uniform float uRepeat;
            varying vec2 vUv;
            void main() {
              vec4 texel = texture2D(uMap, vec2(vUv.x * uRepeat, vUv.y));
              if (texel.a < 0.5) discard;
              gl_FragColor = vec4(uTint * (0.7 + 0.3 * texel.r), 1.0);
              #include <tonemapping_fragment>
              #include <colorspace_fragment>
            }
          `,
          side: BackSide,
          fog: false,
        });
        return {
          ...l,
          material,
          geometry: new CylinderGeometry(l.radius, l.radius, l.height, 96, 1, true),
        };
      }),
    [],
  );
  useEffect(
    () => () =>
      layers.forEach((l) => {
        (l.material.uniforms.uMap!.value as DataTexture).dispose();
        l.material.dispose();
        l.geometry.dispose();
      }),
    [layers],
  );

  // Atmospheric perspective: far layers sit closer to the horizon colour.
  useEffect(() => {
    const horizon = linear(mood.sky.horizon);
    const fog = linear(mood.fog.color);
    layers.forEach((l) => {
      const dark = new Color().setRGB(0.06, 0.09, 0.12).lerp(fog, 0.4);
      (l.material.uniforms.uTint!.value as Color)
        .copy(dark)
        .lerp(horizon, l.fog)
        .multiplyScalar(0.6 + l.shade);
    });
  }, [layers, mood]);

  const refs = useRef<(Mesh | null)[]>([]);
  useFrame(() => {
    const { azimuth } = cameraActions.getView();
    layers.forEach((l, i) => {
      const mesh = refs.current[i];
      if (mesh) mesh.rotation.y = azimuth * l.follow;
    });
  });

  return (
    <>
      {layers.map((l, i) => (
        <mesh
          key={l.radius}
          ref={(m) => {
            refs.current[i] = m;
          }}
          geometry={l.geometry}
          material={l.material}
          position={[center.x, l.base + l.height / 2, center.z]}
          renderOrder={-9 + i}
          frustumCulled={false}
        />
      ))}
    </>
  );
}
