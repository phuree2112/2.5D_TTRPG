import { MeshDepthMaterial, MeshLambertMaterial, RGBADepthPacking, Vector3 } from 'three';
import type { DataArrayTexture } from 'three';
import { poolUniforms, withLightPool } from '../lighting/light-pool';

// Camera-facing pixel sprites (Engineering.md §7.3). The yaw is computed per vertex from the
// same camera uniform used for projection, so sprites never lag or jitter while the camera
// orbits. Mirrors scene/core/billboard.ts (unit-tested).

/** World direction toward the key light; shadow proxies turn to face it (Prompt §5.2). */
export const shadowUniforms = { uLightDir: { value: new Vector3(0.3, 0.8, 0.5).normalize() } };

const ATTRIBUTES = /* glsl */ `
attribute float aLayer;
attribute float aEmissive;
attribute float aSway;
uniform float uSpriteHeight;
varying vec2 vSpriteUv;
varying float vLayer;
varying float vEmissive;
`;

// Vegetation bends with the wind; the top moves most (Prompt §6).
const SWAY = /* glsl */ `
float dtSwayAmount = aSway * uWind * pow(max(position.y, 0.0) / uSpriteHeight, 2.0) * 0.1;
float dtPhase = uAmbientTime * 1.7 + spriteCenter.x * 0.71 + spriteCenter.z * 0.43;
transformed.x += dtSwayAmount * (sin(dtPhase) + 0.35 * sin(dtPhase * 2.3)) * cos(yaw);
transformed.z -= dtSwayAmount * (sin(dtPhase) + 0.35 * sin(dtPhase * 2.3)) * sin(yaw);
`;

export function createBillboardMaterial(
  sprites: DataArrayTexture,
  height: number,
): MeshLambertMaterial {
  const material = new MeshLambertMaterial({ color: 0xffffff });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uSprites = { value: sprites };
    shader.uniforms.uSpriteHeight = { value: height };
    shader.uniforms.uWind = poolUniforms.uWind;
    shader.uniforms.uAmbientTime = poolUniforms.uAmbientTime;

    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
${ATTRIBUTES}
uniform float uWind;
uniform float uAmbientTime;`,
      )
      .replace(
        '#include <beginnormal_vertex>',
        `vec3 spriteCenter = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
vec2 toCamera = cameraPosition.xz - spriteCenter.xz;
float yaw = atan(toCamera.x, toCamera.y);
// One normal per sprite, facing the camera and tilted about 72 degrees up, so a sprite takes
// the light of the ground it stands on even when the sun is behind it.
vec3 objectNormal = normalize(vec3(sin(yaw) * 0.3, 0.954, cos(yaw) * 0.3));`,
      )
      .replace(
        '#include <begin_vertex>',
        `vec3 transformed = vec3(position.x * cos(yaw), position.y, -position.x * sin(yaw));
${SWAY}
vSpriteUv = uv;
vLayer = aLayer;
vEmissive = aEmissive;`,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
uniform highp sampler2DArray uSprites;
varying vec2 vSpriteUv;
varying float vLayer;
varying float vEmissive;`,
      )
      .replace(
        '#include <map_fragment>',
        `vec4 spriteTexel = texture(uSprites, vec3(vSpriteUv, vLayer));
if (spriteTexel.a < 0.5) discard;
diffuseColor *= spriteTexel;`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
// Only bright pixels glow (the flame, not the logs or the torch pole).
float spriteLuma = dot(spriteTexel.rgb, vec3(0.2126, 0.7152, 0.0722));
totalEmissiveRadiance += spriteTexel.rgb * vEmissive * smoothstep(0.25, 0.5, spriteLuma) * 2.0;`,
      );
  };
  material.customProgramCacheKey = () => 'billboard-sprite-v2';
  return withLightPool(material);
}

/** Depth material for sprite shadow proxies: the same quad turned toward the key light. */
export function createSpriteDepthMaterial(sprites: DataArrayTexture): MeshDepthMaterial {
  const material = new MeshDepthMaterial({ depthPacking: RGBADepthPacking });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uSprites = { value: sprites };
    shader.uniforms.uLightDir = shadowUniforms.uLightDir;
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
attribute float aLayer;
uniform vec3 uLightDir;
varying vec2 vDtUv;
varying float vDtLayer;`,
      )
      .replace(
        '#include <begin_vertex>',
        `float lightYaw = atan(uLightDir.x, uLightDir.z);
vec3 transformed = vec3(position.x * cos(lightYaw), position.y, -position.x * sin(lightYaw));
vDtUv = uv;
vDtLayer = aLayer;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
uniform highp sampler2DArray uSprites;
varying vec2 vDtUv;
varying float vDtLayer;`,
      )
      .replace(
        'void main() {',
        `void main() {
  if (texture(uSprites, vec3(vDtUv, vDtLayer)).a < 0.5) discard;`,
      );
  };
  material.customProgramCacheKey = () => 'billboard-sprite-depth-v1';
  return material;
}
