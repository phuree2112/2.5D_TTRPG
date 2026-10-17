import {
  DataTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
  RedFormat,
  RepeatWrapping,
  Vector2,
  Vector3,
  Vector4,
} from 'three';
import type { Material, WebGLProgramParametersWithUniforms } from 'three';
import { cloudNoise } from '../core/noise';

// Custom point-light pool (Engineering.md §7.2, D3). three.js lights cannot be masked per level,
// and changing their count recompiles every shader; this pool is a fixed-size uniform array
// with a count, compiled once per preset (DT_POOL). It also adds cloud shadows to the key light.

export const POOL_MAX = 8;

function createCloudTexture(): DataTexture {
  const size = 128;
  const texture = new DataTexture(cloudNoise(size, 11), size, size, RedFormat);
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

export const cloudTexture = createCloudTexture();

/** Shared by every patched material: one update reaches the whole scene. */
export const poolUniforms = {
  /** View-space position (xyz) and radius (w) of each real light. */
  uPoolPos: { value: Array.from({ length: POOL_MAX }, () => new Vector4()) },
  /** Linear colour × intensity. */
  uPoolColor: { value: Array.from({ length: POOL_MAX }, () => new Vector3()) },
  uPoolCount: { value: 0 },
  uCloudMap: { value: cloudTexture },
  uCloudOffset: { value: new Vector2() },
  uCloudScale: { value: 0.03 },
  uCloudStrength: { value: 0 },
  /** Seconds; advances only while ambient motion runs (AmbientTicker). */
  uAmbientTime: { value: 0 },
  uWind: { value: 0.5 },
};

const patched = new Set<Material>();
let poolSize = 4;

/** Change the number of real lights (preset change): recompiles patched materials once. */
export function setPoolSize(size: number) {
  if (size === poolSize) return;
  poolSize = size;
  for (const material of patched) {
    material.defines = { ...material.defines, DT_POOL: size };
    material.needsUpdate = true;
  }
}

const VERTEX_PARS = /* glsl */ `
varying vec3 vDtWorld;
`;

const VERTEX_WORLD = /* glsl */ `
#include <project_vertex>
vec4 dtWorld = vec4(transformed, 1.0);
#ifdef USE_INSTANCING
  dtWorld = instanceMatrix * dtWorld;
#endif
vDtWorld = (modelMatrix * dtWorld).xyz;
`;

const FRAGMENT_PARS = /* glsl */ `
uniform vec4 uPoolPos[${POOL_MAX}];
uniform vec3 uPoolColor[${POOL_MAX}];
uniform int uPoolCount;
uniform sampler2D uCloudMap;
uniform vec2 uCloudOffset;
uniform float uCloudScale;
uniform float uCloudStrength;
uniform float uAmbientTime;
varying vec3 vDtWorld;
`;

const FRAGMENT_LIGHTS = /* glsl */ `
#include <lights_fragment_end>
// Cloud shadows: only the key light is in directDiffuse at this point (Prompt §6).
float dtCloud = texture2D(uCloudMap, vDtWorld.xz * uCloudScale + uCloudOffset).r;
reflectedLight.directDiffuse *= 1.0 - uCloudStrength * smoothstep(0.35, 0.75, dtCloud);
#if DT_POOL > 0
for (int i = 0; i < DT_POOL; i++) {
  if (i >= uPoolCount) break;
  vec3 dtToLight = uPoolPos[i].xyz + vViewPosition;
  float dtDistance = length(dtToLight);
  float dtFalloff = getDistanceAttenuation(dtDistance, uPoolPos[i].w, 2.0);
  // A little wrap, so camera-facing sprites still glow on the side away from the torch.
  float dtFacing = max(dot(normal, dtToLight / max(dtDistance, 1e-4)), 0.0) * 0.7 + 0.3;
  reflectedLight.directDiffuse += uPoolColor[i] * dtFalloff * dtFacing * BRDF_Lambert(diffuseColor.rgb);
}
#endif
`;

export function applyLightPool(shader: WebGLProgramParametersWithUniforms) {
  Object.assign(shader.uniforms, poolUniforms);
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', `#include <common>\n${VERTEX_PARS}`)
    .replace('#include <project_vertex>', VERTEX_WORLD);
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', `#include <common>\n${FRAGMENT_PARS}`)
    .replace('#include <lights_fragment_end>', FRAGMENT_LIGHTS);
}

/**
 * Add the light pool to a Lambert material, after any patch the material already has.
 * Returns the same material.
 */
export function withLightPool<T extends Material>(material: T): T {
  const own = material.onBeforeCompile.bind(material);
  material.defines = { ...material.defines, DT_POOL: poolSize };
  material.onBeforeCompile = (shader, renderer) => {
    own(shader, renderer);
    applyLightPool(shader);
  };
  patched.add(material);
  const dispose = material.dispose.bind(material);
  material.dispose = () => {
    patched.delete(material);
    dispose();
  };
  return material;
}
